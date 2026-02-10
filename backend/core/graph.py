"""LangGraph workflow orchestration for multi-agent system."""

from typing import Dict, Literal

from langgraph.graph import END, StateGraph

from agents import (
    ArchitectureAgent,
    CodingAgent,
    DebuggingAgent,
    DeploymentAgent,
    DocumentationAgent,
    OrchestratorAgent,
    RequirementAnalysisAgent,
    TestingAgent,
)
from core.state import AgentState, ProjectPhase
from utils.logging import get_logger

logger = get_logger(__name__)


class AgentWorkflow:
    """LangGraph workflow for orchestrating agents."""

    def __init__(self):
        """Initialize agent workflow."""
        self.logger = get_logger(__name__)

        # Initialize agents
        self.orchestrator = OrchestratorAgent()
        self.requirement_analysis = RequirementAnalysisAgent()
        self.architecture = ArchitectureAgent()
        self.coding = CodingAgent()
        self.debugging = DebuggingAgent()
        self.testing = TestingAgent()
        self.documentation = DocumentationAgent()
        self.deployment = DeploymentAgent()

        # Create agent mapping
        self.agents = {
            "orchestrator": self.orchestrator,
            "requirement_analysis": self.requirement_analysis,
            "architecture": self.architecture,
            "coding": self.coding,
            "debugging": self.debugging,
            "testing": self.testing,
            "documentation": self.documentation,
            "deployment": self.deployment,
        }

        # Build graph
        self.graph = self._build_graph()
        self.app = self.graph.compile()

        self.logger.info("Agent workflow initialized")

    def _build_graph(self) -> StateGraph:
        """Build LangGraph workflow graph."""
        workflow = StateGraph(AgentState)

        # Add nodes for each agent
        workflow.add_node("orchestrator", self._orchestrator_node)
        workflow.add_node("requirement_analysis", self._requirement_analysis_node)
        workflow.add_node("architecture", self._architecture_node)
        workflow.add_node("coding", self._coding_node)
        workflow.add_node("debugging", self._debugging_node)
        workflow.add_node("testing", self._testing_node)
        workflow.add_node("documentation", self._documentation_node)
        workflow.add_node("deployment", self._deployment_node)
        workflow.add_node("error_handler", self._error_handler_node)

        # Define workflow edges - set orchestrator as entry point
        workflow.set_entry_point("orchestrator")

        # Orchestrator routes to next agent
        workflow.add_conditional_edges(
            "orchestrator",
            self._route_after_orchestrator,
            {
                "requirement_analysis": "requirement_analysis",
                "architecture": "architecture",
                "coding": "coding",
                "debugging": "debugging",
                "testing": "testing",
                "documentation": "documentation",
                "deployment": "deployment",
                "completed": END,
                "error": "error_handler",
            },
        )

        # After each agent, go back to orchestrator
        workflow.add_edge("requirement_analysis", "orchestrator")
        workflow.add_edge("architecture", "orchestrator")
        workflow.add_edge("coding", "orchestrator")
        workflow.add_edge("debugging", "orchestrator")
        workflow.add_edge("testing", "orchestrator")
        workflow.add_edge("documentation", "orchestrator")
        workflow.add_edge("deployment", "orchestrator")

        # Error handler routes back to orchestrator or ends
        workflow.add_conditional_edges(
            "error_handler",
            self._route_after_error,
            {
                "retry": "orchestrator",
                "end": END,
            },
        )

        return workflow

    def _orchestrator_node(self, state: AgentState) -> AgentState:
        """Orchestrator node execution."""
        try:
            self.logger.info(
                "Orchestrator node",
                project_id=state["project_id"],
                current_phase=state["current_phase"],
            )
            return self.orchestrator.execute(state)
        except Exception as e:
            self.logger.error("Orchestrator error", error=str(e))
            return self._handle_error(state, "orchestrator", str(e))

    def _requirement_analysis_node(self, state: AgentState) -> AgentState:
        """Requirement analysis node execution."""
        try:
            self.logger.info(
                "Requirement analysis node",
                project_id=state["project_id"],
            )
            return self.requirement_analysis.execute(state)
        except Exception as e:
            self.logger.error("Requirement analysis error", error=str(e))
            return self._handle_error(state, "requirement_analysis", str(e))

    def _architecture_node(self, state: AgentState) -> AgentState:
        """Architecture node execution."""
        try:
            self.logger.info(
                "Architecture node",
                project_id=state["project_id"],
            )
            return self.architecture.execute(state)
        except Exception as e:
            self.logger.error("Architecture error", error=str(e))
            return self._handle_error(state, "architecture", str(e))

    def _coding_node(self, state: AgentState) -> AgentState:
        """Coding node execution."""
        try:
            self.logger.info(
                "Coding node",
                project_id=state["project_id"],
            )
            return self.coding.execute(state)
        except Exception as e:
            self.logger.error("Coding error", error=str(e))
            return self._handle_error(state, "coding", str(e))

    def _debugging_node(self, state: AgentState) -> AgentState:
        """Debugging node execution."""
        try:
            self.logger.info(
                "Debugging node",
                project_id=state["project_id"],
            )
            return self.debugging.execute(state)
        except Exception as e:
            self.logger.error("Debugging error", error=str(e))
            return self._handle_error(state, "debugging", str(e))

    def _testing_node(self, state: AgentState) -> AgentState:
        """Testing node execution."""
        try:
            self.logger.info(
                "Testing node",
                project_id=state["project_id"],
            )
            return self.testing.execute(state)
        except Exception as e:
            self.logger.error("Testing error", error=str(e))
            return self._handle_error(state, "testing", str(e))

    def _documentation_node(self, state: AgentState) -> AgentState:
        """Documentation node execution."""
        try:
            self.logger.info(
                "Documentation node",
                project_id=state["project_id"],
            )
            return self.documentation.execute(state)
        except Exception as e:
            self.logger.error("Documentation error", error=str(e))
            return self._handle_error(state, "documentation", str(e))

    def _deployment_node(self, state: AgentState) -> AgentState:
        """Deployment node execution."""
        try:
            self.logger.info(
                "Deployment node",
                project_id=state["project_id"],
            )
            return self.deployment.execute(state)
        except Exception as e:
            self.logger.error("Deployment error", error=str(e))
            return self._handle_error(state, "deployment", str(e))

    def _error_handler_node(self, state: AgentState) -> AgentState:
        """Error handler node execution."""
        self.logger.warning(
            "Error handler node",
            project_id=state["project_id"],
            errors=state.get("errors", []),
        )
        return state

    def _route_after_orchestrator(self, state: AgentState) -> str:
        """Route after orchestrator execution."""
        current_phase = state.get("current_phase")
        next_agent = state.get("next_agent")
        errors = state.get("errors", [])

        # Normalize phase to string
        if hasattr(current_phase, "value"):
            current_phase = current_phase.value
        current_phase = str(current_phase)

        # Check for errors
        if errors and len(errors) > 0:
            retry_count = state.get("retry_count", 0)
            max_retries = state.get("max_retries", 3)
            if retry_count >= max_retries:
                return "error"

        # Route to next agent or completion
        if current_phase == ProjectPhase.COMPLETED.value or current_phase == "completed":
            return "completed"
        elif current_phase == ProjectPhase.FAILED.value or current_phase == "failed":
            return "error"
        elif next_agent:
            return next_agent
        else:
            return "error"

    def _route_after_error(self, state: AgentState) -> Literal["retry", "end"]:
        """Route after error handler."""
        retry_count = state.get("retry_count", 0)
        max_retries = state.get("max_retries", 3)

        if retry_count < max_retries:
            return "retry"
        else:
            return "end"

    def _handle_error(
        self,
        state: AgentState,
        agent_name: str,
        error_message: str,
    ) -> AgentState:
        """Handle agent errors."""
        errors = state.get("errors", [])
        errors.append(
            {
                "agent": agent_name,
                "error": error_message,
                "phase": state.get("current_phase"),
            }
        )

        retry_count = state.get("retry_count", 0)
        retry_count += 1

        updated_state = state.copy()
        updated_state["errors"] = errors
        updated_state["retry_count"] = retry_count

        return updated_state

    async def run(self, initial_state: AgentState) -> AgentState:
        """Run the workflow with initial state.

        Args:
            initial_state: Initial agent state

        Returns:
            Final agent state
        """
        self.logger.info(
            "Starting workflow",
            project_id=initial_state["project_id"],
        )

        try:
            # Run the graph
            final_state = await self.app.ainvoke(initial_state)
            self.logger.info(
                "Workflow completed",
                project_id=final_state["project_id"],
                phase=final_state.get("current_phase"),
            )
            return final_state
        except Exception as e:
            self.logger.error("Workflow error", error=str(e))
            raise

    async def stream(self, initial_state: AgentState):
        """Stream workflow execution.

        Args:
            initial_state: Initial agent state

        Yields:
            State updates
        """
        self.logger.info(
            "Streaming workflow",
            project_id=initial_state["project_id"],
        )

        try:
            async for state in self.app.astream(initial_state):
                yield state
        except Exception as e:
            self.logger.error("Workflow stream error", error=str(e))
            raise

