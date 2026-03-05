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

        system_prompt = (
            "You are a senior requirements analyst. Create exhaustive, unambiguous "
            "specifications that developers can implement without clarifying questions. "
            "Be thorough so the first version of the software is production-ready."
        )
        prompt = f"""
Analyze this project and produce a COMPLETE requirements specification.

PROJECT: {state['project_name']}
DESCRIPTION: {state['project_description']}
RAW REQUIREMENTS: {state['user_requirements']}

REFERENCE PATTERNS:
{json.dumps([k.get('content', '')[:300] for k in knowledge[:3]], indent=2)}

INSTRUCTIONS — be exhaustive:
1. FUNCTIONAL REQUIREMENTS: List every discrete capability the system must have.
   Write each as a testable statement: "The system shall [verb] [object] [condition]."
   Include edge cases (empty states, error states, boundary values).
   Aim for at least 8-15 requirements even for simple projects.

2. NON-FUNCTIONAL REQUIREMENTS: Cover performance (response times, concurrency),
   security (input validation, XSS/CSRF for web apps), accessibility (keyboard
   navigation, contrast ratios), reliability, and usability. At least 5 items.

3. USER STORIES: Use the format "As a [role], I want [goal] so that [benefit]."
   Cover the primary user journey end-to-end plus at least 2 alternate/edge-case
   flows. Minimum 5 stories.

4. ACCEPTANCE CRITERIA: For each user story, write at least 2 criteria in
   Given/When/Then format. These must be specific and measurable.

5. TECHNICAL CONSTRAINTS: Recommend a concrete technology stack with rationale.
   Specify language, framework, libraries, and runtime. Consider the project
   description to pick the most appropriate stack.

6. ASSUMPTIONS: List what you are assuming about the user's intent, deployment
   environment, and scope boundaries.

7. UI/UX GUIDELINES (if the project has a user interface): Describe layout,
   color scheme, typography, responsive behavior, and key interactions. Be
   specific enough that a developer can implement without a designer.

Respond with ONLY a JSON object (no markdown fences):
{{
  "functional_requirements": ["string", ...],
  "non_functional_requirements": ["string", ...],
  "user_stories": ["string", ...],
  "acceptance_criteria": ["string", ...],
  "technical_constraints": ["string", ...],
  "assumptions": ["string", ...],
  "ui_ux_guidelines": ["string", ...]
}}
"""

        response_format = {
            "functional_requirements": ["string"],
            "non_functional_requirements": ["string"],
            "user_stories": ["string"],
            "acceptance_criteria": ["string"],
            "technical_constraints": ["string"],
            "assumptions": ["string"],
            "ui_ux_guidelines": ["string"],
        }

        try:
            response = self.call_llm(prompt, system_prompt, response_format)
            # Parse JSON response
            analysis = self.parse_json_response(response)
        except Exception as e:
            self.logger.error("Failed to parse requirements analysis", error=str(e))
            if self._is_auth_error(e):
                raise RuntimeError(
                    "Azure OpenAI authentication failed. Check AZURE_OPENAI_API_KEY and "
                    "AZURE_OPENAI_ENDPOINT in backend/.env"
                ) from e
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

