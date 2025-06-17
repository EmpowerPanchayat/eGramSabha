from typing import List
import requests
import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class STTTranscriber:
    """HuggingFace Whisper STT Transcriber"""
    
    def __init__(self):
        self.api_key = settings.HF_TOKEN
        self.endpoint = settings.STT_MODEL_ENDPOINT
        logger.info(f"STT Transcriber initialized: {bool(self.api_key)}")
    
    def transcribe_audio(self, audio_file_path: str) -> str:
        """Transcribe audio using HuggingFace Whisper following the direct data post example."""
        try:
            if not self.api_key or not self.endpoint:
                logger.error("HuggingFace API not configured")
                return ""
            
            content_type = self._get_content_type(audio_file_path)
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": content_type
            }
            
            with open(audio_file_path, "rb") as f:
                data = f.read()
                
            logger.info(f"Sending {len(data)} bytes of audio data to {self.endpoint} with Content-Type: {content_type}")
            
            response = requests.post(
                self.endpoint,
                headers=headers,
                data=data,  # Use data parameter instead of files
                timeout=180 # Increased timeout for potentially large files
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # The direct API often returns just {"text": "..."}
                transcription = result.get("text", "") if isinstance(result, dict) else ""
                
                logger.info("Whisper transcription successful.")
                return transcription.strip()
            
            logger.error(f"Whisper API error: {response.status_code} - {response.text}")
            return ""
                
        except Exception as e:
            logger.error(f"Transcription failed: {e}", exc_info=True)
            return ""

    def _get_content_type(self, file_path: str) -> str:
        """Get content type based on file extension"""
        ext = os.path.splitext(file_path)[1].lower()
        return {
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
            '.flac': 'audio/flac',
            '.m4a': 'audio/mp4',
            '.ogg': 'audio/ogg'
        }.get(ext, 'audio/wav') # Default to wav if unknown

# Global instance
stt_transcriber = STTTranscriber()