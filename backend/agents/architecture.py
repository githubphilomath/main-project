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

        system_prompt = (
            "You are a senior software architect. Create precise, well-structured "
            "designs so developers can produce correct code on the first attempt. "
            "Pick the simplest architecture that meets the requirements."
        )
        prompt = f"""
Design the system architecture for this project.

PROJECT: {state['project_name']}
DESCRIPTION: {state['project_description']}
REQUIREMENTS: {json.dumps(requirements, indent=2)}

REFERENCE PATTERNS:
{json.dumps([k.get('content', '')[:300] for k in knowledge[:3]], indent=2)}

PREVIOUS DECISIONS:
{json.dumps([m.get('content', '')[:300] for m in memory[:2]], indent=2)}

INSTRUCTIONS — be concrete and implementation-ready:

1. ARCHITECTURE PATTERN: Pick the simplest pattern that fits (e.g., "single-page app"
   for a browser game, "MVC" for a CRUD app). Justify in one sentence.

2. TECHNOLOGY STACK: List every technology, language, framework, and library needed.
   Be specific: "Python 3.11 + Flask 3.x" not just "Python". Include CSS framework
   if there is a UI (e.g., Tailwind CSS, Bootstrap 5).

3. SYSTEM COMPONENTS: For each component provide:
   - name: Clear identifier (e.g., "GameEngine", "APIRouter")
   - responsibility: What it does (1-2 sentences)
   - interfaces: Public methods/endpoints it exposes
   - dependencies: Other components it depends on

4. DATA MODELS: For each model provide:
   - name: Model name
   - fields: List of "field_name: type" with constraints (e.g., "score: int >= 0")
   - relationships: How it relates to other models

5. API DESIGN: If the project has a backend API:
   - approach: REST / GraphQL / WebSocket
   - endpoints: List concrete endpoints as "METHOD /path — description"

6. FILE STRUCTURE: Provide the exact file tree the coding agent should create.
   Example: ["index.html", "styles.css", "app.js", "backend/server.js", "README.md"]
   IMPORTANT: The file structure MUST include an index.html at the root level that
   serves as the frontend UI. Every project needs a visual, interactive frontend —
   even if the app is primarily a backend API. The index.html should contain a complete
   single-page application UI with embedded or linked CSS and JavaScript that interacts
   with the backend API via fetch() calls.

7. SECURITY: Input validation, sanitization, authentication needs.

8. SCALABILITY: Brief note on how to scale if needed.

Respond with ONLY a JSON object:
{{
  "architecture_pattern": "string",
  "technology_stack": ["string", ...],
  "system_components": [{{"name":"string","responsibility":"string","interfaces":["string"],"dependencies":["string"]}}],
  "data_models": [{{"name":"string","fields":["string"],"relationships":["string"]}}],
  "api_design": {{"approach":"string","endpoints":["string"]}},
  "file_structure": ["string", ...],
  "database_design": {{"type":"string","schema":"string"}},
  "security_considerations": ["string", ...],
  "scalability_approach": "string"
}}
"""

        response_format = {
            "architecture_pattern": "string",
            "technology_stack": ["string"],
            "system_components": [{"name": "string", "responsibility": "string", "interfaces": ["string"], "dependencies": ["string"]}],
            "data_models": [{"name": "string", "fields": ["string"], "relationships": ["string"]}],
            "api_design": {"approach": "string", "endpoints": ["string"]},
            "file_structure": ["string"],
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

