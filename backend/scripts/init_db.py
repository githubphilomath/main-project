"""Initialize database tables."""

from sqlalchemy import create_engine

from config.settings import get_settings
from models.database import Base
from utils.logging import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)


def init_database():
    """Initialize database tables."""
    settings = get_settings()
    logger.info("Initializing database", database_url=settings.database_url)

    engine = create_engine(settings.database_url)
    Base.metadata.create_all(engine)

    logger.info("Database initialized successfully")


if __name__ == "__main__":
    init_database()

