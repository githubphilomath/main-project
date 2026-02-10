"""Script to populate knowledge base with initial data."""

from rag.knowledge_base import KnowledgeBaseRAG
from utils.logging import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)


def populate_knowledge_base():
    """Populate knowledge base with initial best practices."""
    rag = KnowledgeBaseRAG()

    # Add some initial knowledge documents
    knowledge_docs = [
        {
            "content": """
            FastAPI Best Practices:
            - Use Pydantic models for request/response validation
            - Implement proper error handling with HTTPException
            - Use dependency injection for shared resources
            - Structure routes in separate modules
            - Use async/await for I/O operations
            - Implement proper logging and monitoring
            """,
            "metadata": {
                "framework": "FastAPI",
                "pattern_type": "best_practices",
                "category": "backend",
            },
        },
        {
            "content": """
            Python Code Quality:
            - Follow PEP 8 style guide
            - Use type hints for all functions
            - Write comprehensive docstrings
            - Implement proper error handling
            - Use context managers for resource management
            - Write unit tests for all functions
            """,
            "metadata": {
                "framework": "Python",
                "pattern_type": "code_quality",
                "category": "general",
            },
        },
        {
            "content": """
            REST API Design:
            - Use proper HTTP methods (GET, POST, PUT, DELETE)
            - Follow RESTful naming conventions
            - Use proper status codes
            - Implement pagination for list endpoints
            - Version your API (e.g., /api/v1/)
            - Document your API with OpenAPI/Swagger
            """,
            "metadata": {
                "framework": "REST",
                "pattern_type": "api_design",
                "category": "backend",
            },
        },
    ]

    logger.info("Populating knowledge base", count=len(knowledge_docs))

    for doc in knowledge_docs:
        doc_id = rag.add_document(doc["content"], doc["metadata"])
        logger.info("Added knowledge document", doc_id=doc_id)

    logger.info("Knowledge base populated successfully")


if __name__ == "__main__":
    populate_knowledge_base()

