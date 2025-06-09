import os
import shutil
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Path
from typing import List, Dict, Any
from app.services.audio_extractor import AudioExtractor
from app.services.stt_transcriber import STTTranscriber
from app.services.mom_generator import MOMGenerator
from app.services.agenda_generator import AgendaGenerator, ensure_voicenotes_transcribed
from app.services.translation_service import TranslationService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
audio_extractor = AudioExtractor()
stt_transcriber = STTTranscriber()
mom_generator = MOMGenerator()
agenda_generator = AgendaGenerator()
translation_service = TranslationService()

@router.post("/transcription/")
async def transcription_endpoint(file: UploadFile = File(...)):
    """
    Transcribe audio/video file and return transcription in original language and English
    """
    try:
        logger.info(f"Received file for transcription: {file.filename}")
        
        # Save uploaded file
        filename = file.filename
        ext = os.path.splitext(filename)[1].lower()
        temp_path = f"temp_{filename}"
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Saved uploaded file to: {temp_path}")

        # Determine if file is video or audio
        video_extensions = [".mp4", ".avi", ".mov", ".mkv", ".webm"]
        audio_extensions = [".wav", ".mp3", ".flac", ".m4a", ".ogg"]
        
        if ext in video_extensions:
            # Extract audio from video
            audio_path = audio_extractor.extract_audio(temp_path)
            logger.info(f"Extracted audio from video: {audio_path}")
        elif ext in audio_extensions:
            # Use audio file directly
            audio_path = temp_path
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

        # Transcribe audio
        transcription_original = stt_transcriber.transcribe_audio(audio_path)
        logger.info(f"Transcription completed: {transcription_original[:100]}...")

        # Translate to English
        transcription_english = translation_service.translate_to_english(transcription_original)
        logger.info(f"Translation to English completed")

        # Clean up temporary files
        os.remove(temp_path)
        if ext in video_extensions and os.path.exists(audio_path):
            os.remove(audio_path)

        return {
            "transcription_original": transcription_original,
            "transcription_english": transcription_english
        }

    except Exception as e:
        logger.exception("Error in transcription endpoint")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generateMom/{language}")
async def generate_mom_endpoint(
    language: str = Path(..., description="Target language code (e.g., 'hi' for Hindi, 'ta' for Tamil)"),
    text: str = Body(..., embed=True)
):
    """
    Generate Minutes of Meeting from text in English and specified language
    """
    try:
        logger.info(f"Generating MOM for language: {language}")
        
        # Generate MOM in English using enhanced prompt
        mom_english = mom_generator.generate_mom(text)
        logger.info(f"MOM generated in English: {mom_english[:100]}...")

        # Translate to specified language
        mom_translated = translation_service.translate_to_language(mom_english, language)
        logger.info(f"MOM translated to {language}")

        return {
            "mom_english": mom_english,
            f"mom_{language}": mom_translated
        }

    except Exception as e:
        logger.exception("Error in generate MOM endpoint")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generateAgenda/{language}")
async def generate_agenda_endpoint(
    language: str = Path(..., description="Target language code (e.g., 'hi' for Hindi, 'ta' for Tamil)"),
    voicenotes: List[Dict[str, Any]] = Body(..., description="List of voicenotes with transcription, category, and subcategory")
):
    """
    Generate structured agenda from voicenotes in English and specified language
    """
    try:
        logger.info(f"Generating agenda for language: {language}")
        
        # Ensure all voicenotes have transcriptions
        voicenotes = ensure_voicenotes_transcribed(voicenotes)
        
        # Generate formatted agenda in English
        agenda_english = agenda_generator.generate_formatted_agenda(voicenotes)
        logger.info(f"Agenda generated in English")

        # Translate to specified language
        agenda_translated = translation_service.translate_to_language(agenda_english, language)
        logger.info(f"Agenda translated to {language}")

        return {
            "agenda_english": agenda_english,
            f"agenda_{language}": agenda_translated
        }

    except Exception as e:
        logger.exception("Error in generate agenda endpoint")
        raise HTTPException(status_code=500, detail=str(e))

# Keep the old endpoints for backward compatibility (optional)
@router.post("/upload-video/")
async def upload_video_legacy(file: UploadFile = File(...)):
    """Legacy endpoint - redirects to transcription"""
    return await transcription_endpoint(file)