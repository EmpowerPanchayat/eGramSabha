from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    hf_token: str
    stt_model_name: str
    summarization_model_name: str

    # Jio Translate API settings
    jio_api_key: str = ""

    # Translation settings
    translation_max_retries: int = 3
    translation_retry_delay: int = 2
    translation_rate_limit_delay: int = 5
    translation_timeout: int = 30

    class Config:
        env_file = ".env"

settings = Settings()