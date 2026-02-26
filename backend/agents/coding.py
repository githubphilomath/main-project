"""Coding Agent - Generates code based on architecture."""

import json
from datetime import datetime
from typing import Any, Dict, List

from agents.base import BaseAgent
from core.state import AgentState, CodeArtifact
from utils.logging import get_logger

logger = get_logger(__name__)


def _merge_code_artifacts_by_path(
    existing: List[Dict[str, Any]], new: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Merge new artifacts into existing by file_path. Updates in place, no duplicates."""
    def _path(a: Dict[str, Any]) -> str:
        return (a.get("file_path") or "").replace("\\", "/")

    by_path: Dict[str, Dict[str, Any]] = {}
    for a in existing:
        d = a if isinstance(a, dict) else (a.dict() if hasattr(a, "dict") else a)
        by_path[_path(d)] = dict(d)
    for a in new:
        p = _path(a)
        a_dict = a if isinstance(a, dict) else (a.dict() if hasattr(a, "dict") else a)
        if p in by_path:
            by_path[p]["content"] = a_dict.get("content", "")
            by_path[p]["timestamp"] = a_dict.get("timestamp", datetime.utcnow().isoformat())
            for k in ("language", "description", "agent"):
                if k in a_dict:
                    by_path[p][k] = a_dict[k]
        else:
            by_path[p] = dict(a_dict)
    return list(by_path.values())


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
        code based on the architecture design. Use {framework or 'best practices'}.

        CRITICAL: Documentation is mandatory. Every file, class, and function MUST include
        documentation. Include: (1) module-level docstring at top of each file, (2) class
        docstrings, (3) function/method docstrings with args, returns, and raises where
        applicable, (4) inline comments for non-obvious logic. Never generate code without
        documentation."""
        existing_code = state.get("code_artifacts", [])
        existing_paths = [
            (a.get("file_path") if isinstance(a, dict) else getattr(a, "file_path", ""))
            for a in existing_code
        ] if existing_code else []

        modification_request = state.get("modification_request") or ""
        mod_prompt = (
            f"\n\nUSER MODIFICATION REQUEST (apply these changes to the existing code):\n{modification_request}\n\n"
            if modification_request
            else ""
        )

        existing_paths_block = ""
        if existing_paths:
            paths_preview = ", ".join(p for p in existing_paths[:20] if p)
            if len(existing_paths) > 20:
                paths_preview += f"... and {len(existing_paths) - 20} more"
            existing_paths_block = f"EXISTING FILE PATHS (edit in place—use same path, provide full updated content): {paths_preview}\n\n"

        prompt = f"""
        Generate code for the following project:

        Project: {state['project_name']}
        Architecture: {json.dumps(architecture, indent=2)}
        Requirements: {json.dumps(requirements, indent=2)}
        {mod_prompt}
        {existing_paths_block}
        Best practices:
        {json.dumps([k.get('content', '')[:200] for k in knowledge[:3]], indent=2)}

        Previous code:
        {json.dumps([m.get('content', '')[:200] for m in memory[:2]], indent=2)}

        Generate code files for all system components. Provide a JSON response with:
        - files: List of code files, each with:
          - file_path: Relative file path (must match existing paths exactly when modifying)
          - content: Complete file content (MUST include docstrings and comments)
          - language: Programming language
          - description: What this file does

        CRITICAL: Edit files IN PLACE. When modifying existing code, use the SAME file_path
        as the existing file—your content will replace it. Do NOT create duplicates (e.g.
        index_2.html). One artifact per file path; changes overwrite the existing content.

        CRITICAL FOR WEB APPLICATIONS: You MUST include index.html as the main entry point.
        - For web apps: index.html at root, plus CSS/JS. The app must be runnable in a browser.
        - For full-stack: index.html frontend + backend (app.py, server.js, etc.) with clear entry points.
        - index.html should be complete and functional - users will preview the entire app from it.
        PREVIEW COMPATIBILITY: index.html is served under a subpath like /preview/xxx/. Use RELATIVE paths
        for all scripts and styles: href="./static/styles.css" and src="./static/bundle.js" (NOT
        /static/...). Reference only files that actually exist in your artifacts. "Unexpected token '<'"
        means a JS file returned HTML (404 page)—fix by ensuring script src paths point to real files.

        REQUIRED: Every code file MUST have documentation: module docstring, class and
        function docstrings, and comments for complex logic. Documentation goes with the code.
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
            if self._is_auth_error(e):
                raise RuntimeError(
                    "Azure OpenAI authentication failed. Check AZURE_OPENAI_API_KEY and "
                    "AZURE_OPENAI_ENDPOINT in backend/.env"
                ) from e
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

        existing_artifacts = state.get("code_artifacts", [])
        merged = _merge_code_artifacts_by_path(existing_artifacts, code_artifacts)
        decision = self.create_decision(
            decision=f"Updated {len(code_artifacts)} code files in place ({len(merged)} total, no duplicates)",
            rationale="Edits applied directly to existing file paths; new files added only for new paths.",
            confidence=0.75,
        )

        return self.update_state(
            state,
            {
                "code_artifacts": merged,
                "agent_decisions": state.get("agent_decisions", []) + [decision],
            },
        )

    def get_tools(self) -> list:
        """Get coding tools."""
        return []

