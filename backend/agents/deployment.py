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

        # Build prompt
        system_prompt = """You are a DevOps engineer. Create deployment configurations
        for the project."""
        prompt = f"""
        Create deployment configuration for the following project:

        Project: {state['project_name']}
        Architecture: {json.dumps(architecture, indent=2)}
        Code Files: {len(code_artifacts)} files
        Technologies: {json.dumps(architecture.get('technology_stack', []), indent=2)}

        Best practices:
        {json.dumps([k.get('content', '')[:200] for k in knowledge[:3]], indent=2)}

        Generate deployment configuration including:
        - Docker configuration (Dockerfile, docker-compose.yml)
        - CI/CD pipeline configuration
        - Environment variables
        - Deployment instructions

        Provide a JSON response with:
        - deployment_type: Type of deployment (docker/kubernetes/etc.)
        - dockerfile: Dockerfile content
        - docker_compose: docker-compose.yml content (if applicable)
        - ci_cd_config: CI/CD pipeline configuration
        - env_variables: List of required environment variables
        - deployment_steps: List of deployment steps
        - health_checks: Health check configuration
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
            deployment_config = json.loads(response)
        except Exception as e:
            self.logger.error("Failed to parse deployment config", error=str(e))
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

