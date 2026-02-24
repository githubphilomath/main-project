"""Testing Agent - Creates and runs tests."""

import json
from datetime import datetime
from typing import Any, Dict

from agents.base import BaseAgent
from core.state import AgentState, TestArtifact
from utils.logging import get_logger

logger = get_logger(__name__)


class TestingAgent(BaseAgent):
    """Agent that creates and runs tests."""

    def __init__(self):
        """Initialize Testing Agent."""
        super().__init__(
            name="testing",
            description="Creates and runs tests for the generated code",
        )

    def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute test generation.

        Args:
            state: Current agent state

        Returns:
            Updated state with test artifacts
        """
        self.logger.info(
            "Generating tests",
            project_id=state["project_id"],
        )

        code_artifacts = state.get("code_artifacts", [])
        requirements = state.get("requirements_analysis", {})

        if not code_artifacts:
            self.logger.warning("No code artifacts to test")
            return state

        # Retrieve relevant knowledge
        knowledge = self.retrieve_knowledge(
            query="test generation best practices and testing patterns"
        )

        # Build prompt
        system_prompt = """You are a senior test engineer. Generate comprehensive
        test suites for the code. Every test file MUST include documentation:
        module docstring, test class docstrings, and docstrings for each test
        method describing what is being tested. Documentation goes with the code."""
        prompt = f"""
        Generate tests for the following code:

        Requirements: {json.dumps(requirements, indent=2)}

        Code Files:
        {json.dumps([{'path': a.get('file_path', '') if isinstance(a, dict) else a.file_path, 'content': (a.get('content', '') if isinstance(a, dict) else a.content)[:500]} for a in code_artifacts], indent=2)}

        Best practices:
        {json.dumps([k.get('content', '')[:200] for k in knowledge[:3]], indent=2)}

        Generate comprehensive test files including:
        - Unit tests
        - Integration tests
        - End-to-end tests (if applicable)

        REQUIRED: Each test file MUST have documentation: module docstring, class
        docstrings, and docstrings for each test describing what it validates.
        Test content must include these docstrings.

        Provide a JSON response with:
        - test_files: List of test files, each with:
          - file_path: Test file path
          - content: Test file content (with docstrings and comments)
          - test_type: unit/integration/e2e
          - coverage_estimate: Estimated coverage percentage
          - description: What is being tested
        """

        response_format = {
            "test_files": [
                {
                    "file_path": "string",
                    "content": "string",
                    "test_type": "string",
                    "coverage_estimate": 0.0,
                    "description": "string",
                }
            ]
        }

        try:
            response = self.call_llm(prompt, system_prompt, response_format)
            test_data = self.parse_json_response(response)
            test_files = test_data.get("test_files", [])
        except Exception as e:
            self.logger.error("Failed to parse test generation", error=str(e))
            if self._is_auth_error(e):
                raise RuntimeError(
                    "Azure OpenAI authentication failed. Check AZURE_OPENAI_API_KEY and "
                    "AZURE_OPENAI_ENDPOINT in backend/.env"
                ) from e
            test_files = []

        # Create test artifacts
        test_artifacts = []
        for test_file in test_files:
            artifact = {
                "file_path": test_file.get("file_path", ""),
                "content": test_file.get("content", ""),
                "test_type": test_file.get("test_type", "unit"),
                "coverage": test_file.get("coverage_estimate"),
                "agent": self.name,
                "timestamp": datetime.utcnow().isoformat(),
            }
            test_artifacts.append(artifact)

            # Store in project memory
            self.store_memory(
                content=test_file.get("content", ""),
                project_id=state["project_id"],
                artifact_type="test",
                metadata={
                    "file_path": test_file.get("file_path", ""),
                    "test_type": test_file.get("test_type", ""),
                },
            )

        avg_coverage = sum(t.get("coverage", 0) or 0 for t in test_artifacts) / max(len(test_artifacts), 1)
        decision = self.create_decision(
            decision=f"Generated {len(test_artifacts)} test files",
            rationale=f"Created tests covering {avg_coverage:.1f}% estimated coverage",
            confidence=0.75,
        )

        existing_tests = state.get("test_artifacts", [])
        # Convert existing tests to dicts if they're Pydantic models
        existing_dicts = [
            t if isinstance(t, dict) else t.dict() if hasattr(t, "dict") else t
            for t in existing_tests
        ]
        return self.update_state(
            state,
            {
                "test_artifacts": existing_dicts + test_artifacts,
                "agent_decisions": state.get("agent_decisions", []) + [decision],
            },
        )

    def get_tools(self) -> list:
        """Get testing tools."""
        return []

