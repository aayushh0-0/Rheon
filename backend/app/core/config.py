from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "RHEON AI"
    TAGLINE: str = "Predict. Orchestrate. Respond."
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server binding
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return v

    # Database Configuration (SQLite default for MVP)
    DATABASE_URL: str = "sqlite:///./data/rheon.db"

    # Agentic & Claude LLM Configuration
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-7-sonnet-20250219"
    AGENT_MAX_ITERATIONS: int = 5
    AGENT_TIMEOUT_SECONDS: int = 30
    ENABLE_AGENTIC_SYSTEM: bool = True
    RHEON_MAX_TOOL_CALLS: int = 8
    RHEON_MAX_ORCHESTRATION_STEPS: int = 16

    @property
    def is_llm_configured(self) -> bool:
        """Returns True if a non-empty Anthropic API key is configured."""
        return bool(self.ANTHROPIC_API_KEY and self.ANTHROPIC_API_KEY.strip())

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

