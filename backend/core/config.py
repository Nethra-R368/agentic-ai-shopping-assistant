from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"  # backend/.env, wherever the server is started from


class Settings(BaseSettings):
    """Central configuration, read from environment variables or backend/.env.

    Every key is optional so the app always boots:
      - no GEMINI_API_KEY  -> rule-based summaries instead of LLM reasoning
      - no SERPAPI_API_KEY -> AI-suggested products (with Gemini) or the demo catalog
      - no MONGO_URI       -> in-memory database (data resets on restart)
    """

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"
    GEMINI_FALLBACK_MODEL: str = "gemini-2.5-flash"  # used automatically if the main model is overloaded
    SERPAPI_API_KEY: str = ""
    MONGO_URI: str = ""
    MONGO_DB_NAME: str = "aurabuy"

    JWT_SECRET: str = "dev-only-insecure-secret-change-me-in-production"
    JWT_EXPIRE_HOURS: int = 24 * 7

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    CURRENCY: str = "INR"
    SEARCH_COUNTRY: str = "in"
    QUERY_CACHE_TTL_SECONDS: int = 3600
    MAX_IMAGE_BYTES: int = 5 * 1024 * 1024

    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    @property
    def has_gemini(self) -> bool:
        return bool(self.GEMINI_API_KEY) and self.GEMINI_API_KEY not in {"dummy", "your_key"}

    @property
    def has_serpapi(self) -> bool:
        return bool(self.SERPAPI_API_KEY) and self.SERPAPI_API_KEY not in {"your_serpapi_key_here", "your_key"}

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
