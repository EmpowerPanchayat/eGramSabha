from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # --- Service API Keys & Endpoints ---
    # The type hint `str` makes these required settings.
    # Pydantic will raise an error on startup if they are not found.
    
    # Jio STT Service
    JIO_API_KEY: str

    # Hugging Face Services
    HF_TOKEN: str
    STT_MODEL_ENDPOINT: str
    HUGGING_FACE_LLM_ENDPOINT: str
    HF_LLM: str

    # --- Database ---
    MONGODB_URL: str
    DATABASE_NAME: str

    # --- AI Provider Selection ---
    STT_PROVIDER: str = "jio"  # "jio" | "whisper"

    class Config:
        # This tells pydantic to load variables from a .env file
        env_file = ".env"
        env_file_encoding = 'utf-8'

# Create a single, reusable instance of the settings that will be
# imported by other parts of your application.
settings = Settings()