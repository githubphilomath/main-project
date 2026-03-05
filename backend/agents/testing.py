"""Testing Agent - Creates and runs tests."""

import json
from datetime import datetime
from typing import Any, Dict, List

from agents.base import BaseAgent
from core.state import AgentState, TestArtifact
from utils.logging import get_logger

logger = get_logger(__name__)


def _merge_test_artifacts_by_path(
    existing: List[Dict[str, Any]], new: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Merge new test artifacts into existing by file_path. Updates in place, no duplicates."""
    def _path(a: Dict[str, Any]) -> str:
        return (a.get("file_path") or "").replace("\\", "/")

    by_path: Dict[str, Dict[str, Any]] = {}
    for a in existing:
        d = a if isinstance(a, dict) else (a.dict() if hasattr(a, "dict") else a)
        by_path[_path(d)] = dict(d)
    for a in new:
        p = _path(a)
        if p in by_path:
            by_path[p].update(a)
            by_path[p]["timestamp"] = a.get("timestamp", datetime.utcnow().isoformat())
        else:
            by_path[p] = dict(a)
    return list(by_path.values())


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

        system_prompt = (
            "You are a senior test engineer who writes thorough, runnable test suites. "
            "Every test has a clear docstring explaining what it validates. Tests cover "
            "happy paths, edge cases, and error conditions."
        )

        code_previews = []
        for a in code_artifacts[:15]:
            fp = a.get('file_path', '') if isinstance(a, dict) else a.file_path
            content = (a.get('content', '') if isinstance(a, dict) else a.content)[:3000]
            code_previews.append({"path": fp, "content": content})

        func_reqs = requirements.get("functional_requirements", []) if isinstance(requirements, dict) else []

        prompt = f"""
Generate comprehensive tests for this project.

REQUIREMENTS:
{json.dumps(requirements, indent=2)}

CODE FILES:
{json.dumps(code_previews, indent=2)}

INSTRUCTIONS:
1. Create a test file for each code file (e.g., app.py -> test_app.py).
2. Map each functional requirement to at least one test. Requirements:
   {json.dumps(func_reqs[:10], indent=2) if func_reqs else "See requirements above."}
3. Use the Arrange-Act-Assert pattern for every test.
4. Include:
   - UNIT TESTS: Test individual functions/methods in isolation
   - INTEGRATION TESTS: Test components working together
   - EDGE CASE TESTS: Empty input, boundary values, error conditions
5. Each test must have a docstring: "Test that [what] when [condition]."
6. Use the appropriate test framework for the language (pytest for Python,
   Jest/Vitest for JS/TS, unittest for simple Python).
7. When modifying existing tests, use the EXACT same file_path.

Respond with ONLY a JSON object:
{{
  "test_files": [
    {{
      "file_path": "test file path",
      "content": "complete test file content",
      "test_type": "unit|integration|e2e",
      "coverage_estimate": 85.0,
      "description": "what is being tested"
    }}
  ]
}}
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

        existing_tests = state.get("test_artifacts", [])
        merged = _merge_test_artifacts_by_path(existing_tests, test_artifacts)
        avg_coverage = sum(t.get("coverage", 0) or 0 for t in merged) / max(len(merged), 1)
        decision = self.create_decision(
            decision=f"Updated {len(test_artifacts)} test files in place ({len(merged)} total, no duplicates)",
            rationale=f"Edits applied directly to existing paths. Estimated coverage: {avg_coverage:.1f}%",
            confidence=0.75,
        )

        return self.update_state(
            state,
            {
                "test_artifacts": merged,
                "agent_decisions": state.get("agent_decisions", []) + [decision],
            },
        )

    def get_tools(self) -> list:
        """Get testing tools."""
        return []

