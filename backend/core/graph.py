"""LangGraph workflow orchestration for multi-agent system."""

import time
from typing import Any, Callable, Dict, List, Literal

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

# Agent display names for SSE events
AGENT_DISPLAY = {
    "orchestrator": "Orchestrator",
    "requirement_analysis": "Requirement Analysis",
    "architecture": "Architecture Design",
    "coding": "Code Generation",
    "debugging": "Debugging",
    "testing": "Testing",
    "documentation": "Documentation",
    "deployment": "Deployment",
}

AGENT_THINKING_MSG = {
    "requirement_analysis": "Analyzing your requirements — extracting user stories, acceptance criteria, and technical constraints...",
    "architecture": "Designing system architecture — choosing patterns, tech stack, and component structure...",
    "coding": "Writing production code — implementing all components with proper error handling and styling...",
    "debugging": "Debugging the codebase — scanning for syntax errors, logic issues, and security vulnerabilities...",
    "testing": "Generating test suite — creating unit tests, integration tests, and edge case coverage...",
    "documentation": "Writing documentation — README with setup instructions, architecture docs, and API reference...",
    "deployment": "Configuring deployment — Dockerfile, run commands, and environment setup...",
}


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

        # SSE event listeners (set by workflow_service for streaming)
        self._event_listeners: List[Callable] = []

        # Build graph
        self.graph = self._build_graph()
        self.app = self.graph.compile()

        self.logger.info("Agent workflow initialized")

    def add_event_listener(self, listener: Callable):
        """Add an SSE event listener."""
        self._event_listeners.append(listener)

    def remove_event_listener(self, listener: Callable):
        """Remove an SSE event listener."""
        if listener in self._event_listeners:
            self._event_listeners.remove(listener)

    def _emit_event(self, event: Dict[str, Any]):
        """Emit an event to all listeners."""
        for listener in self._event_listeners:
            try:
                listener(event)
            except Exception:
                pass

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

    def _build_verbose_summary(self, agent_name: str, result: AgentState) -> str:
        """Build a verbose, untruncated summary of what the agent produced."""
        display = AGENT_DISPLAY.get(agent_name, agent_name)
        parts = [f"**{display}** completed."]

        if agent_name == "orchestrator":
            next_phase = result.get("current_phase", "")
            next_agent = result.get("next_agent", "")
            if next_phase == "completed":
                parts.append("All phases finished — workflow complete.")
            elif next_agent:
                parts.append(f"Next up: **{AGENT_DISPLAY.get(next_agent, next_agent)}**")
            return " ".join(parts)

        if agent_name == "requirement_analysis":
            ra = result.get("requirements_analysis") or {}
            fr = ra.get("functional_requirements", [])
            nfr = ra.get("non_functional_requirements", [])
            us = ra.get("user_stories", [])
            parts.append(
                f"Found {len(fr)} functional requirements, "
                f"{len(nfr)} non-functional requirements, "
                f"and {len(us)} user stories."
            )
            if fr:
                top = fr[:3] if len(fr) > 3 else fr
                for i, req in enumerate(top, 1):
                    req_text = req if isinstance(req, str) else (req.get("description") or req.get("name") or str(req))
                    parts.append(f"\n{i}. {req_text}")

        elif agent_name == "architecture":
            arch = result.get("architecture_design") or {}
            pattern = arch.get("architecture_pattern", "N/A")
            stack = arch.get("technology_stack", [])
            comps = arch.get("system_components", [])
            file_structure = arch.get("file_structure", [])
            parts.append(f"Pattern: **{pattern}**.")
            parts.append(f"Stack: {', '.join(stack)}.")
            parts.append(f"{len(comps)} components designed.")
            if file_structure:
                parts.append(f"\nFile structure ({len(file_structure)} files):")
                for f in file_structure:
                    parts.append(f"  • {f}")

        elif agent_name == "coding":
            artifacts = result.get("code_artifacts", [])
            parts.append(f"Generated **{len(artifacts)} code files**:")
            if artifacts:
                for a in artifacts:
                    fp = a.get("file_path", "?")
                    lang = a.get("language", "")
                    parts.append(f"  • {fp}" + (f" ({lang})" if lang else ""))

        elif agent_name == "debugging":
            issues = result.get("debug_issues", [])
            if issues:
                fixed_paths = set(i.get("file_path", "?") for i in issues)
                parts.append(f"Found and fixed **{len(issues)} issues** in **{len(fixed_paths)} files**:")
                for iss in issues:
                    sev = iss.get("severity", "?").upper()
                    fp = iss.get("file_path", "?")
                    desc = iss.get("description", "")
                    fix = iss.get("fix", "")
                    parts.append(f"  • **[{sev}]** `{fp}`: {desc}")
                    if fix:
                        parts.append(f"    ↳ Fix: {fix}")
            else:
                parts.append("No issues found during debugging.")

        elif agent_name == "testing":
            test_artifacts = result.get("test_artifacts", [])
            parts.append(f"Created **{len(test_artifacts)} test files**.")
            if test_artifacts:
                types = set(a.get("test_type", "unit") for a in test_artifacts)
                parts.append(f"Types: {', '.join(types)}.")
                for t in test_artifacts:
                    parts.append(f"  • {t.get('file_path', '?')}")

        elif agent_name == "documentation":
            docs = result.get("documentation_artifacts", [])
            parts.append(f"Wrote **{len(docs)} documentation files**:")
            if docs:
                for d in docs:
                    dt = d.get("doc_type", "?")
                    desc = d.get("description", "")
                    parts.append(f"  • {dt}" + (f" — {desc}" if desc else ""))

        elif agent_name == "deployment":
            deploy = result.get("deployment_config") or {}
            dtype = deploy.get("deployment_type", "N/A")
            steps = deploy.get("deployment_steps", [])
            parts.append(f"Type: **{dtype}**. {len(steps)} deployment steps:")
            for s in steps:
                step_text = s if isinstance(s, str) else (s.get("description") or s.get("command") or str(s))
                parts.append(f"  • {step_text}")

        return "\n".join(parts)

    def _build_details(self, agent_name: str, result: AgentState) -> dict:
        """Build structured details dict for the agent_complete event."""
        details: Dict[str, Any] = {}
        if agent_name == "requirement_analysis":
            ra = result.get("requirements_analysis") or {}
            details["functional_requirements"] = len(ra.get("functional_requirements", []))
            details["non_functional_requirements"] = len(ra.get("non_functional_requirements", []))
            details["user_stories"] = len(ra.get("user_stories", []))
        elif agent_name == "architecture":
            arch = result.get("architecture_design") or {}
            details["pattern"] = arch.get("architecture_pattern", "N/A")
            details["tech_stack"] = arch.get("technology_stack", [])[:8]
            details["components"] = len(arch.get("system_components", []))
            details["files_planned"] = len(arch.get("file_structure", []))
        elif agent_name == "coding":
            arts = result.get("code_artifacts", [])
            details["files_generated"] = len(arts)
            details["file_paths"] = [a.get("file_path", "?") for a in arts[:10]]
        elif agent_name == "debugging":
            issues = result.get("debug_issues", [])
            details["issues_count"] = len(issues)
            details["files_fixed"] = list(set(i.get("file_path", "?") for i in issues))
            details["issues"] = [
                {
                    "file": i.get("file_path", "?"),
                    "severity": i.get("severity", "?"),
                    "description": i.get("description", ""),
                    "fix": i.get("fix", ""),
                }
                for i in issues
            ]
        elif agent_name == "testing":
            tests = result.get("test_artifacts", [])
            details["test_files"] = len(tests)
            details["test_types"] = list(set(a.get("test_type", "unit") for a in tests))
        elif agent_name == "documentation":
            docs = result.get("documentation_artifacts", [])
            details["doc_count"] = len(docs)
            details["doc_types"] = [d.get("doc_type", "?") for d in docs]
        elif agent_name == "deployment":
            dep = result.get("deployment_config") or {}
            details["deployment_type"] = dep.get("deployment_type", "N/A")
            details["steps"] = len(dep.get("deployment_steps", []))
            details["run_command"] = dep.get("run_command", "")
        return details

    def _run_agent_node(self, state: AgentState, agent_name: str, agent) -> AgentState:
        """Generic agent node runner with rich event emission."""
        display = AGENT_DISPLAY.get(agent_name, agent_name)
        thinking = AGENT_THINKING_MSG.get(agent_name, f"Running {display}...")
        start_time = time.time()
        try:
            self.logger.info(
                f"{display} node",
                project_id=state["project_id"],
                current_phase=state.get("current_phase"),
            )
            self._emit_event({
                "event": "agent_start",
                "agent": agent_name,
                "phase": state.get("current_phase", agent_name),
                "message": thinking,
                "thinking": thinking,
            })
            result = agent.execute(state)
            duration_ms = int((time.time() - start_time) * 1000)
            verbose = self._build_verbose_summary(agent_name, result)
            details = self._build_details(agent_name, result)
            self._emit_event({
                "event": "agent_complete",
                "agent": agent_name,
                "phase": result.get("current_phase", agent_name),
                "message": verbose,
                "summary": verbose,
                "details": details,
                "duration_ms": duration_ms,
            })
            return result
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            self.logger.error(f"{display} error", error=str(e))
            self._emit_event({
                "event": "agent_error",
                "agent": agent_name,
                "phase": state.get("current_phase", agent_name),
                "message": f"**{display}** encountered an error: {str(e)[:200]}",
                "duration_ms": duration_ms,
            })
            return self._handle_error(state, agent_name, str(e))

    def _orchestrator_node(self, state: AgentState) -> AgentState:
        """Orchestrator node execution."""
        return self._run_agent_node(state, "orchestrator", self.orchestrator)

    def _requirement_analysis_node(self, state: AgentState) -> AgentState:
        """Requirement analysis node execution."""
        return self._run_agent_node(state, "requirement_analysis", self.requirement_analysis)

    def _architecture_node(self, state: AgentState) -> AgentState:
        """Architecture node execution."""
        return self._run_agent_node(state, "architecture", self.architecture)

    def _coding_node(self, state: AgentState) -> AgentState:
        """Coding node execution."""
        return self._run_agent_node(state, "coding", self.coding)

    def _debugging_node(self, state: AgentState) -> AgentState:
        """Debugging node execution."""
        return self._run_agent_node(state, "debugging", self.debugging)

    def _testing_node(self, state: AgentState) -> AgentState:
        """Testing node execution."""
        return self._run_agent_node(state, "testing", self.testing)

    def _documentation_node(self, state: AgentState) -> AgentState:
        """Documentation node execution."""
        return self._run_agent_node(state, "documentation", self.documentation)

    def _deployment_node(self, state: AgentState) -> AgentState:
        """Deployment node execution."""
        return self._run_agent_node(state, "deployment", self.deployment)

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

        self.logger.info(
            "Routing after orchestrator",
            current_phase=current_phase,
            next_agent=next_agent,
            error_count=len(errors),
        )

        # IMPORTANT: Check for completion FIRST, before errors.
        # After deployment, there may be non-fatal errors from earlier agents
        # that should not prevent the workflow from terminating.
        if current_phase == ProjectPhase.COMPLETED.value or current_phase == "completed":
            self.logger.info("Workflow completed, routing to END")
            return "completed"

        if current_phase == ProjectPhase.FAILED.value or current_phase == "failed":
            return "error"

        # Check for errors (only if not completed/failed)
        if errors and len(errors) > 0:
            retry_count = state.get("retry_count", 0)
            max_retries = state.get("max_retries", 3)
            if retry_count >= max_retries:
                return "error"

        # Route to next agent
        if next_agent:
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
            # Run the graph with explicit recursion limit
            config = {"recursion_limit": 50}
            final_state = await self.app.ainvoke(initial_state, config=config)
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
            State updates (dict keyed by node name -> state snapshot)
        """
        self.logger.info(
            "Streaming workflow",
            project_id=initial_state["project_id"],
        )

        try:
            config = {"recursion_limit": 50}
            async for state in self.app.astream(initial_state, config=config):
                yield state
        except Exception as e:
            self.logger.error("Workflow stream error", error=str(e))
            raise

