"""Project API routes."""

from typing import List

from fastapi import APIRouter, HTTPException, status
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


@router.post("/projects/{project_id}/execute", status_code=status.HTTP_202_ACCEPTED)
async def execute_project(project_id: str):
    """Execute workflow for a project."""
    try:
        final_state = await workflow_service.execute_workflow(project_id)

        return {
            "project_id": project_id,
            "status": "completed" if final_state.get("completed") else "in_progress",
            "phase": final_state.get("current_phase"),
            "message": "Workflow execution completed",
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error("Failed to execute workflow", error=str(e), project_id=project_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/projects/{project_id}/stream")
async def stream_project(project_id: str):
    """Stream workflow execution for a project."""
    try:
        import json

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

