from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "FairPrice API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "changeme_in_production_secret_key_12345"  # Use proper env var in prod
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Database — defaults to SQLite for local dev; set DATABASE_URL env var to PostgreSQL for production
    # Production: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fair_price_ng
    DATABASE_URL: str = "sqlite:///./ratel.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()
