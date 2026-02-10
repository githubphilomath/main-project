"""Orchestrator Agent - Coordinates workflow and manages agent handoffs."""

from typing import Any, Dict

from agents.base import BaseAgent
from core.state import AgentState, ProjectPhase
from utils.logging import get_logger

logger = get_logger(__name__)


class OrchestratorAgent(BaseAgent):
    """Orchestrator agent that coordinates the entire workflow."""

    def __init__(self):
        """Initialize Orchestrator Agent."""
        super().__init__(
            name="orchestrator",
            description="Coordinates workflow and manages agent handoffs",
        )

    def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute orchestrator logic to determine next agent.

        Args:
            state: Current agent state

        Returns:
            Updated state with next agent information
        """
        self.logger.info(
            "Orchestrating workflow",
            project_id=state["project_id"],
            current_phase=state["current_phase"],
        )

        # Determine next phase based on current phase
        phase_transitions = {
            ProjectPhase.INITIALIZATION: ProjectPhase.REQUIREMENT_ANALYSIS,
            ProjectPhase.REQUIREMENT_ANALYSIS: ProjectPhase.ARCHITECTURE_DESIGN,
            ProjectPhase.ARCHITECTURE_DESIGN: ProjectPhase.CODING,
            ProjectPhase.CODING: ProjectPhase.DEBUGGING,
            ProjectPhase.DEBUGGING: ProjectPhase.TESTING,
            ProjectPhase.TESTING: ProjectPhase.DOCUMENTATION,
            ProjectPhase.DOCUMENTATION: ProjectPhase.DEPLOYMENT,
            ProjectPhase.DEPLOYMENT: ProjectPhase.COMPLETED,
        }

        current_phase = state["current_phase"]
        # Normalize to ProjectPhase enum if it's a string
        if isinstance(current_phase, str):
            try:
                current_phase = ProjectPhase(current_phase)
            except ValueError:
                # If not a valid phase, default to initialization
                current_phase = ProjectPhase.INITIALIZATION
        
        next_phase = phase_transitions.get(current_phase)

        if not next_phase:
            if current_phase == ProjectPhase.COMPLETED:
                return self.update_state(state, {"completed": True})
            else:
                return self.update_state(
                    state,
                    {
                        "current_phase": ProjectPhase.FAILED,
                        "errors": state.get("errors", []) + [
                            {"error": f"Unknown phase transition from {current_phase}"}
                        ],
                    },
                )

        # Determine next agent based on phase
        agent_mapping = {
            ProjectPhase.REQUIREMENT_ANALYSIS: "requirement_analysis",
            ProjectPhase.ARCHITECTURE_DESIGN: "architecture",
            ProjectPhase.CODING: "coding",
            ProjectPhase.DEBUGGING: "debugging",
            ProjectPhase.TESTING: "testing",
            ProjectPhase.DOCUMENTATION: "documentation",
            ProjectPhase.DEPLOYMENT: "deployment",
        }

        next_agent = agent_mapping.get(next_phase)

        # Update phase history
        phase_history = state.get("phase_history", [])
        current_phase_str = current_phase.value if hasattr(current_phase, "value") else str(current_phase)
        if current_phase_str not in phase_history:
            phase_history.append(current_phase_str)

        decision = self.create_decision(
            decision=f"Transitioning from {current_phase} to {next_phase}",
            rationale=f"Workflow progression: {current_phase} -> {next_phase}",
            confidence=0.9,
        )

        next_phase_str = next_phase.value if hasattr(next_phase, "value") else str(next_phase)
        return self.update_state(
            state,
            {
                "current_phase": next_phase_str,
                "current_agent": next_agent,
                "next_agent": next_agent,
                "phase_history": phase_history,
                "agent_decisions": state.get("agent_decisions", []) + [decision],
            },
        )

    def get_tools(self) -> list:
        """Get orchestrator tools."""
        return []

