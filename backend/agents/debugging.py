"""Debugging Agent - Identifies and fixes code issues."""

import json
from typing import Any, Dict

from agents.base import BaseAgent
from core.state import AgentState
from utils.logging import get_logger

logger = get_logger(__name__)


class DebuggingAgent(BaseAgent):
    """Agent that identifies and fixes code issues."""

    def __init__(self):
        """Initialize Debugging Agent."""
        super().__init__(
            name="debugging",
            description="Identifies and fixes code issues and bugs",
        )

    def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute debugging process.

        Args:
            state: Current agent state

        Returns:
            Updated state with fixed code
        """
        self.logger.info(
            "Debugging code",
            project_id=state["project_id"],
        )

        code_artifacts = state.get("code_artifacts", [])
        architecture = state.get("architecture_design", {})

        if not code_artifacts:
            self.logger.warning("No code artifacts to debug")
            return self.update_state(
                state,
                {
                    "agent_decisions": state.get("agent_decisions", []) + [
                        self.create_decision(
                            decision="No code artifacts to debug",
                            rationale="Skipping debugging phase as no code artifacts exist",
                            confidence=1.0,
                        )
                    ],
                },
            )

        code_artifacts_limited = code_artifacts[:15]
        if len(code_artifacts) > 15:
            self.logger.warning(
                f"Limiting debugging to first 15 files out of {len(code_artifacts)}"
            )

        try:
            knowledge = self.retrieve_knowledge(
                query="code debugging best practices and common issues"
            )
        except Exception as e:
            self.logger.warning(f"Failed to retrieve knowledge: {e}")
            knowledge = []

        system_prompt = (
            "You are an expert debugger. Find and fix code issues. For every issue "
            "found, return the complete fixed file in fixed_files. Do not just report "
            "issues — fix them. Preserve all docstrings and comments."
        )

        code_summaries = []
        for artifact in code_artifacts_limited:
            if isinstance(artifact, dict):
                file_path = artifact.get("file_path", "unknown")
                content = artifact.get("content", "")[:5000]
            else:
                file_path = getattr(artifact, "file_path", "unknown")
                content = getattr(artifact, "content", "")[:5000]
            code_summaries.append({"path": file_path, "content": content})

        prompt = f"""
Debug these {len(code_summaries)} code files. Find AND fix all issues.

ARCHITECTURE: {json.dumps(architecture, indent=2)[:2000]}

CODE FILES:
{json.dumps(code_summaries, indent=2)}

ANALYZE EACH FILE FOR (in priority order):
1. SYNTAX ERRORS — missing brackets, typos, invalid syntax
2. RUNTIME ERRORS — null references, type errors, missing imports
3. LOGIC ERRORS — off-by-one, wrong conditions, infinite loops
4. SECURITY — XSS, injection, unvalidated input
5. MISSING ERROR HANDLING — uncaught exceptions, missing validation
6. WEB APP ISSUES — broken links between files, incorrect paths, missing assets

CRITICAL: For EVERY issue you find (especially high severity), return the
COMPLETE fixed file content in fixed_files. Do not truncate. The fixed file
replaces the original entirely.

Respond with ONLY a JSON object:
{{
  "issues_found": [
    {{
      "file_path": "string",
      "issue_type": "syntax|runtime|logic|security|error_handling|web",
      "description": "clear description",
      "severity": "high|medium|low",
      "fix": "what was changed"
    }}
  ],
  "fixed_files": [
    {{"file_path": "string", "content": "COMPLETE fixed file content"}}
  ]
}}
"""

        response_format = {
            "issues_found": [
                {
                    "file_path": "string",
                    "issue_type": "string",
                    "description": "string",
                    "severity": "string",
                    "fix": "string",
                }
            ],
            "fixed_files": [
                {"file_path": "string", "content": "string"}
            ],
        }

        try:
            # Call LLM with shorter timeout for debugging (60 seconds)
            response = self.call_llm(
                prompt, system_prompt, response_format, timeout=60
            )
            debug_data = self.parse_json_response(response)
            self.logger.info(
                f"Debugging completed: found {len(debug_data.get('issues_found', []))} issues, "
                f"fixed {len(debug_data.get('fixed_files', []))} files"
            )
        except Exception as e:
            self.logger.error(
                "Failed to get debugging results from LLM",
                error=str(e),
                project_id=state["project_id"],
            )
            if self._is_auth_error(e):
                raise RuntimeError(
                    "Azure OpenAI authentication failed. Check AZURE_OPENAI_API_KEY and "
                    "AZURE_OPENAI_ENDPOINT in backend/.env"
                ) from e
            debug_data = {"issues_found": [], "fixed_files": []}

        # Update code artifacts with fixes
        fixed_files = {f["file_path"]: f["content"] for f in debug_data.get("fixed_files", [])}
        updated_artifacts = []
        stored_fix_count = 0
        max_fix_memories = 10
        for artifact in code_artifacts:
            # Convert to dict if needed
            if not isinstance(artifact, dict):
                artifact = artifact.dict() if hasattr(artifact, "dict") else artifact
            
            file_path = artifact.get("file_path") if isinstance(artifact, dict) else getattr(artifact, "file_path", "")
            if file_path in fixed_files:
                # Update artifact with fixed content
                if isinstance(artifact, dict):
                    artifact["content"] = fixed_files[file_path]
                else:
                    artifact.content = fixed_files[file_path]
            updated_artifacts.append(artifact)
            # Store fix in memory only for fixed files (limit to avoid slowdowns)
            if file_path in fixed_files and stored_fix_count < max_fix_memories:
                self.store_memory(
                    content=f"Fixed: {file_path}\n{json.dumps(debug_data.get('issues_found', []), indent=2)}",
                    project_id=state["project_id"],
                    artifact_type="debug_fix",
                    metadata={"file_path": file_path},
                )
                stored_fix_count += 1

        issues = debug_data.get("issues_found", [])
        issues_count = len(issues)
        fixed_count = len(fixed_files)

        if issues_count > 0:
            issue_lines = []
            for iss in issues:
                sev = iss.get("severity", "?").upper()
                fp = iss.get("file_path", "?")
                desc = iss.get("description", "")
                fix = iss.get("fix", "")
                issue_lines.append(f"[{sev}] {fp}: {desc} → {fix}")
            decision_msg = (
                f"Found and fixed {issues_count} issues in {fixed_count} files:\n"
                + "\n".join(issue_lines)
            )
        else:
            decision_msg = "No issues found during debugging"

        decision = self.create_decision(
            decision=decision_msg,
            rationale=f"Analyzed {len(code_artifacts)} files, fixed {fixed_count} files",
            confidence=0.8 if issues_count > 0 else 0.6,
        )

        return self.update_state(
            state,
            {
                "code_artifacts": updated_artifacts,
                "agent_decisions": state.get("agent_decisions", []) + [decision],
                "debug_issues": issues,
            },
        )

    def get_tools(self) -> list:
        """Get debugging tools."""
        return []

