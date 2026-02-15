"""Base RAG class with common functionality."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from config.settings import get_settings
from utils.logging import get_logger

logger = get_logger(__name__)


class BaseRAG(ABC):
    """Base class for RAG implementations."""

    def __init__(self, collection_name: str):
        """Initialize RAG system with ChromaDB."""
        self.settings = get_settings()
        self.collection_name = collection_name
        self.logger = get_logger(f"{__name__}.{self.__class__.__name__}")

        # Initialize ChromaDB client
        # Use PersistentClient for local development (no server needed)
        # For production with ChromaDB server, use HttpClient
        try:
            # Try to use persistent client first (local development)
            self.client = chromadb.PersistentClient(
                path="./chroma_db",  # Local storage path
            )
            self.logger.info("Using ChromaDB PersistentClient (local storage)")
        except Exception as e:
            self.logger.warning(f"Failed to use PersistentClient: {e}, trying HttpClient")
            # Fallback to HTTP client if persistent fails
            self.client = chromadb.HttpClient(
                host=self.settings.chroma_host,
                port=self.settings.chroma_port,
            )
            self.logger.info("Using ChromaDB HttpClient (server mode)")

        # Initialize embeddings
        # Note: Google Generative AI embeddings may use different model names
        # Using text-embedding-004 or models/embedding-001
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=self.settings.gemini_api_key,
        )

        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        self.logger.info(
            "RAG system initialized",
            collection=collection_name,
            host=self.settings.chroma_host,
        )

    @abstractmethod
    def add_document(self, document: str, metadata: Dict[str, Any]) -> str:
        """Add a document to the RAG system."""
        pass

    @abstractmethod
    def query(self, query: str, top_k: int = None) -> List[Dict[str, Any]]:
        """Query the RAG system."""
        pass

    def _generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text. Returns None if embedding fails."""
        try:
            return self.embeddings.embed_query(text)
        except Exception as e:
            self.logger.error("Embedding generation failed", error=str(e))
            return None

    def _format_results(self, results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Format ChromaDB results into standard format."""
        formatted = []
        if "ids" in results and "documents" in results:
            for i, doc_id in enumerate(results["ids"][0]):
                formatted.append(
                    {
                        "id": doc_id,
                        "content": results["documents"][0][i],
                        "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                        "distance": results["distances"][0][i] if results.get("distances") else None,
                    }
                )
        return formatted

