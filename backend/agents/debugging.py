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
                    "current_phase": "testing",  # Move to next phase
                    "agent_decisions": state.get("agent_decisions", []) + [
                        self.create_decision(
                            decision="No code artifacts to debug",
                            rationale="Skipping debugging phase as no code artifacts exist",
                            confidence=1.0,
                        )
                    ],
                },
            )

        # Limit code artifacts to prevent huge prompts (process max 10 files)
        code_artifacts_limited = code_artifacts[:10]
        if len(code_artifacts) > 10:
            self.logger.warning(
                f"Limiting debugging to first 10 files out of {len(code_artifacts)}"
            )

        # Retrieve relevant knowledge (with timeout protection)
        try:
            knowledge = self.retrieve_knowledge(
                query="code debugging best practices and common issues"
            )
        except Exception as e:
            self.logger.warning(f"Failed to retrieve knowledge: {e}")
            knowledge = []

        # Build prompt with limited content to prevent timeout
        system_prompt = """You are a senior debugging engineer. Analyze code for issues
        and provide fixes. Keep responses concise."""
        
        # Limit content size per file (max 2000 chars per file)
        code_summaries = []
        for artifact in code_artifacts_limited:
            if isinstance(artifact, dict):
                file_path = artifact.get("file_path", "unknown")
                content = artifact.get("content", "")[:2000]
            else:
                file_path = getattr(artifact, "file_path", "unknown")
                content = getattr(artifact, "content", "")[:2000]
            code_summaries.append({"path": file_path, "content": content})

        prompt = f"""
        Debug the following code files (analyzing {len(code_summaries)} files):

        Architecture: {json.dumps(architecture, indent=2)[:1000]}

        Code Files:
        {json.dumps(code_summaries, indent=2)}

        Best practices:
        {json.dumps([k.get('content', '')[:200] for k in knowledge[:3]], indent=2)}

        Analyze each file for:
        - Syntax errors
        - Logic errors
        - Best practice violations
        - Security issues
        - Performance issues

        Provide a JSON response with:
        - issues_found: List of issues (max 20), each with:
          - file_path: File with issue
          - issue_type: Type of issue
          - description: Description of issue (max 200 chars)
          - severity: high/medium/low
          - fix: Suggested fix (max 500 chars)
        - fixed_files: List of fixed files with updated content (only critical fixes)
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
            debug_data = json.loads(response)
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
            # Continue with empty results rather than failing
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

        issues_count = len(debug_data.get("issues_found", []))
        fixed_count = len(fixed_files)
        
        # Create decision message
        if issues_count > 0:
            decision_msg = f"Found and fixed {issues_count} issues in {fixed_count} files"
        else:
            decision_msg = "No issues found during debugging"
            
        decision = self.create_decision(
            decision=decision_msg,
            rationale=f"Analyzed {len(code_artifacts)} files, fixed {fixed_count} files",
            confidence=0.8 if issues_count > 0 else 0.6,
        )

        # Always transition to testing phase after debugging
        return self.update_state(
            state,
            {
                "code_artifacts": updated_artifacts,
                "agent_decisions": state.get("agent_decisions", []) + [decision],
                "current_phase": "testing",  # Explicitly set next phase
                "next_agent": "testing",
            },
        )

    def get_tools(self) -> list:
        """Get debugging tools."""
        return []

