"""Azure OpenAI client - load credentials and create client for API calls."""

import os
from functools import lru_cache

from dotenv import load_dotenv
from openai import AzureOpenAI

# Load .env from backend directory (same as your setup)
load_dotenv("./.env")


@lru_cache()
def get_azure_openai_client() -> AzureOpenAI:
    """Create and return Azure OpenAI client. Credentials from backend/.env (gitignored)."""
    return AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    )
