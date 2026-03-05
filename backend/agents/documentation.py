"""Documentation Agent - Generates documentation."""

import json
from datetime import datetime
from typing import Any, Dict

from agents.base import BaseAgent
from core.state import AgentState, DocumentationArtifact
from utils.logging import get_logger

logger = get_logger(__name__)


class DocumentationAgent(BaseAgent):
    """Agent that generates project documentation."""

    def __init__(self):
        """Initialize Documentation Agent."""
        super().__init__(
            name="documentation",
            description="Generates comprehensive project documentation",
        )

    def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute documentation generation.

        Args:
            state: Current agent state

        Returns:
            Updated state with documentation artifacts
        """
        self.logger.info(
            "Generating documentation",
            project_id=state["project_id"],
        )

        architecture = state.get("architecture_design", {})
        requirements = state.get("requirements_analysis", {})
        code_artifacts = state.get("code_artifacts", [])

        # Retrieve relevant knowledge
        knowledge = self.retrieve_knowledge(
            query="documentation best practices and standards"
        )

        system_prompt = (
            "You are a technical writer who creates documentation so clear that any "
            "developer can set up, run, and understand the project in under 5 minutes. "
            "Your README files are the gold standard."
        )

        code_summaries = []
        for a in code_artifacts[:15]:
            fp = a.get("file_path", "") if isinstance(a, dict) else getattr(a, "file_path", "")
            content = a.get("content", "") if isinstance(a, dict) else getattr(a, "content", "")
            code_summaries.append({"file_path": fp, "content": content[:2000]})

        deployment = state.get("deployment_config", {}) or {}
        deploy_steps = deployment.get("deployment_steps", [])
        env_vars = deployment.get("env_variables", [])

        prompt = f"""
Generate comprehensive documentation for this project.

PROJECT: {state['project_name']}
DESCRIPTION: {state['project_description']}
REQUIREMENTS: {json.dumps(requirements, indent=2)}
ARCHITECTURE: {json.dumps(architecture, indent=2)}

CODE FILES ({len(code_artifacts)} total):
{json.dumps(code_summaries, indent=2)}

DEPLOYMENT INFO:
- Steps: {json.dumps(deploy_steps, indent=2)}
- Env vars: {json.dumps(env_vars, indent=2)}

GENERATE THESE DOCUMENTS:

1. README (doc_type: "README"):
   - Project title and one-line description
   - Features list with brief descriptions
   - Prerequisites (language runtime, dependencies)
   - Installation: exact commands to clone, install deps, and run
   - Usage: how to use the app with examples
   - Project structure: file tree with descriptions
   - Configuration: environment variables, settings
   - Screenshots/demo description (describe what the user will see)
   - License placeholder

2. ARCHITECTURE (doc_type: "ARCHITECTURE"):
   - High-level overview diagram (ASCII art)
   - Component descriptions with responsibilities
   - Data flow between components
   - Technology choices and rationale
   - Key design decisions

3. API_DOCS (doc_type: "API_DOCS"):
   - If the project has API endpoints: document each with method, path,
     request body, response, and example curl commands
   - If no API: document the public interfaces/functions with params and return values

Respond with ONLY a JSON object:
{{
  "docs": [
    {{"doc_type": "README", "content": "full markdown content", "description": "what this covers"}},
    {{"doc_type": "ARCHITECTURE", "content": "full markdown content", "description": "what this covers"}},
    {{"doc_type": "API_DOCS", "content": "full markdown content", "description": "what this covers"}}
  ]
}}
"""

        response_format = {
            "docs": [
                {
                    "doc_type": "string",
                    "content": "string",
                    "description": "string",
                }
            ]
        }

        try:
            response = self.call_llm(prompt, system_prompt, response_format)
            doc_data = self.parse_json_response(response)
            docs = doc_data.get("docs", [])
        except Exception as e:
            self.logger.error("Failed to parse documentation", error=str(e))
            if self._is_auth_error(e):
                raise RuntimeError(
                    "Azure OpenAI authentication failed. Check AZURE_OPENAI_API_KEY and "
                    "AZURE_OPENAI_ENDPOINT in backend/.env"
                ) from e
            docs = []

        # Create documentation artifacts
        doc_artifacts = []
        for doc in docs:
            artifact = {
                "doc_type": doc.get("doc_type", ""),
                "content": doc.get("content", ""),
                "agent": self.name,
                "timestamp": datetime.utcnow().isoformat(),
            }
            doc_artifacts.append(artifact)

            # Store in project memory
            self.store_memory(
                content=doc.get("content", ""),
                project_id=state["project_id"],
                artifact_type="documentation",
                metadata={"doc_type": doc.get("doc_type", "")},
            )

        doc_types = [d.get("doc_type", "") for d in doc_artifacts]
        decision = self.create_decision(
            decision=f"Generated {len(doc_artifacts)} documentation files",
            rationale=f"Created docs: {', '.join(doc_types)}",
            confidence=0.85,
        )

        existing_docs = state.get("documentation_artifacts", [])
        # Convert existing docs to dicts if they're Pydantic models
        existing_dicts = [
            d if isinstance(d, dict) else d.dict() if hasattr(d, "dict") else d
            for d in existing_docs
        ]
        return self.update_state(
            state,
            {
                "documentation_artifacts": existing_dicts + doc_artifacts,
                "agent_decisions": state.get("agent_decisions", []) + [decision],
            },
        )

    def get_tools(self) -> list:
        """Get documentation tools."""
        return []

