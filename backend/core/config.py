from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Centralized configuration management for the backend.
    Reads from .env file or environment variables.
    """
    GEMINI_API_KEY: str
    MONGO_URI: str = "mongodb://localhost:27017"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

# Instantiate the settings so it can be imported anywhere
try:
    settings = Settings()
except Exception as e:
    print(f"CRITICAL CONFIG ERROR: Ensure you have a .env file with GEMINI_API_KEY. Details: {e}")
    # Provide dummy settings to prevent crash during imports if .env is missing
    settings = Settings(GEMINI_API_KEY="dummy", MONGO_URI="mongodb://localhost:27017")
