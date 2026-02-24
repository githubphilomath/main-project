"""Architecture Agent - Designs system architecture."""

import json
from typing import Any, Dict

from agents.base import BaseAgent
from core.state import AgentState
from utils.logging import get_logger

logger = get_logger(__name__)


class ArchitectureAgent(BaseAgent):
    """Agent that designs system architecture and makes technical decisions."""

    def __init__(self):
        """Initialize Architecture Agent."""
        super().__init__(
            name="architecture",
            description="Designs system architecture and makes technical decisions",
        )

    def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute architecture design.

        Args:
            state: Current agent state

        Returns:
            Updated state with architecture design
        """
        self.logger.info(
            "Designing architecture",
            project_id=state["project_id"],
        )

        requirements = state.get("requirements_analysis", {})

        # Retrieve relevant knowledge
        knowledge = self.retrieve_knowledge(
            query=f"software architecture patterns for {state['project_description']}"
        )

        # Retrieve project memory
        memory = self.retrieve_memory(
            query="architecture decisions",
            project_id=state["project_id"],
        )

        # Build prompt
        system_prompt = """You are a senior software architect. Design a comprehensive
        system architecture based on requirements."""
        prompt = f"""
        Design the system architecture for the following project:

        Project: {state['project_name']}
        Description: {state['project_description']}
        Requirements: {json.dumps(requirements, indent=2)}

        Consider these architecture patterns:
        {json.dumps([k.get('content', '')[:200] for k in knowledge[:3]], indent=2)}

        Previous decisions:
        {json.dumps([m.get('content', '')[:200] for m in memory[:2]], indent=2)}

        Provide a JSON response with:
        - architecture_pattern: Main architecture pattern (e.g., MVC, microservices, etc.)
        - technology_stack: List of technologies and frameworks
        - system_components: List of system components with descriptions
        - data_models: List of data models/entities
        - api_design: API design approach and endpoints
        - database_design: Database schema and design decisions
        - security_considerations: Security measures and considerations
        - scalability_approach: How the system will scale
        """

        response_format = {
            "architecture_pattern": "string",
            "technology_stack": ["string"],
            "system_components": [{"name": "string", "description": "string"}],
            "data_models": [{"name": "string", "fields": ["string"]}],
            "api_design": {"approach": "string", "endpoints": ["string"]},
            "database_design": {"type": "string", "schema": "string"},
            "security_considerations": ["string"],
            "scalability_approach": "string",
        }

        try:
            response = self.call_llm(prompt, system_prompt, response_format)
            design = self.parse_json_response(response)
        except Exception as e:
            self.logger.error("Failed to parse architecture design", error=str(e))
            if self._is_auth_error(e):
                raise RuntimeError(
                    "Azure OpenAI authentication failed. Check AZURE_OPENAI_API_KEY and "
                    "AZURE_OPENAI_ENDPOINT in backend/.env"
                ) from e
            design = {
                "architecture_pattern": "monolithic",
                "technology_stack": [],
                "system_components": [],
                "data_models": [],
                "api_design": {},
                "database_design": {},
                "security_considerations": [],
                "scalability_approach": "",
                "error": str(e),
            }

        # Store in project memory
        self.store_memory(
            content=json.dumps(design, indent=2),
            project_id=state["project_id"],
            artifact_type="architecture_design",
            metadata={"phase": "architecture_design"},
        )

        decision = self.create_decision(
            decision=f"Architecture designed using {design.get('architecture_pattern', 'unknown')} pattern",
            rationale=f"Selected {len(design.get('technology_stack', []))} technologies",
            confidence=0.8,
        )

        return self.update_state(
            state,
            {
                "architecture_design": design,
                "agent_decisions": state.get("agent_decisions", []) + [decision],
            },
        )

    def get_tools(self) -> list:
        """Get architecture tools."""
        return []

