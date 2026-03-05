"""Deployment Agent - Handles deployment configurations."""

import json
from typing import Any, Dict

from agents.base import BaseAgent
from core.state import AgentState
from utils.logging import get_logger

logger = get_logger(__name__)


class DeploymentAgent(BaseAgent):
    """Agent that handles deployment configurations."""

    def __init__(self):
        """Initialize Deployment Agent."""
        super().__init__(
            name="deployment",
            description="Handles deployment configurations and setup",
        )

    def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute deployment configuration.

        Args:
            state: Current agent state

        Returns:
            Updated state with deployment configuration
        """
        self.logger.info(
            "Configuring deployment",
            project_id=state["project_id"],
        )

        architecture = state.get("architecture_design", {})
        code_artifacts = state.get("code_artifacts", [])

        # Retrieve relevant knowledge
        knowledge = self.retrieve_knowledge(
            query="deployment best practices docker kubernetes CI/CD"
        )

        system_prompt = (
            "You are a DevOps engineer who creates deployment configurations that "
            "work on the first try. Your deployment steps are copy-pasteable."
        )

        code_entries = []
        for a in code_artifacts[:10]:
            fp = a.get("file_path", "") if isinstance(a, dict) else getattr(a, "file_path", "")
            code_entries.append(fp)

        tech_stack = architecture.get("technology_stack", [])

        prompt = f"""
Create deployment configuration for this project.

PROJECT: {state['project_name']}
TECH STACK: {json.dumps(tech_stack, indent=2)}
CODE FILES: {json.dumps(code_entries, indent=2)}
ARCHITECTURE: {json.dumps(architecture, indent=2)[:3000]}

INSTRUCTIONS:
1. Identify the entry point from the code files (e.g., index.html, main.py, app.js).
2. Create a Dockerfile with the correct base image, COPY, and CMD for the tech stack.
   CMD must actually run the app (e.g., "python main.py", "node server.js").
   EXPOSE the correct port.
3. Create docker-compose.yml if the app needs multiple services.
4. List ALL environment variables the app needs, with descriptions.
5. Write deployment_steps as exact shell commands a user can copy-paste to run locally:
   Step 1: Clone/download
   Step 2: Install dependencies (exact command)
   Step 3: Run the app (exact command)
   Step 4: Open in browser (exact URL)
6. Include a simple health check.

Respond with ONLY a JSON object:
{{
  "deployment_type": "docker|static|node|python",
  "dockerfile": "complete Dockerfile content with comments",
  "docker_compose": "docker-compose.yml content or empty string",
  "ci_cd_config": "CI/CD config or empty string",
  "env_variables": ["VAR_NAME=description", ...],
  "deployment_steps": ["step 1 command or instruction", "step 2", ...],
  "health_checks": "health check config or description",
  "entry_point": "main file to run (e.g., index.html, main.py)",
  "run_command": "exact command to run locally (e.g., python main.py)"
}}
"""

        response_format = {
            "deployment_type": "string",
            "dockerfile": "string",
            "docker_compose": "string",
            "ci_cd_config": "string",
            "env_variables": ["string"],
            "deployment_steps": ["string"],
            "health_checks": "string",
        }

        try:
            response = self.call_llm(prompt, system_prompt, response_format)
            deployment_config = self.parse_json_response(response)
        except Exception as e:
            self.logger.error("Failed to parse deployment config", error=str(e))
            if self._is_auth_error(e):
                raise RuntimeError(
                    "Azure OpenAI authentication failed. Check AZURE_OPENAI_API_KEY and "
                    "AZURE_OPENAI_ENDPOINT in backend/.env"
                ) from e
            deployment_config = {
                "deployment_type": "docker",
                "dockerfile": "",
                "docker_compose": "",
                "ci_cd_config": "",
                "env_variables": [],
                "deployment_steps": [],
                "health_checks": "",
                "error": str(e),
            }

        # Store in project memory
        self.store_memory(
            content=json.dumps(deployment_config, indent=2),
            project_id=state["project_id"],
            artifact_type="deployment_config",
            metadata={"phase": "deployment"},
        )

        decision = self.create_decision(
            decision=f"Deployment configured for {deployment_config.get('deployment_type', 'unknown')}",
            rationale=f"Created {len(deployment_config.get('deployment_steps', []))} deployment steps",
            confidence=0.8,
        )

        return self.update_state(
            state,
            {
                "deployment_config": deployment_config,
                "agent_decisions": state.get("agent_decisions", []) + [decision],
            },
        )

    def get_tools(self) -> list:
        """Get deployment tools."""
        return []

