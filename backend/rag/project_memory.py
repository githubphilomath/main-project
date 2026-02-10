"""Project Memory RAG for storing agent outputs and decisions."""

import uuid
from datetime import datetime
from typing import Any, Dict, List

from rag.base import BaseRAG
from utils.logging import get_logger

logger = get_logger(__name__)


class ProjectMemoryRAG(BaseRAG):
    """RAG system for storing and retrieving project-specific agent outputs."""

    def __init__(self):
        """Initialize Project Memory RAG."""
        from config.settings import get_settings

        settings = get_settings()
        super().__init__(settings.chroma_collection_memory)
        self.logger = get_logger(__name__)

    def add_document(
        self,
        document: str,
        metadata: Dict[str, Any],
    ) -> str:
        """Add a project memory document.

        Args:
            document: Document content (code, decisions, etc.)
            metadata: Metadata including project_id, agent_name, artifact_type, etc.

        Returns:
            Document ID
        """
        doc_id = str(uuid.uuid4())
        embedding = self._generate_embedding(document)
        if embedding is None:
            self.logger.warning("Skipping add_document due to embedding failure", doc_id=doc_id)
            return ""

        # Add timestamp if not present
        if "timestamp" not in metadata:
            metadata["timestamp"] = datetime.utcnow().isoformat()

        self.collection.add(
            ids=[doc_id],
            embeddings=[embedding],
            documents=[document],
            metadatas=[metadata],
        )

        self.logger.info(
            "Added project memory document",
            doc_id=doc_id,
            project_id=metadata.get("project_id"),
            agent=metadata.get("agent_name"),
            artifact_type=metadata.get("artifact_type"),
        )

        return doc_id

    def query(
        self,
        query: str,
        top_k: int = None,
        project_id: str = None,
        agent_name: str = None,
        artifact_type: str = None,
    ) -> List[Dict[str, Any]]:
        """Query project memory for relevant artifacts.

        Args:
            query: Search query
            top_k: Number of results to return
            project_id: Filter by project ID (optional)
            agent_name: Filter by agent name (optional)
            artifact_type: Filter by artifact type (optional)

        Returns:
            List of relevant project memory documents
        """
        top_k = top_k or self.settings.rag_top_k
        query_embedding = self._generate_embedding(query)
        if query_embedding is None:
            self.logger.warning("Skipping query due to embedding failure", query=query[:100])
            return []

        where = {}
        if project_id:
            where["project_id"] = project_id
        if agent_name:
            where["agent_name"] = agent_name
        if artifact_type:
            where["artifact_type"] = artifact_type

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
            "Project memory query",
            query=query[:100],
            results_count=len(filtered_results),
            project_id=project_id,
        )

        return filtered_results

