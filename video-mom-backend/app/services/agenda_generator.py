import os
import requests
from dotenv import load_dotenv
from collections import defaultdict
from app.services.stt_transcriber import STTTranscriber
import logging

load_dotenv()
logger = logging.getLogger(__name__)

class AgendaGenerator:
    def __init__(self):
        self.api_url = os.getenv("SUMMARIZATION_MODEL_ENDPOINT")
        self.api_key = os.getenv("HF_TOKEN")

    def group_voicenotes(self, voicenotes):
        grouped = defaultdict(list)
        for note in voicenotes:
            key = (note['category'], note['subcategory'])
            grouped[key].append(note)
        return grouped

    def generate_agenda_for_group(self, group_notes, category, subcategory):
        # Concatenate all transcriptions for the group
        combined_text = "\n".join([n['transcription'] for n in group_notes])
        
        # Enhanced prompt for agenda generation
        prompt = f"""
Create a structured agenda item for Gram Sabha meeting based on the following issues/complaints in {category} - {subcategory}:

Issues:
{combined_text}

Please format as:
Discussion Point: [Brief description of the issue]
Objective: [What needs to be achieved]
Possible Action Plan: [Suggested steps to resolve]

Generate agenda item:
"""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {"inputs": prompt}
        response = requests.post(self.api_url, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            if isinstance(result, list) and "summary_text" in result[0]:
                return result[0]["summary_text"]
            if isinstance(result, list) and "generated_text" in result[0]:
                return result[0]["generated_text"]
            if isinstance(result, str):
                return result
            return str(result)
        else:
            raise Exception(f"Summarization API error: {response.text}")

    def generate_formatted_agenda(self, voicenotes):
        grouped = self.group_voicenotes(voicenotes)
        agenda_text = """New Issues and Upcoming Action Plans
In this section, members of the Gram Sabha can discuss current and future needs, propose new initiatives, and formulate plans for the holistic development of the village.

"""
        
        letter_index = ord('a')
        for (category, subcategory), notes in grouped.items():
            agenda_item = self.generate_agenda_for_group(notes, category, subcategory)
            
            agenda_text += f"{chr(letter_index)}. {category} - {subcategory}\n"
            agenda_text += f"{agenda_item}\n\n"
            letter_index += 1
            
        return agenda_text

def ensure_voicenotes_transcribed(voicenotes):
    stt_transcriber = STTTranscriber()
    for note in voicenotes:
        if not note.get("transcription") and note.get("audio_file_path"):
            note["transcription"] = stt_transcriber.transcribe_audio(note["audio_file_path"])
    return voicenotes