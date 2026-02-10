"""Project service for managing projects."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config.settings import get_settings
from core.state import AgentState, ProjectPhase
from models.database import Project
from utils.logging import get_logger

logger = get_logger(__name__)


class ProjectService:
    """Service for managing projects."""

    def __init__(self):
        """Initialize project service."""
        self.settings = get_settings()
        self.logger = get_logger(__name__)

        # Initialize database
        self.engine = create_engine(
            self.settings.database_url,
            pool_size=self.settings.db_pool_size,
            max_overflow=self.settings.db_max_overflow,
        )
        self.SessionLocal = sessionmaker(bind=self.engine)

    def create_project(
        self,
        name: str,
        description: str,
        requirements: str,
    ) -> str:
        """Create a new project.

        Args:
            name: Project name
            description: Project description
            requirements: User requirements

        Returns:
            Project ID
        """
        project_id = str(uuid.uuid4())
        db = self.SessionLocal()

        try:
            project = Project(
                id=project_id,
                name=name,
                description=description,
                requirements=requirements,
                status="pending",
                current_phase="initialization",
                state_data={},
            )
            db.add(project)
            db.commit()
            self.logger.info("Project created", project_id=project_id)
            return project_id
        except Exception as e:
            db.rollback()
            self.logger.error("Failed to create project", error=str(e))
            raise
        finally:
            db.close()

    def get_project(self, project_id: str) -> Optional[Project]:
        """Get project by ID.

        Args:
            project_id: Project ID

        Returns:
            Project or None
        """
        db = self.SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            return project
        finally:
            db.close()

    def update_project_state(
        self,
        project_id: str,
        state: AgentState,
    ) -> None:
        """Update project state in database.

        Args:
            project_id: Project ID
            state: Agent state
        """
        db = self.SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                project.status = "completed" if state.get("completed") else "in_progress"
                current_phase = state.get("current_phase", "initialization")
                # Handle both string and enum values
                if hasattr(current_phase, "value"):
                    project.current_phase = current_phase.value
                else:
                    project.current_phase = str(current_phase)
                project.state_data = state
                project.updated_at = datetime.utcnow()
                db.commit()
                self.logger.info(
                    "Project state updated",
                    project_id=project_id,
                    phase=project.current_phase,
                )
        except Exception as e:
            db.rollback()
            self.logger.error("Failed to update project state", error=str(e))
            raise
        finally:
            db.close()

    def create_initial_state(
        self,
        project_id: str,
        name: str,
        description: str,
        requirements: str,
    ) -> AgentState:
        """Create initial agent state for a project.

        Args:
            project_id: Project ID
            name: Project name
            description: Project description
            requirements: User requirements

        Returns:
            Initial agent state
        """
        now = datetime.utcnow().isoformat()

        return {
            "project_id": project_id,
            "project_name": name,
            "project_description": description,
            "user_requirements": requirements,
            "current_phase": ProjectPhase.INITIALIZATION.value,
            "current_agent": "orchestrator",
            "next_agent": None,
            "phase_history": [],
            "requirements_analysis": None,
            "architecture_design": None,
            "code_artifacts": [],
            "test_artifacts": [],
            "documentation_artifacts": [],
            "deployment_config": None,
            "agent_decisions": [],
            "rag_context": {
                "knowledge_base_results": [],
                "project_memory_results": [],
                "version_results": [],
            },
            "errors": [],
            "retry_count": 0,
            "max_retries": self.settings.max_retries,
            "created_at": now,
            "updated_at": now,
            "completed": False,
        }

