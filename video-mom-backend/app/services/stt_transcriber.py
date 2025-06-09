from typing import List
import requests
import os
import logging
from dotenv import load_dotenv
import datetime

load_dotenv()
logger = logging.getLogger(__name__)

class STTTranscriber:
    def __init__(self):
        self.api_url = os.getenv("STT_MODEL_ENDPOINT", "https://api-inference.huggingface.co/models/openai/whisper-large-v2")
        self.api_key = os.getenv("HF_TOKEN")

    def transcribe_audio(self, audio_file_path: str, language: str = None) -> str:
        logger.info(f"Starting transcription for: {audio_file_path}")
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'audio/wav'
        }
        params = {}
        if language:
            params['language'] = language
        try:
            with open(audio_file_path, 'rb') as audio_file:
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    params=params,
                    data=audio_file
                )
            logger.info(f"Transcription API response status: {response.status_code}")
            if response.status_code == 200:
                transcription = response.json().get('text', '') or response.json().get('transcription', '')
                logger.info(f"Transcription successful for {audio_file_path}")

                # --- Save to TXT file ---
                base = os.path.splitext(os.path.basename(audio_file_path))[0]
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                txt_path = f"{base}_{timestamp}.txt"
                with open(txt_path, "w", encoding="utf-8") as f:
                    f.write(transcription)
                logger.info(f"Transcript saved to {txt_path}")

                # --- Save to DOCX file (optional) ---
                try:
                    from docx import Document
                    doc = Document()
                    doc.add_paragraph(transcription)
                    docx_path = f"{base}_{timestamp}.docx"
                    doc.save(docx_path)
                    logger.info(f"Transcript also saved to {docx_path}")
                except ImportError:
                    logger.warning("python-docx not installed, skipping DOCX save.")

                return transcription
            else:
                logger.error(f"Transcription failed: {response.text}")
                raise Exception(f"Error in transcription: {response.text}")
        except Exception as e:
            logger.exception(f"Exception during transcription for {audio_file_path}")
            raise

    def transcribe_multiple_audios(self, audio_file_paths: List[str], language: str) -> List[str]:
        transcriptions = []
        for audio_file_path in audio_file_paths:
            transcription = self.transcribe_audio(audio_file_path, language)
            transcriptions.append(transcription)
        return transcriptions