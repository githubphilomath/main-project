"""Approval/Version RAG for tracking project evolution."""

import uuid
from datetime import datetime
from typing import Any, Dict, List

from rag.base import BaseRAG
from utils.logging import get_logger

logger = get_logger(__name__)


class ApprovalVersionRAG(BaseRAG):
    """RAG system for tracking project versions and approvals."""

    def __init__(self):
        """Initialize Approval/Version RAG."""
        from config.settings import get_settings

        settings = get_settings()
        super().__init__(settings.chroma_collection_version)
        self.logger = get_logger(__name__)

    def add_document(
        self,
        document: str,
        metadata: Dict[str, Any],
    ) -> str:
        """Add a version/approval document.

        Args:
            document: Version description or approval notes
            metadata: Metadata including project_id, version, approval_status, etc.

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
            "Added version document",
            doc_id=doc_id,
            project_id=metadata.get("project_id"),
            version=metadata.get("version"),
            approval_status=metadata.get("approval_status"),
        )

        return doc_id

    def query(
        self,
        query: str,
        top_k: int = None,
        project_id: str = None,
        version: str = None,
        approval_status: str = None,
    ) -> List[Dict[str, Any]]:
        """Query version history for relevant information.

        Args:
            query: Search query
            top_k: Number of results to return
            project_id: Filter by project ID (optional)
            version: Filter by version (optional)
            approval_status: Filter by approval status (optional)

        Returns:
            List of relevant version documents
        """
        top_k = top_k or self.settings.rag_top_k
        query_embedding = self._generate_embedding(query)
        if query_embedding is None:
            self.logger.warning("Skipping query due to embedding failure", query=query[:100])
            return []

        where = {}
        if project_id:
            where["project_id"] = project_id
        if version:
            where["version"] = version
        if approval_status:
            where["approval_status"] = approval_status

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
            "Version query",
            query=query[:100],
            results_count=len(filtered_results),
            project_id=project_id,
        )

        return filtered_results

