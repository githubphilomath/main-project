"""Configuration module for the Multi-Agent Platform."""

from config.azure_openai import get_azure_openai_client
from config.settings import Settings, get_settings

__all__ = ["Settings", "get_settings", "get_azure_openai_client"]

