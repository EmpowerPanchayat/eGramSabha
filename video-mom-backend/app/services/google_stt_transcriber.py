import logging
import os
import subprocess
import tempfile
import wave
from typing import Dict, List

from google.cloud import speech
from pydub import AudioSegment

from app.core.config import settings

logger = logging.getLogger(__name__)


class GoogleSTTTranscriber:
    """Google Cloud Speech-to-Text transcriber with chunked processing."""

    def __init__(self):
        self.chunk_length_ms = 55 * 1000
        self.overlap_ms = 2 * 1000
        self.language_map: Dict[str, str] = {
            "English": "en-IN",
            "Hindi": "hi-IN",
            "Gujarati": "gu-IN",
            "Marathi": "mr-IN",
            "Telugu": "te-IN",
            "Bengali": "bn-IN",
            "Kannada": "kn-IN",
            "Malayalam": "ml-IN",
            "Tamil": "ta-IN",
            "Punjabi": "pa-IN",
            "Urdu": "ur-IN",
            "Assamese": "as-IN",
            "Oriya": "or-IN",
            "Odia": "or-IN",
        }
        self.default_language_code = settings.GOOGLE_STT_DEFAULT_LANGUAGE_CODE

        self.client = None
        try:
            self.client = speech.SpeechClient()
            logger.info("Google STT initialized successfully")
        except Exception as error:
            logger.error("Failed to initialize Google STT client: %s", str(error))

    def _resolve_language_code(self, language: str) -> str:
        if language in self.language_map:
            return self.language_map[language]
        return self.default_language_code

    def convert_to_wav(self, input_path: str, output_path: str) -> str:
        """Convert audio to 16kHz mono PCM WAV."""
        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    input_path,
                    "-ac",
                    "1",
                    "-ar",
                    "16000",
                    "-acodec",
                    "pcm_s16le",
                    "-vn",
                    output_path,
                ],
                check=True,
                capture_output=True,
            )
            return output_path
        except subprocess.CalledProcessError as error:
            stderr = error.stderr.decode("utf-8", errors="ignore")
            raise Exception(f"Audio conversion failed: {stderr}") from error

    def validate_wav_format(self, wav_path: str) -> bool:
        try:
            with wave.open(wav_path, "rb") as wav_file:
                return (
                    wav_file.getnchannels() == 1
                    and wav_file.getsampwidth() == 2
                    and wav_file.getframerate() == 16000
                )
        except Exception:
            return False

    def process_audio(self, input_path: str) -> str:
        temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_wav.close()

        if not input_path.lower().endswith(".wav"):
            return self.convert_to_wav(input_path, temp_wav.name)

        if not self.validate_wav_format(input_path):
            return self.convert_to_wav(input_path, temp_wav.name)

        import shutil

        shutil.copy2(input_path, temp_wav.name)
        return temp_wav.name

    def _transcribe_chunk(self, wav_path: str, language_code: str) -> str:
        if not self.client:
            raise Exception("Google STT client is not initialized")

        with open(wav_path, "rb") as audio_file:
            content = audio_file.read()

        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=language_code,
            enable_automatic_punctuation=True,
            use_enhanced=True,
            model="latest_long",
        )

        response = self.client.recognize(config=config, audio=audio)
        if not response.results:
            return ""

        parts: List[str] = []
        for result in response.results:
            if result.alternatives:
                text = result.alternatives[0].transcript.strip()
                if text:
                    parts.append(text)
        return " ".join(parts).strip()

    def _remove_overlap(self, current_text: str, previous_text: str) -> str:
        if not current_text or not previous_text:
            return current_text
        current_words = current_text.split()
        previous_words = previous_text.split()
        max_overlap = min(12, len(current_words), len(previous_words))

        for overlap in range(max_overlap, 0, -1):
            if [w.lower() for w in current_words[:overlap]] == [
                w.lower() for w in previous_words[-overlap:]
            ]:
                return " ".join(current_words[overlap:]).strip()
        return current_text

    def transcribe_audio(self, audio_file_path: str, language: str = "Hindi") -> str:
        processed_path = None
        chunk_files: List[str] = []

        try:
            language_code = self._resolve_language_code(language)
            logger.info("Starting Google transcription with language code: %s", language_code)
            processed_path = self.process_audio(audio_file_path)

            audio = AudioSegment.from_wav(processed_path)
            total_length = len(audio)

            if total_length <= self.chunk_length_ms:
                return self._transcribe_chunk(processed_path, language_code)

            transcripts: List[str] = []
            step = self.chunk_length_ms - self.overlap_ms
            start = 0
            index = 0

            while start < total_length:
                end = min(start + self.chunk_length_ms, total_length)
                chunk = audio[start:end]

                tmp_chunk = tempfile.NamedTemporaryFile(
                    suffix=f"_google_chunk_{index}.wav", delete=False
                )
                tmp_chunk.close()
                chunk.export(tmp_chunk.name, format="wav")
                chunk_files.append(tmp_chunk.name)

                chunk_text = self._transcribe_chunk(tmp_chunk.name, language_code)
                if chunk_text:
                    if transcripts:
                        chunk_text = self._remove_overlap(chunk_text, transcripts[-1])
                    if chunk_text:
                        transcripts.append(chunk_text)

                start += step
                index += 1

            combined = " ".join([t for t in transcripts if t.strip()]).strip()
            return combined
        except Exception as error:
            logger.error("Google transcription failed: %s", str(error))
            raise
        finally:
            if processed_path and os.path.exists(processed_path):
                try:
                    os.unlink(processed_path)
                except Exception:
                    pass
            for chunk_file in chunk_files:
                if os.path.exists(chunk_file):
                    try:
                        os.unlink(chunk_file)
                    except Exception:
                        pass


google_stt_transcriber = GoogleSTTTranscriber()
