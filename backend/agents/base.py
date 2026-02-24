"""Base agent class with common functionality."""

import json
import re
import signal
from abc import ABC, abstractmethod
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from datetime import datetime
from typing import Any, Dict, Optional

from tenacity import retry, stop_after_attempt, wait_exponential

from config.azure_openai import get_azure_openai_client
from config.settings import get_settings
from core.state import AgentState
from rag import ApprovalVersionRAG, KnowledgeBaseRAG, ProjectMemoryRAG
from utils.logging import get_logger

logger = get_logger(__name__)


class BaseAgent(ABC):
    """Base class for all agents with common functionality."""

    def __init__(self, name: str, description: str):
        """Initialize base agent.

        Args:
            name: Agent name
            description: Agent description
        """
        self.name = name
        self.description = description
        self.settings = get_settings()
        self.logger = get_logger(f"agent.{name}")

        # Initialize RAG systems
        self.knowledge_rag = KnowledgeBaseRAG()
        self.memory_rag = ProjectMemoryRAG()
        self.version_rag = ApprovalVersionRAG()

        self.logger.info("Agent initialized", agent_name=name)

    @abstractmethod
    def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute agent logic.

        Args:
            state: Current agent state

        Returns:
            Updated state dictionary
        """
        pass

    @abstractmethod
    def get_tools(self) -> list:
        """Get list of tools available to this agent."""
        pass

    def retrieve_knowledge(self, query: str, framework: str = None) -> list:
        """Retrieve knowledge from knowledge base RAG."""
        return self.knowledge_rag.query(query=query, framework=framework)

    def retrieve_memory(self, query: str, project_id: str = None) -> list:
        """Retrieve project memory."""
        return self.memory_rag.query(query=query, project_id=project_id)

    def retrieve_version_history(self, query: str, project_id: str = None) -> list:
        """Retrieve version history."""
        return self.version_rag.query(query=query, project_id=project_id)

    def store_memory(
        self,
        content: str,
        project_id: str,
        artifact_type: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Store content in project memory."""
        mem_metadata = {
            "project_id": project_id,
            "agent_name": self.name,
            "artifact_type": artifact_type,
            **(metadata or {}),
        }
        return self.memory_rag.add_document(document=content, metadata=mem_metadata)

    def create_decision(
        self,
        decision: str,
        rationale: str,
        confidence: float = 0.8,
    ) -> Dict[str, Any]:
        """Create an agent decision."""
        return {
            "agent_name": self.name,
            "decision": decision,
            "rationale": rationale,
            "confidence": confidence,
            "timestamp": datetime.utcnow().isoformat(),
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    def call_llm(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        response_format: Optional[Dict[str, Any]] = None,
        timeout: Optional[int] = None,
    ) -> str:
        """Call LLM with retry logic and timeout.

        Args:
            prompt: User prompt
            system_prompt: System prompt (optional)
            response_format: Expected response format (optional)
            timeout: Timeout in seconds (uses agent_timeout from settings if not provided)

        Returns:
            LLM response
        """
        timeout_seconds = timeout or self.settings.agent_timeout

        try:
            user_content = prompt
            if response_format:
                user_content += f"\n\nRespond in JSON format: {json.dumps(response_format)}"

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": user_content})

            self.logger.info(
                "Calling LLM",
                agent=self.name,
                prompt_length=len(user_content),
                timeout=timeout_seconds,
            )

            client = get_azure_openai_client()

            def invoke_llm():
                return client.chat.completions.create(
                    model=self.settings.azure_openai_chat_deployment,
                    messages=messages,
                    temperature=0.7,
                )

            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(invoke_llm)
                try:
                    response = future.result(timeout=timeout_seconds)
                except FutureTimeoutError:
                    self.logger.error(
                        f"LLM call timed out after {timeout_seconds} seconds",
                        agent=self.name,
                    )
                    raise TimeoutError(
                        f"LLM call exceeded timeout of {timeout_seconds} seconds"
                    )

            if not response or not response.choices:
                raise ValueError("Empty or invalid LLM response")

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty LLM response content")

            return content

        except Exception as e:
            self.logger.error(
                "LLM call failed",
                error=str(e),
                agent=self.name,
                timeout=timeout_seconds,
            )
            raise

    def _is_auth_error(self, e: Exception) -> bool:
        """Check if exception is an authentication/credential error."""
        err_str = str(e).lower()
        return (
            "401" in err_str
            or "403" in err_str
            or "permissiondenied" in err_str
            or "authentication" in err_str
            or "invalid subscription key" in err_str
            or "api key not valid" in err_str
            or "invalid api key" in err_str
        )

    def parse_json_response(self, text: str) -> Any:
        """Parse a JSON response from the LLM, stripping markdown fences.

        LLMs often wrap JSON in markdown code fences like:
            ```json
            { ... }
            ```
        This helper strips those before parsing.

        Args:
            text: Raw LLM response text

        Returns:
            Parsed JSON object

        Raises:
            json.JSONDecodeError: If parsing fails after all attempts
        """
        if not text:
            raise json.JSONDecodeError("Empty response", "", 0)

        # Attempt 1: Try parsing directly (in case there are no fences)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Attempt 2: Strip markdown code fences  ```json ... ``` or ``` ... ```
        stripped = text.strip()
        fence_pattern = re.compile(
            r"```(?:json|JSON)?\s*\n?(.*?)\n?\s*```",
            re.DOTALL,
        )
        match = fence_pattern.search(stripped)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # Attempt 3: Find the first { ... } or [ ... ] block
        for start_char, end_char in [('{', '}'), ('[', ']')]:
            start = stripped.find(start_char)
            end = stripped.rfind(end_char)
            if start != -1 and end > start:
                try:
                    return json.loads(stripped[start : end + 1])
                except json.JSONDecodeError:
                    pass

        # All attempts failed
        raise json.JSONDecodeError(
            f"Could not extract JSON from LLM response (length={len(text)})",
            text[:200],
            0,
        )

    def update_state(
        self,
        state: AgentState,
        updates: Dict[str, Any],
    ) -> AgentState:
        """Update agent state with new values."""
        updated_state = state.copy()
        updated_state.update(updates)
        updated_state["updated_at"] = datetime.utcnow().isoformat()
        return updated_state

