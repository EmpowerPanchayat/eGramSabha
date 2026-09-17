from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # --- Service API Keys & Endpoints ---
    # The type hint `str` makes these required settings.
    # Pydantic will raise an error on startup if they are not found.
    
    # Jio STT Service (required only when STT_PROVIDER=jio)
    JIO_API_KEY: Optional[str] = None

    # Hugging Face Services (legacy — superseded by Vertex AI below, kept
    # optional so a missing/removed key doesn't crash startup)
    HF_TOKEN: Optional[str] = None
    STT_MODEL_ENDPOINT: Optional[str] = None
    HUGGING_FACE_LLM_ENDPOINT: Optional[str] = None
    HF_LLM: Optional[str] = None

    # Vertex AI (LLM: agenda generation, MOM generation, translation).
    # Auth is via Workload Identity (vertex-ai-llm-service, bound to the
    # video-mom-ksa Kubernetes ServiceAccount) — no key file involved.
    GCP_PROJECT_ID: Optional[str] = None
    GCP_LOCATION: str = "asia-south1"
    VERTEX_AI_MODEL: str = "gemini-2.5-flash"

    # --- Database ---
    MONGODB_URL: str
    DATABASE_NAME: str

    # --- AI Provider Selection ---
    STT_PROVIDER: str = "google"  # "jio" | "whisper" | "google"
    GOOGLE_STT_DEFAULT_LANGUAGE_CODE: str = "hi-IN"
    GOOGLE_APPLICATION_CREDENTIALS: str = "/Users/chandrakantchaturvedi/Desktop/service-account.json"
    class Config:
        # This tells pydantic to load variables from a .env file
        env_file = ".env"
        env_file_encoding = 'utf-8'

# Create a single, reusable instance of the settings that will be
# imported by other parts of your application.
settings = Settings()