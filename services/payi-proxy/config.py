"""
Configuration for Pay-i Proxy Service
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Pay-i Configuration
    payi_api_key: str = ""
    payi_base_url: str = "https://api.pay-i.com"

    # AI Provider Configuration
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""

    # Service Configuration
    service_name: str = "trailblazer-payi-proxy"
    environment: str = "development"
    debug: bool = False

    # Use Case Configuration
    default_use_case: str = "trail_analysis"
    use_case_version: int = 2

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
