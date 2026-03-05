"""Workflow service for executing agent workflows."""

import asyncio
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional

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
        # Track SSE queues per project for real-time event delivery
        self._event_queues: Dict[str, List[asyncio.Queue]] = {}

    def subscribe_events(self, project_id: str) -> asyncio.Queue:
        """Subscribe to SSE events for a project.

        Returns an asyncio.Queue that will receive event dicts.
        """
        if project_id not in self._event_queues:
            self._event_queues[project_id] = []
        queue: asyncio.Queue = asyncio.Queue()
        self._event_queues[project_id].append(queue)
        return queue

    def unsubscribe_events(self, project_id: str, queue: asyncio.Queue):
        """Unsubscribe from SSE events."""
        if project_id in self._event_queues:
            try:
                self._event_queues[project_id].remove(queue)
            except ValueError:
                pass
            if not self._event_queues[project_id]:
                del self._event_queues[project_id]

    async def execute_modification(
        self,
        project_id: str,
        message: str,
    ) -> AgentState:
        """Run the coding agent with user feedback to modify existing code in place.

        Loads current project state, adds modification_request, invokes coding agent,
        updates DB, and broadcasts SSE events.
        """
        self.logger.info("Executing modification", project_id=project_id)

        project = self.project_service.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        state_data = project.state_data or {}
        if not state_data.get("code_artifacts") and not state_data.get("architecture_design"):
            raise ValueError(
                "Project has no code or architecture yet. Run the workflow first, then request modifications."
            )

        state: AgentState = dict(state_data)
        state["modification_request"] = message
        state["current_phase"] = "coding"
        state["current_agent"] = "coding"

        def on_graph_event(event: Dict[str, Any]):
            event["project_id"] = project_id
            self._broadcast_event(project_id, event)

        self.workflow.add_event_listener(on_graph_event)

        try:
            self._broadcast_event(project_id, {
                "event": "agent_start",
                "agent": "coding",
                "phase": "coding",
                "message": f"Analyzing your request: \"{message[:100]}{'...' if len(message) > 100 else ''}\"",
                "thinking": f"Reading modification request and comparing with existing {len(state.get('code_artifacts', []))} files...",
                "project_id": project_id,
            })

            existing_paths = set(
                (a.get("file_path", "") if isinstance(a, dict) else getattr(a, "file_path", ""))
                for a in state.get("code_artifacts", [])
            )

            result = self.workflow.coding.execute(state)

            new_paths = set(
                (a.get("file_path", "") if isinstance(a, dict) else getattr(a, "file_path", ""))
                for a in result.get("code_artifacts", [])
            )
            added = new_paths - existing_paths
            modified = new_paths & existing_paths
            removed = existing_paths - new_paths

            diff_summary_parts = []
            if modified:
                diff_summary_parts.append(f"Modified {len(modified)} file(s): {', '.join(list(modified)[:5])}")
            if added:
                diff_summary_parts.append(f"Added {len(added)} file(s): {', '.join(list(added)[:5])}")
            if removed:
                diff_summary_parts.append(f"Removed {len(removed)} file(s): {', '.join(list(removed)[:5])}")
            diff_summary = ". ".join(diff_summary_parts) or "No file changes detected."

            decision_msg = (
                result.get("agent_decisions", [{}])[-1].get("decision", "Modifications applied.")
                if result.get("agent_decisions") else "Modifications applied."
            )

            self._broadcast_event(project_id, {
                "event": "agent_complete",
                "agent": "coding",
                "phase": "coding",
                "message": f"{decision_msg}\n\n**Changes:** {diff_summary}",
                "summary": f"{decision_msg} — {diff_summary}",
                "details": {
                    "files_modified": len(modified),
                    "files_added": len(added),
                    "files_removed": len(removed),
                    "modified_files": list(modified)[:10],
                    "added_files": list(added)[:10],
                },
                "project_id": project_id,
            })
            result.pop("modification_request", None)
            result["current_phase"] = "completed"
            self.project_service.update_project_state(project_id, result)
            self._broadcast_event(project_id, {
                "event": "workflow_complete",
                "phase": "coding",
                "project_id": project_id,
                "change_summary": diff_summary,
                "files_modified": list(modified)[:10],
                "files_added": list(added)[:10],
                "files_removed": list(removed)[:10],
            })
            return result
        except Exception as e:
            self.logger.error("Modification failed", error=str(e), project_id=project_id)
            self._broadcast_event(project_id, {
                "event": "workflow_error",
                "message": str(e),
                "project_id": project_id,
            })
            raise
        finally:
            self.workflow.remove_event_listener(on_graph_event)

    def _broadcast_event(self, project_id: str, event: Dict[str, Any]):
        """Broadcast an SSE event to all subscribers for a project."""
        queues = self._event_queues.get(project_id, [])
        for q in queues:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass  # Drop events if consumer is too slow

    async def execute_workflow(
        self,
        project_id: str,
    ) -> AgentState:
        """Execute workflow for a project using streaming internally.

        Streams the workflow so the DB is updated after EACH agent step,
        enabling the frontend to see real-time progress.

        Args:
            project_id: Project ID

        Returns:
            Final agent state
        """
        self.logger.info("Executing workflow (streaming)", project_id=project_id)

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

        # Register event listener on the workflow graph for SSE broadcasting
        def on_graph_event(event: Dict[str, Any]):
            event["project_id"] = project_id
            self._broadcast_event(project_id, event)

        self.workflow.add_event_listener(on_graph_event)

        latest_state = initial_state
        try:
            # Use streaming internally so we update DB after each agent step
            async for state_update in self.workflow.stream(initial_state):
                # state_update is a dict keyed by node name -> state snapshot
                if state_update:
                    node_name = list(state_update.keys())[-1]
                    latest_state = state_update[node_name]

                    self.logger.info(
                        "Workflow step completed",
                        project_id=project_id,
                        node=node_name,
                        phase=latest_state.get("current_phase"),
                    )

                    # Update project state in DB after each step
                    self.project_service.update_project_state(
                        project_id, latest_state
                    )

                    # Broadcast step update via SSE
                    self._broadcast_event(project_id, {
                        "event": "step_complete",
                        "node": node_name,
                        "phase": latest_state.get("current_phase"),
                        "project_id": project_id,
                    })

        except Exception as e:
            self.logger.error(
                "Workflow execution failed",
                error=str(e),
                project_id=project_id,
            )
            # Update DB with error state
            latest_state["current_phase"] = "failed"
            latest_state["errors"] = latest_state.get("errors", []) + [
                {"agent": "workflow", "error": str(e)}
            ]
            self.project_service.update_project_state(project_id, latest_state)

            self._broadcast_event(project_id, {
                "event": "workflow_error",
                "message": str(e),
                "project_id": project_id,
            })
            raise
        finally:
            self.workflow.remove_event_listener(on_graph_event)

        # Broadcast workflow completion
        self._broadcast_event(project_id, {
            "event": "workflow_complete",
            "phase": latest_state.get("current_phase"),
            "project_id": project_id,
        })

        return latest_state

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

