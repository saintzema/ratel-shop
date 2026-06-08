from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "FairPrice API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "changeme_in_production_secret_key_12345"  # Use proper env var in prod
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Database — defaults to SQLite for local dev; set DATABASE_URL env var to PostgreSQL for production
    # Production: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fair_price_ng
    DATABASE_URL: str = "sqlite:///./ratel.db"

    # ─── Qwen / Alibaba Cloud Model Studio (DashScope) ───
    # The ZEMA autopilot agents run on Qwen. International (Singapore) endpoint
    # by default; switch QWEN_BASE_URL to the Beijing endpoint if the console is
    # in the China region.
    DASHSCOPE_API_KEY: str = ""
    QWEN_BASE_URL: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    QWEN_MODEL_REASON: str = "qwen-max"     # negotiation / scoring / planning
    QWEN_MODEL_FAST: str = "qwen-plus"      # cheap classification
    QWEN_MODEL_VISION: str = "qwen-vl-max"  # photo -> listing, KYC doc parsing

    # ─── Alibaba Cloud Object Storage (OSS) ───
    # Stores ingested seller photos, KYC PDFs, and generated receipt PDFs.
    ALIBABA_CLOUD_ACCESS_KEY_ID: str = ""
    ALIBABA_CLOUD_ACCESS_KEY_SECRET: str = ""
    OSS_BUCKET: str = ""
    OSS_ENDPOINT: str = ""  # e.g. https://oss-ap-southeast-1.aliyuncs.com

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

settings = Settings()
