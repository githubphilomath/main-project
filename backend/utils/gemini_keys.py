"""Gemini API key rotation utilities."""

from itertools import cycle
from threading import Lock
from typing import List, Optional

from config.settings import get_settings
from utils.logging import get_logger

logger = get_logger(__name__)


class GeminiKeyManager:
    """Thread-safe round-robin manager for Gemini API keys."""

    _lock = Lock()
    _keys: List[str] = []
    _key_cycle: Optional[cycle] = None
    _initialized = False

    @classmethod
    def _initialize(cls) -> None:
        if cls._initialized:
            return

        settings = get_settings()
        cls._keys = settings.gemini_api_keys_list
        cls._key_cycle = cycle(cls._keys)
        cls._initialized = True
        logger.info("Initialized Gemini key manager", key_count=len(cls._keys))

    @classmethod
    def get_next_key(cls) -> str:
        """Return next Gemini API key in round-robin order."""
        with cls._lock:
            cls._initialize()
            if not cls._key_cycle:
                raise ValueError("Gemini key cycle is not initialized")
            return next(cls._key_cycle)

    @classmethod
    def key_count(cls) -> int:
        """Return number of available Gemini API keys."""
        with cls._lock:
            cls._initialize()
            return len(cls._keys)
