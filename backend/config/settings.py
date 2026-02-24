"""Application settings and configuration management."""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Azure OpenAI Configuration (chat only) - loaded via config/azure_openai.py with os.getenv fallbacks
    azure_openai_chat_deployment: str = "gpt-4"

    # Gemini Configuration (embeddings only)
    gemini_api_key: str
    embedding_model: str = "models/gemini-embedding-001"

    # Database Configuration
    database_url: str
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # Chroma Configuration
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    chroma_collection_knowledge: str = "knowledge_base"
    chroma_collection_memory: str = "project_memory"
    chroma_collection_version: str = "approval_version"

    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_reload: bool = True

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # Agent Configuration
    max_retries: int = 3
    retry_delay: float = 1.0
    agent_timeout: int = 300

    # RAG Configuration
    rag_top_k: int = 5
    rag_similarity_threshold: float = 0.7

    @property
    def chroma_client_settings(self) -> dict:
        """Get Chroma client settings."""
        return {
            "host": self.chroma_host,
            "port": self.chroma_port,
        }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

