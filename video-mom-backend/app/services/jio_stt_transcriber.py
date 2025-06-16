import os
import logging
import requests
import base64
from dotenv import load_dotenv
from pydub import AudioSegment

load_dotenv()
logger = logging.getLogger(__name__)

class JioTranslateSTTTranscriber:
    def __init__(self):
        self.api_key = os.getenv("JIO_API_KEY")
        self.stt_endpoint = "https://translate.jio/translator/stt"

    def preprocess_audio(self, audio_file_path):
        # Jio expects 16kHz mono PCM WAV
        audio = AudioSegment.from_file(audio_file_path)
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        processed_path = audio_file_path.replace('.wav', '_jio.wav')
        audio.export(processed_path, format="wav")
        return processed_path

    def transcribe_audio(self, audio_file_path, duration=10):
        # Always use auto language detection
        language = "auto"

        processed_path = self.preprocess_audio(audio_file_path)
        with open(processed_path, "rb") as f:
            audio_bytes = f.read()
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')

        payload = {
            "audio": {
                "content": audio_b64
            },
            "config": {
                "encoding": "LINEAR16",
                "language": language,
                "sampleRateHertz": 16000
            },
            "platform": "jiotranslate",
            "duration": duration
        }

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        # If API key is required in headers, add here:
        # headers["x-api-key"] = self.api_key

        resp = requests.post(self.stt_endpoint, headers=headers, json=payload)
        if resp.status_code == 200:
            result = resp.json()
            if "transcript" in result:
                return result["transcript"].strip()
            elif "results" in result:
                transcripts = []
                for res in result.get("results", []):
                    for alt in res.get("alternatives", []):
                        transcripts.append(alt.get("transcript", ""))
                return " ".join(transcripts).strip()
            else:
                return str(result)
        else:
            logger.error(f"Jio STT failed: {resp.text}")
            raise Exception(f"Jio STT failed: {resp.text}")