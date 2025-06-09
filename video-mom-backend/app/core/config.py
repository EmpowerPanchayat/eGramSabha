from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    hf_token: str
    stt_model_endpoint: str
    summarization_model_endpoint: str

    class Config:
        env_file = ".env"

settings = Settings()