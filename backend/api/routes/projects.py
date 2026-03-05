"""Project API routes."""

import asyncio
import io
import json
import zipfile
from typing import List

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import StreamingResponse

from models.schemas import ProjectCreate, ProjectModify, ProjectResponse, ProjectStatus
from services.preview_service import PreviewService
from services.project_service import ProjectService
from services.workflow_service import WorkflowService
from utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()
project_service = ProjectService()
workflow_service = WorkflowService()
preview_service = PreviewService()


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate):
    """Create a new project."""
    try:
        project_id = project_service.create_project(
            name=project.name,
            description=project.description,
            requirements=project.requirements,
        )

        db_project = project_service.get_project(project_id)
        if not db_project:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created project",
            )

        return ProjectResponse(
            id=db_project.id,
            name=db_project.name,
            description=db_project.description,
            requirements=db_project.requirements,
            status=db_project.status,
            current_phase=db_project.current_phase,
            created_at=db_project.created_at,
            updated_at=db_project.updated_at,
        )
    except Exception as e:
        import traceback
        logger.error("Failed to create project", error=str(e), traceback=traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Get project by ID."""
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        requirements=project.requirements,
        status=project.status,
        current_phase=project.current_phase,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


async def _run_workflow_background(project_id: str):
    """Background task to run workflow. Exceptions are logged but not raised."""
    try:
        await workflow_service.execute_workflow(project_id)
    except Exception as e:
        logger.error(
            "Background workflow failed",
            error=str(e),
            project_id=project_id,
        )


@router.post("/projects/{project_id}/modify", status_code=status.HTTP_202_ACCEPTED)
async def modify_project(project_id: str, background_tasks: BackgroundTasks, body: ProjectModify):
    """Apply user modification request to existing code. Runs coding agent in place.

    Returns 202 Accepted; connect to /events for real-time updates.
    """
    message = (body.message or "").strip()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing or empty 'message' in request body",
        )

    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )

    async def _run_modification():
        try:
            await workflow_service.execute_modification(project_id, message)
        except ValueError as e:
            logger.warning("Modification rejected", error=str(e), project_id=project_id)
            workflow_service._broadcast_event(project_id, {
                "event": "workflow_error",
                "message": str(e),
                "project_id": project_id,
            })
        except Exception as e:
            logger.error("Modification failed", error=str(e), project_id=project_id)
            workflow_service._broadcast_event(project_id, {
                "event": "workflow_error",
                "message": str(e),
                "project_id": project_id,
            })

    background_tasks.add_task(_run_modification)

    return {
        "project_id": project_id,
        "status": "accepted",
        "message": "Modification started. Connect to /events for updates.",
    }


@router.post("/projects/{project_id}/execute", status_code=status.HTTP_202_ACCEPTED)
async def execute_project(project_id: str, background_tasks: BackgroundTasks):
    """Execute workflow for a project (fire-and-forget).

    Returns immediately with 202 Accepted. The workflow runs in the
    background; poll /status or connect to /events for real-time updates.
    """
    # Verify project exists first
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )

    # Launch workflow in background
    background_tasks.add_task(_run_workflow_background, project_id)

    return {
        "project_id": project_id,
        "status": "accepted",
        "message": "Workflow execution started. Poll /status or connect to /events for updates.",
    }


@router.get("/projects/{project_id}/events")
async def project_events(project_id: str):
    """SSE endpoint for real-time workflow events.

    Clients connect via EventSource to receive agent_start, agent_complete,
    step_complete, workflow_complete, and workflow_error events.
    """
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )

    queue = workflow_service.subscribe_events(project_id)

    async def event_generator():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    # Send keepalive comment to prevent connection timeout
                    yield ": keepalive\n\n"
                    continue

                event_type = event.get("event", "message")
                data = json.dumps(event)
                yield f"event: {event_type}\ndata: {data}\n\n"

                # Stop streaming after terminal events
                if event_type in ("workflow_complete", "workflow_error"):
                    break
        finally:
            workflow_service.unsubscribe_events(project_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/projects/{project_id}/stream")
async def stream_project(project_id: str):
    """Stream workflow execution for a project (legacy endpoint)."""
    try:
        async def generate():
            async for state_update in workflow_service.stream_workflow(project_id):
                yield f"data: {json.dumps(state_update)}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error("Failed to stream workflow", error=str(e), project_id=project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/projects/{project_id}/status", response_model=ProjectStatus)
async def get_project_status(project_id: str):
    """Get project status."""
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )

    state_data = project.state_data or {}
    code_artifacts = state_data.get("code_artifacts", [])
    test_artifacts = state_data.get("test_artifacts", [])
    doc_artifacts = state_data.get("documentation_artifacts", [])

    # Calculate progress based on phase
    phase_progress = {
        "initialization": 0,
        "requirement_analysis": 12.5,
        "architecture_design": 25,
        "coding": 37.5,
        "debugging": 50,
        "testing": 62.5,
        "documentation": 75,
        "deployment": 87.5,
        "completed": 100,
        "failed": 0,
    }

    progress = phase_progress.get(project.current_phase, 0)

    return ProjectStatus(
        project_id=project.id,
        status=project.status,
        current_phase=project.current_phase,
        current_agent=state_data.get("current_agent"),
        progress=progress,
        artifacts_count={
            "code": len(code_artifacts),
            "tests": len(test_artifacts),
            "documentation": len(doc_artifacts),
        },
        errors=state_data.get("errors", []),
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.post("/projects/{project_id}/preview/start")
async def start_preview(project_id: str):
    """Start full application preview. Serves generated code as a runnable app."""
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )
    try:
        info = preview_service.start_preview(project_id)
        # Return path for static (same-origin) or full URL for Python/Node (different port)
        url = info["url"]
        if url.startswith("http"):
            from urllib.parse import urlparse
            parsed = urlparse(url)
            path = parsed.path or ""
            # Only convert to path when it's our /preview/ route; keep full URL for Python/Node
            if path.startswith("/preview/"):
                url = path
            # else: keep full URL (e.g. http://localhost:9001 for Python app)
        return {**info, "url": url}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/projects/{project_id}/preview/stop")
async def stop_preview(project_id: str):
    """Stop full application preview."""
    stopped = preview_service.stop_preview(project_id)
    return {"project_id": project_id, "stopped": stopped}


@router.get("/projects/{project_id}/preview")
async def get_preview_status(project_id: str):
    """Get current preview status and URL."""
    info = preview_service.get_preview_info(project_id)
    if not info:
        return {"status": "stopped", "project_id": project_id}
    url = info["url"]
    if url.startswith("http"):
        from urllib.parse import urlparse
        parsed = urlparse(url)
        path = parsed.path or ""
        if path.startswith("/preview/"):
            url = path
    return {**info, "url": url}


@router.get("/projects")
async def list_projects():
    """List all projects, sorted by most recently updated."""
    projects = project_service.list_projects()
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "requirements": p.requirements,
            "status": p.status,
            "current_phase": p.current_phase,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in projects
    ]


@router.put("/projects/{project_id}/messages")
async def save_messages(project_id: str, body: dict):
    """Persist chat messages for a project."""
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    messages = body.get("messages", [])
    project_service.save_chat_messages(project_id, messages)
    return {"status": "ok"}


@router.get("/projects/{project_id}/messages")
async def get_messages(project_id: str):
    """Retrieve persisted chat messages for a project."""
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    messages = project_service.get_chat_messages(project_id)
    return {"messages": messages}


def _generate_readme(project, state_data: dict) -> str:
    """Generate a README.md for the downloadable zip."""
    name = project.name or "Project"
    desc = project.description or ""
    deploy = state_data.get("deployment_config") or {}
    steps = deploy.get("deployment_steps", [])
    run_cmd = deploy.get("run_command", "")
    entry = deploy.get("entry_point", "")
    env_vars = deploy.get("env_variables", [])

    code_files = state_data.get("code_artifacts", [])
    file_list = "\n".join(
        f"- `{a.get('file_path', '?')}` — {a.get('description', a.get('language', ''))}"
        for a in code_files
    )

    sections = [f"# {name}\n\n{desc}\n"]

    sections.append("## Files\n\n" + (file_list or "No code files.") + "\n")

    if steps:
        sections.append("## Getting Started\n\n" + "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps)) + "\n")
    elif run_cmd:
        sections.append(f"## Quick Start\n\n```bash\n{run_cmd}\n```\n")
    elif entry:
        sections.append(f"## Quick Start\n\nOpen `{entry}` in your browser or run the entry point.\n")

    if env_vars:
        sections.append("## Environment Variables\n\n" + "\n".join(f"- `{v}`" for v in env_vars) + "\n")

    sections.append("---\n*Generated by Multi-Agent Platform*\n")
    return "\n".join(sections)


@router.get("/projects/{project_id}/download")
async def download_project(project_id: str):
    """Download all project artifacts as a zip file with an auto-generated README."""
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    state_data = project.state_data or {}
    code_artifacts = state_data.get("code_artifacts", [])
    test_artifacts = state_data.get("test_artifacts", [])
    doc_artifacts = state_data.get("documentation_artifacts", [])
    deploy_config = state_data.get("deployment_config") or {}

    if not code_artifacts and not test_artifacts and not doc_artifacts:
        raise HTTPException(status_code=400, detail="No artifacts to download")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for a in code_artifacts:
            fp = a.get("file_path", "")
            if fp:
                zf.writestr(fp, a.get("content", ""))

        for a in test_artifacts:
            fp = a.get("file_path", "")
            if fp:
                zf.writestr(fp, a.get("content", ""))

        for a in doc_artifacts:
            doc_type = a.get("doc_type", "DOC")
            zf.writestr(f"docs/{doc_type}.md", a.get("content", ""))

        if deploy_config.get("dockerfile"):
            zf.writestr("Dockerfile", deploy_config["dockerfile"])
        if deploy_config.get("docker_compose"):
            zf.writestr("docker-compose.yml", deploy_config["docker_compose"])

        readme = _generate_readme(project, state_data)
        zf.writestr("README.md", readme)

    buf.seek(0)
    safe_name = (project.name or "project").replace(" ", "_").lower()

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.zip"'},
    )


@router.get("/projects/{project_id}/state")
async def get_project_state(project_id: str):
    """Get full project workflow state including all artifacts.

    Returns the complete state_data stored in the DB, which includes
    code_artifacts, test_artifacts, documentation_artifacts, agent_decisions,
    architecture_design, requirements_analysis, deployment_config, etc.
    """
    project = project_service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )

    state_data = project.state_data or {}

    # Return a cleaned-up version of the state with key fields
    return {
        "project_id": project.id,
        "status": project.status,
        "current_phase": project.current_phase,
        "current_agent": state_data.get("current_agent"),
        "phase_history": state_data.get("phase_history", []),
        "requirements_analysis": state_data.get("requirements_analysis"),
        "architecture_design": state_data.get("architecture_design"),
        "code_artifacts": state_data.get("code_artifacts", []),
        "test_artifacts": state_data.get("test_artifacts", []),
        "documentation_artifacts": state_data.get("documentation_artifacts", []),
        "deployment_config": state_data.get("deployment_config"),
        "agent_decisions": state_data.get("agent_decisions", []),
        "errors": state_data.get("errors", []),
    }

