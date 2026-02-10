"""Base agent class with common functionality."""

import json
import signal
from abc import ABC, abstractmethod
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from datetime import datetime
from typing import Any, Dict, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from tenacity import retry, stop_after_attempt, wait_exponential

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

        # Initialize LLM with timeout
        self.llm = ChatGoogleGenerativeAI(
            model=self.settings.gemini_model,
            google_api_key=self.settings.gemini_api_key,
            temperature=0.7,
            timeout=self.settings.agent_timeout,  # Add timeout
        )

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
            full_prompt = prompt
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n{prompt}"

            if response_format:
                full_prompt += f"\n\nRespond in JSON format: {json.dumps(response_format)}"

            self.logger.info(
                "Calling LLM",
                agent=self.name,
                prompt_length=len(full_prompt),
                timeout=timeout_seconds,
            )

            # Use invoke with timeout handling via ThreadPoolExecutor
            def invoke_llm():
                return self.llm.invoke(full_prompt)
            
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
            
            if not response or not hasattr(response, 'content'):
                raise ValueError("Empty or invalid LLM response")
                
            return response.content

        except Exception as e:
            self.logger.error(
                "LLM call failed",
                error=str(e),
                agent=self.name,
                timeout=timeout_seconds,
            )
            raise

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

