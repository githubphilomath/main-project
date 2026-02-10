"""Workflow service for executing agent workflows."""

from core.graph import AgentWorkflow
from core.state import AgentState
from services.project_service import ProjectService
from utils.logging import get_logger

logger = get_logger(__name__)


class WorkflowService:
    """Service for executing agent workflows."""

    def __init__(self):
        """Initialize workflow service."""
        self.workflow = AgentWorkflow()
        self.project_service = ProjectService()
        self.logger = get_logger(__name__)

    async def execute_workflow(
        self,
        project_id: str,
    ) -> AgentState:
        """Execute workflow for a project.

        Args:
            project_id: Project ID

        Returns:
            Final agent state
        """
        self.logger.info("Executing workflow", project_id=project_id)

        # Get project
        project = self.project_service.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        # Create initial state
        initial_state = self.project_service.create_initial_state(
            project_id=project.id,
            name=project.name,
            description=project.description,
            requirements=project.requirements,
        )

        # Execute workflow
        try:
            final_state = await self.workflow.run(initial_state)
        except Exception as e:
            self.logger.error("Workflow execution failed", error=str(e), project_id=project_id)
            raise

        # Update project state
        self.project_service.update_project_state(project_id, final_state)

        return final_state

    async def stream_workflow(
        self,
        project_id: str,
    ):
        """Stream workflow execution for a project.

        Args:
            project_id: Project ID

        Yields:
            State updates
        """
        self.logger.info("Streaming workflow", project_id=project_id)

        # Get project
        project = self.project_service.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        # Create initial state
        initial_state = self.project_service.create_initial_state(
            project_id=project.id,
            name=project.name,
            description=project.description,
            requirements=project.requirements,
        )

        # Stream workflow
        async for state_update in self.workflow.stream(initial_state):
            # Update project state on each update
            # Get the latest state from the update
            latest_state = list(state_update.values())[-1] if state_update else initial_state
            self.project_service.update_project_state(project_id, latest_state)
            yield state_update

