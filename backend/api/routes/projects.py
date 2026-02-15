"""Project API routes."""

import asyncio
import json
from typing import List

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import StreamingResponse

from models.schemas import ProjectCreate, ProjectResponse, ProjectStatus
from services.project_service import ProjectService
from services.workflow_service import WorkflowService
from utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()
project_service = ProjectService()
workflow_service = WorkflowService()


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
        logger.error("Failed to create project", error=str(e))
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

