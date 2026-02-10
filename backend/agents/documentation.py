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

        # Build prompt
        system_prompt = """You are a technical writer. Generate comprehensive
        documentation for the project."""
        prompt = f"""
        Generate documentation for the following project:

        Project: {state['project_name']}
        Description: {state['project_description']}
        Requirements: {json.dumps(requirements, indent=2)}
        Architecture: {json.dumps(architecture, indent=2)}
        Code Files: {len(code_artifacts)} files

        Best practices:
        {json.dumps([k.get('content', '')[:200] for k in knowledge[:3]], indent=2)}

        Generate the following documentation:
        1. README.md - Project overview, setup, usage
        2. ARCHITECTURE.md - System architecture documentation
        3. API_DOCS.md - API documentation (if applicable)

        Provide a JSON response with:
        - docs: List of documentation files, each with:
          - doc_type: README/ARCHITECTURE/API_DOCS
          - content: Documentation content
          - description: What this doc covers
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
            doc_data = json.loads(response)
            docs = doc_data.get("docs", [])
        except Exception as e:
            self.logger.error("Failed to parse documentation", error=str(e))
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

