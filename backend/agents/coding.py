"""Coding Agent - Generates code based on architecture."""

import json
from datetime import datetime
from typing import Any, Dict

from agents.base import BaseAgent
from core.state import AgentState, CodeArtifact
from utils.logging import get_logger

logger = get_logger(__name__)


class CodingAgent(BaseAgent):
    """Agent that generates code based on architecture and requirements."""

    def __init__(self):
        """Initialize Coding Agent."""
        super().__init__(
            name="coding",
            description="Generates code based on architecture and requirements",
        )

    def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute code generation.

        Args:
            state: Current agent state

        Returns:
            Updated state with generated code artifacts
        """
        self.logger.info(
            "Generating code",
            project_id=state["project_id"],
        )

        architecture = state.get("architecture_design", {})
        requirements = state.get("requirements_analysis", {})

        # Retrieve relevant knowledge
        tech_stack = architecture.get("technology_stack", [])
        framework = tech_stack[0] if tech_stack else None
        knowledge = self.retrieve_knowledge(
            query=f"code generation best practices for {framework or 'general programming'}"
        )

        # Retrieve project memory
        memory = self.retrieve_memory(
            query="code patterns and implementations",
            project_id=state["project_id"],
        )

        # Build prompt
        system_prompt = f"""You are a senior software engineer. Generate production-quality
        code based on the architecture design. Use {framework or 'best practices'}."""
        prompt = f"""
        Generate code for the following project:

        Project: {state['project_name']}
        Architecture: {json.dumps(architecture, indent=2)}
        Requirements: {json.dumps(requirements, indent=2)}

        Best practices:
        {json.dumps([k.get('content', '')[:200] for k in knowledge[:3]], indent=2)}

        Previous code:
        {json.dumps([m.get('content', '')[:200] for m in memory[:2]], indent=2)}

        Generate code files for all system components. Provide a JSON response with:
        - files: List of code files, each with:
          - file_path: Relative file path
          - content: Complete file content
          - language: Programming language
          - description: What this file does
        """

        response_format = {
            "files": [
                {
                    "file_path": "string",
                    "content": "string",
                    "language": "string",
                    "description": "string",
                }
            ]
        }

        try:
            response = self.call_llm(prompt, system_prompt, response_format)
            code_data = self.parse_json_response(response)
            files = code_data.get("files", [])
        except Exception as e:
            self.logger.error("Failed to parse code generation", error=str(e))
            files = []

        # Create code artifacts
        code_artifacts = []
        for file_data in files:
            artifact = {
                "file_path": file_data.get("file_path", ""),
                "content": file_data.get("content", ""),
                "language": file_data.get("language", ""),
                "agent": self.name,
                "timestamp": datetime.utcnow().isoformat(),
            }
            code_artifacts.append(artifact)

            # Store in project memory
            self.store_memory(
                content=file_data.get("content", ""),
                project_id=state["project_id"],
                artifact_type="code",
                metadata={
                    "file_path": file_data.get("file_path", ""),
                    "language": file_data.get("language", ""),
                },
            )

        decision = self.create_decision(
            decision=f"Generated {len(code_artifacts)} code files",
            rationale=f"Created code for {len(architecture.get('system_components', []))} components",
            confidence=0.75,
        )

        existing_artifacts = state.get("code_artifacts", [])
        # Convert existing artifacts to dicts if they're Pydantic models
        existing_dicts = [
            a if isinstance(a, dict) else a.dict() if hasattr(a, "dict") else a
            for a in existing_artifacts
        ]
        return self.update_state(
            state,
            {
                "code_artifacts": existing_dicts + code_artifacts,
                "agent_decisions": state.get("agent_decisions", []) + [decision],
            },
        )

    def get_tools(self) -> list:
        """Get coding tools."""
        return []

