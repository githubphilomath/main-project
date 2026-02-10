"""Knowledge Base RAG for framework patterns and best practices."""

import uuid
from typing import Any, Dict, List

from rag.base import BaseRAG
from utils.logging import get_logger

logger = get_logger(__name__)


class KnowledgeBaseRAG(BaseRAG):
    """RAG system for coding best practices and framework knowledge."""

    def __init__(self):
        """Initialize Knowledge Base RAG."""
        from config.settings import get_settings

        settings = get_settings()
        super().__init__(settings.chroma_collection_knowledge)
        self.logger = get_logger(__name__)

    def add_document(
        self,
        document: str,
        metadata: Dict[str, Any],
    ) -> str:
        """Add a knowledge document to the RAG system.

        Args:
            document: Document content
            metadata: Metadata including framework, pattern_type, etc.

        Returns:
            Document ID
        """
        doc_id = str(uuid.uuid4())
        embedding = self._generate_embedding(document)
        if embedding is None:
            self.logger.warning("Skipping add_document due to embedding failure", doc_id=doc_id)
            return ""

        self.collection.add(
            ids=[doc_id],
            embeddings=[embedding],
            documents=[document],
            metadatas=[metadata],
        )

        self.logger.info(
            "Added knowledge document",
            doc_id=doc_id,
            framework=metadata.get("framework"),
            pattern_type=metadata.get("pattern_type"),
        )

        return doc_id

    def query(
        self,
        query: str,
        top_k: int = None,
        framework: str = None,
        pattern_type: str = None,
    ) -> List[Dict[str, Any]]:
        """Query knowledge base for relevant patterns and practices.

        Args:
            query: Search query
            top_k: Number of results to return
            framework: Filter by framework (optional)
            pattern_type: Filter by pattern type (optional)

        Returns:
            List of relevant documents
        """
        top_k = top_k or self.settings.rag_top_k
        query_embedding = self._generate_embedding(query)
        if query_embedding is None:
            self.logger.warning("Skipping query due to embedding failure", query=query[:100])
            return []

        where = {}
        if framework:
            where["framework"] = framework
        if pattern_type:
            where["pattern_type"] = pattern_type

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where if where else None,
        )

        formatted_results = self._format_results(results)

        # Filter by similarity threshold
        filtered_results = [
            r
            for r in formatted_results
            if r["distance"] is None or (1 - r["distance"]) >= self.settings.rag_similarity_threshold
        ]

        self.logger.info(
            "Knowledge base query",
            query=query[:100],
            results_count=len(filtered_results),
            framework=framework,
        )

        return filtered_results

