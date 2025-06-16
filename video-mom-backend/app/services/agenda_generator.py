import os
import requests
from dotenv import load_dotenv
import logging
from app.services.stt_transcriber import STTTranscriber

load_dotenv()
logger = logging.getLogger(__name__)

class AgendaGenerator:
    def __init__(self):
        self.api_url = os.getenv("SUMMARIZATION_MODEL_ENDPOINT")
        self.api_key = os.getenv("HF_TOKEN")

    def generate_formatted_agenda(self, voicenotes):
        # Prepare the list of issues for the prompt
        issues_list = [
            {
                "id": n.get("id"),
                "transcription": n.get("transcription"),
                "category": n.get("category"),
                "subcategory": n.get("subcategory")
            }
            for n in voicenotes if n.get("transcription")
        ]

        prompt = f"""
You are an expert secretary for Gram Sabha meetings. Given a list of issues (with their transcriptions, categories, subcategories, and unique IDs), your task is to:
- Club and combine similar issues into a single agenda item.
- For each agenda item, provide:
    - title: A short, clear title for the agenda item.
    - Discussion Point: [Brief description of the issue(s)]
    - Objective: [What needs to be achieved]
    - Possible Action Plan: [Suggested steps to resolve]
    - issue_ids: List of issue IDs that contributed to this agenda item (only include relevant IDs).
- No two agenda items should use the same issue ID.
- Return a JSON list of agenda items, each with the above structure.

Here are the issues:
{issues_list}

Respond ONLY with a JSON list of agenda items as described above.
"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {"inputs": prompt}
        response = requests.post(self.api_url, headers=headers, json=payload)

        if response.status_code == 200:
            result = response.json()
            # Try to extract the agenda items list from the model's response
            if isinstance(result, list) and "generated_text" in result[0]:
                import json as pyjson
                try:
                    agenda_items = pyjson.loads(result[0]["generated_text"])
                    return agenda_items
                except Exception:
                    return result[0]["generated_text"]
            if isinstance(result, list) and "summary_text" in result[0]:
                import json as pyjson
                try:
                    agenda_items = pyjson.loads(result[0]["summary_text"])
                    return agenda_items
                except Exception:
                    return result[0]["summary_text"]
            if isinstance(result, str):
                return result
            return str(result)
        else:
            raise Exception(f"Summarization API error: {response.text}")

def ensure_voicenotes_transcribed(voicenotes):
    stt_transcriber = STTTranscriber()
    for note in voicenotes:
        if not note.get("transcription") and note.get("audio_file_path"):
            note["transcription"] = stt_transcriber.transcribe_audio(note["audio_file_path"])
    return voicenotes