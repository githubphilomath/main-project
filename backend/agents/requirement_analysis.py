"""Requirement Analysis Agent - Analyzes user requirements."""

import json
from typing import Any, Dict

from agents.base import BaseAgent
from core.state import AgentState, ProjectPhase
from utils.logging import get_logger

logger = get_logger(__name__)


class RequirementAnalysisAgent(BaseAgent):
    """Agent that analyzes user requirements and creates specifications."""

    def __init__(self):
        """Initialize Requirement Analysis Agent."""
        super().__init__(
            name="requirement_analysis",
            description="Analyzes user requirements and creates detailed specifications",
        )

    def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute requirement analysis.

        Args:
            state: Current agent state

        Returns:
            Updated state with requirements analysis
        """
        self.logger.info(
            "Analyzing requirements",
            project_id=state["project_id"],
            requirements=state["user_requirements"][:100],
        )

        # Retrieve relevant knowledge
        knowledge = self.retrieve_knowledge(
            query=f"requirements analysis best practices for {state['project_description']}"
        )

        # Build prompt
        system_prompt = """You are a senior requirements analyst. Analyze user requirements
        and create a comprehensive requirements specification document."""
        prompt = f"""
        Analyze the following project requirements and create a detailed specification:

        Project Name: {state['project_name']}
        Project Description: {state['project_description']}
        User Requirements: {state['user_requirements']}

        Consider the following best practices:
        {json.dumps([k.get('content', '')[:200] for k in knowledge[:3]], indent=2)}

        Provide a JSON response with:
        - functional_requirements: List of functional requirements
        - non_functional_requirements: List of non-functional requirements
        - user_stories: List of user stories
        - acceptance_criteria: List of acceptance criteria
        - technical_constraints: List of technical constraints
        - assumptions: List of assumptions
        """

        response_format = {
            "functional_requirements": ["string"],
            "non_functional_requirements": ["string"],
            "user_stories": ["string"],
            "acceptance_criteria": ["string"],
            "technical_constraints": ["string"],
            "assumptions": ["string"],
        }

        try:
            response = self.call_llm(prompt, system_prompt, response_format)
            # Parse JSON response
            analysis = json.loads(response)
        except Exception as e:
            self.logger.error("Failed to parse requirements analysis", error=str(e))
            analysis = {
                "functional_requirements": [],
                "non_functional_requirements": [],
                "user_stories": [],
                "acceptance_criteria": [],
                "technical_constraints": [],
                "assumptions": [],
                "error": str(e),
            }

        # Store in project memory
        self.store_memory(
            content=json.dumps(analysis, indent=2),
            project_id=state["project_id"],
            artifact_type="requirements_analysis",
            metadata={"phase": "requirement_analysis"},
        )

        decision = self.create_decision(
            decision="Requirements analyzed and specifications created",
            rationale=f"Created {len(analysis.get('functional_requirements', []))} functional requirements",
            confidence=0.85,
        )

        return self.update_state(
            state,
            {
                "requirements_analysis": analysis,
                "agent_decisions": state.get("agent_decisions", []) + [decision],
            },
        )

    def get_tools(self) -> list:
        """Get requirement analysis tools."""
        return []

