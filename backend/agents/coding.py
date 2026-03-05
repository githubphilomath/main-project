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

        system_prompt = f"""You are an expert software engineer and UI designer. Generate complete, production-ready
code based on the architecture design. Use {framework or 'best practices for the chosen stack'}.

Quality standards:
- Every file includes a module-level docstring, class and function docstrings.
- All functions have real implementations. Do not use placeholder comments.
- Include proper error handling with try/except, input validation, and graceful fallbacks.
- For games: include smooth interactions, visual feedback, win/lose states, and restart.
- For CLI tools: include help text and clear output formatting.

Frontend / index.html design quality (follow these carefully):
- The UI should look like a polished SaaS product, not a homework project.
- Use a cohesive color palette: pick 1 primary color (e.g. indigo-600), 1 accent, neutral
  grays for backgrounds/text. Do NOT use raw browser-default colors.
- Typography: use a system font stack or Google Fonts (Inter, Poppins). Set proper font
  sizes (16px base), line-height (1.5), and font-weight hierarchy (700 headings, 400 body).
- Layout: use CSS grid or flexbox with max-width containers, generous padding (1.5-2rem),
  and consistent spacing between sections.
- Components: buttons should have padding (0.5rem 1.25rem), border-radius (0.5rem),
  background color, hover/active states, and smooth transitions (transition: all 0.2s).
- Cards: use subtle box-shadow (0 1px 3px rgba(0,0,0,0.1)), rounded corners, white
  background, and padding.
- Tables: zebra-stripe rows, sticky header, hover highlight, proper cell padding.
- Forms: styled inputs with borders, focus ring, labels above inputs, proper spacing.
- Navigation: sidebar or top nav with active state highlighting, icons if relevant.
- Use CSS variables for the color palette so the whole theme is consistent.
- Add subtle micro-interactions: hover scale on cards, button press effect, fade-in on load.
- The page should have a proper header/hero section with the app name, not jump straight
  into raw data.
"""
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

        existing_code_block = ""
        if existing_code:
            code_previews = []
            for a in existing_code[:15]:
                fp = a.get("file_path", "") if isinstance(a, dict) else getattr(a, "file_path", "")
                content = a.get("content", "") if isinstance(a, dict) else getattr(a, "content", "")
                code_previews.append({"file_path": fp, "content": content[:3000]})
            existing_code_block = (
                f"EXISTING CODE (edit in place — use same file_path, provide FULL updated content):\n"
                f"{json.dumps(code_previews, indent=2)}\n\n"
            )

        file_structure = architecture.get("file_structure", [])
        file_structure_block = ""
        if file_structure:
            file_structure_block = f"PLANNED FILE STRUCTURE (create all of these):\n{json.dumps(file_structure, indent=2)}\n\n"

        prompt = f"""
Generate all code files for this project. The code must be complete and runnable.

PROJECT: {state['project_name']}
ARCHITECTURE: {json.dumps(architecture, indent=2)}
REQUIREMENTS: {json.dumps(requirements, indent=2)}
{mod_prompt}
{existing_code_block}
{file_structure_block}
REFERENCE PATTERNS:
{json.dumps([k.get('content', '')[:300] for k in knowledge[:3]], indent=2)}

Important rules:
1. Every file must be complete. No placeholder comments like "add more" or empty "pass".
2. For ANY web application, you MUST generate a root-level index.html that is the
   COMPLETE, SELF-CONTAINED frontend UI. This is critical — the index.html must work
   by simply opening it in a browser with NO build step, NO bundler, NO npm install.
   All CSS must be in a <style> tag and all JavaScript in a <script> tag inside the
   same HTML file (or in plain .js/.css files loaded via <script src="./app.js">).
   Do NOT use JSX, TypeScript, import/export statements, React.createElement, or any
   syntax that requires transpilation in the index.html or its scripts.
   Use only vanilla HTML, CSS, and JavaScript (ES6 is fine — template literals, arrow
   functions, async/await, fetch, classList, etc. are all supported natively).
3. index.html must use relative paths (href="./styles.css" not "/styles.css") because
   the app is served under a subpath like /preview/xxx/.
4. The index.html CSS must be extensive and high-quality — at least 80-100 lines of CSS.
   Include: a CSS variable color palette (:root section), a styled nav/header bar,
   card components with box-shadow and border-radius, styled buttons with hover/active
   states and transitions, form inputs with focus rings, table styling with zebra rows,
   responsive breakpoints (@media), and subtle animations (fadeIn keyframe on page load).
   Think of it as a real product landing page or dashboard, not a wireframe.
5. JavaScript should handle user interactions, edge cases, and error states.
6. For Python/Node backends: include proper entry point, routing, error handling.
   You may also generate a separate React/Vue/framework-based frontend in a src/ folder
   for production use, but the root index.html must always work standalone without it.
7. Include a comment at the top of the main file explaining how to run the app.
8. When modifying existing code, use the same file_path. Do not create duplicates.
9. The frontend MUST include embedded mock/sample data as a fallback. Wrap every fetch()
   call in a try/catch: if the API call fails (network error, server not running), use
   the hardcoded sample data instead. This ensures the app looks fully functional even
   when the backend is not running. Example pattern:
   async function getProducts() {{
     try {{
       const res = await fetch(API_URL + '/products');
       if (!res.ok) throw new Error('API error');
       return await res.json();
     }} catch (e) {{
       return MOCK_PRODUCTS; // fallback sample data
     }}
   }}
   Define MOCK_PRODUCTS (and similar constants) at the top of the file with 3-5 realistic
   sample items that match the data model.

Respond with ONLY a JSON object:
{{
  "files": [
    {{
      "file_path": "relative/path/to/file",
      "content": "complete file content",
      "language": "html|css|javascript|python|etc",
      "description": "what this file does"
    }}
  ]
}}
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

