import os
import shutil
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Path
from typing import List, Dict, Any, Optional
from app.services.audio_extractor import AudioExtractor
from app.services.stt_transcriber import STTTranscriber
from app.services.mom_generator import MOMGenerator
from app.services.agenda_generator import AgendaGenerator, ensure_voicenotes_transcribed
from app.services.translation_service import TranslationService
from app.services.jio_stt_transcriber import JioTranslateSTTTranscriber

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
jio_stt_transcriber = JioTranslateSTTTranscriber()

def safe_translate_with_status(text: str, target_lang: str = 'en') -> Dict[str, Any]:
    """Safely translate text with detailed status reporting"""
    if not text or not text.strip():
        return {
            "text": None,
            "status": "empty_input",
            "error": "No text provided",
            "fallback_used": False
        }
    
    try:
        if target_lang == 'en':
            translated = translation_service.translate_to_english(text)
        else:
            translated = translation_service.translate_to_language(text, target_lang)
        
        if translated:
            return {
                "text": translated,
                "status": "success",
                "error": None,
                "fallback_used": False
            }
        else:
            # Translation failed - use original as fallback
            logger.warning(f"Translation to {target_lang} failed, using original text")
            return {
                "text": text,
                "status": "failed",
                "error": "Translation service unavailable",
                "fallback_used": True
            }
    
    except Exception as e:
        logger.error(f"Translation exception for {target_lang}: {e}")
        return {
            "text": text,
            "status": "error",
            "error": str(e),
            "fallback_used": True
        }

@router.post("/transcription/")
async def transcription_endpoint(file: UploadFile = File(...)):
    """
    Transcribe audio/video file and return transcription in original language, English, and Hindi
    """
    temp_path = None
    audio_path = None
    
    try:
        logger.info(f"Received file for transcription: {file.filename}")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
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
            if not audio_path or not os.path.exists(audio_path):
                raise HTTPException(status_code=500, detail="Audio extraction failed")
            logger.info(f"Extracted audio from video: {audio_path}")
        elif ext in audio_extensions:
            # Use audio file directly
            audio_path = temp_path
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

        # Transcribe audio
        transcription_original = stt_transcriber.transcribe_audio(audio_path)
        
        if not transcription_original or not transcription_original.strip():
            logger.warning("Transcription resulted in empty text")
            return {
                "transcription_original": "",
                "transcription_english": None,
                "transcription_hindi": None
            }
        
        logger.info(f"Transcription completed: {transcription_original[:100]}...")

        # Translate to English and Hindi
        translation_en = safe_translate_with_status(transcription_original, 'en')
        translation_hi = safe_translate_with_status(transcription_original, 'hi')
        
        response = {
            "transcription_original": transcription_original,
            "transcription_english": translation_en["text"],
            "transcription_hindi": translation_hi["text"]
        }
        
        logger.info(f"Translation status (EN): {translation_en['status']}, (HI): {translation_hi['status']}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in transcription endpoint")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Clean up temporary files
        try:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
                logger.info(f"Cleaned up: {temp_path}")
            if audio_path and audio_path != temp_path and os.path.exists(audio_path):
                os.remove(audio_path)
                logger.info(f"Cleaned up: {audio_path}")
        except Exception as cleanup_e:
            logger.warning(f"Failed to clean up temp files: {cleanup_e}")

@router.post("/generateMom/{language}")
async def generate_mom_endpoint(
    language: str = Path(..., description="Target language code (e.g., 'hi' for Hindi, 'ta' for Tamil)"),
    text: str = Body(..., embed=True)
):
    """
    Generate Minutes of Meeting from text in English, Hindi, and specified language
    """
    try:
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Text content is required")
        
        logger.info(f"Generating MOM for language: {language}")
        
        mom_english = mom_generator.generate_mom(text)
        if not mom_english:
            raise HTTPException(status_code=500, detail="MOM generation failed")
        
        logger.info(f"MOM generated in English: {mom_english[:100]}...")

        # Translate to Hindi and specified language
        translation_hi = safe_translate_with_status(mom_english, 'hi')
        if language.lower() == 'en':
            translation_result = {
                "text": mom_english,
                "status": "no_translation_needed",
                "error": None,
                "fallback_used": False
            }
        else:
            translation_result = safe_translate_with_status(mom_english, language)

        response = {
            "mom_english": mom_english,
            "mom_hindi": translation_hi["text"],
            f"mom_{language}": translation_result["text"],
            "translation_status": {
                "status": translation_result["status"],
                "error": translation_result["error"],
                "fallback_used": translation_result["fallback_used"]
            }
        }
        
        logger.info(f"MOM translation status: {translation_result['status']}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in generate MOM endpoint")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generateAgenda/{language}")
async def generate_agenda_endpoint(
    language: str = Path(..., description="Target language code (e.g., 'hi' for Hindi, 'ta' for Tamil)"),
    voicenotes: List[Dict[str, Any]] = Body(..., description="List of voicenotes with transcription, category, and subcategory")
):
    """
    Generate structured agenda from voicenotes in English, Hindi, and specified language
    """
    try:
        logger.info(f"Generating agenda for language: {language}")
        
        # Ensure all voicenotes have transcriptions
        voicenotes = ensure_voicenotes_transcribed(voicenotes)
        
        # Generate formatted agenda in English
        agenda_english = agenda_generator.generate_formatted_agenda(voicenotes)
        if not agenda_english:
            raise HTTPException(status_code=500, detail="Agenda generation failed")
        
        logger.info(f"Agenda generated in English")

        # Translate to Hindi and specified language
        translation_hi = safe_translate_with_status(agenda_english, 'hi')
        if language.lower() == 'en':
            translation_result = {
                "text": agenda_english,
                "status": "no_translation_needed",
                "error": None,
                "fallback_used": False
            }
        else:
            translation_result = safe_translate_with_status(agenda_english, language)

        # Count agenda items (assuming agenda_english is a list, else try to parse)
        agenda_count = 0
        if isinstance(agenda_english, list):
            agenda_count = len(agenda_english)
        else:
            # Try to parse as JSON list if it's a string
            try:
                import json
                parsed = json.loads(agenda_english)
                if isinstance(parsed, list):
                    agenda_count = len(parsed)
            except Exception:
                agenda_count = 0

        response = {
            "agenda_english": agenda_english,
            "agenda_hindi": translation_hi["text"],
            f"agenda_{language}": translation_result["text"],
            "agenda_count": agenda_count,
            "translation_status": {
                "status": translation_result["status"],
                "error": translation_result["error"],
                "fallback_used": translation_result["fallback_used"]
            }
        }
        
        logger.info(f"Agenda translation status: {translation_result['status']}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in generate agenda endpoint")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint for translation service
@router.get("/translation/health")
async def translation_health_check():
    """Check if translation service is working"""
    try:
        is_healthy = translation_service.is_service_healthy()
        return {
            "translation_service_healthy": is_healthy,
            "status": "ok" if is_healthy else "degraded",
            "message": "Translation service is working" if is_healthy else "Translation service has issues"
        }
    except Exception as e:
        return {
            "translation_service_healthy": False,
            "status": "error",
            "message": f"Translation service error: {str(e)}"
        }

@router.post("/transcription/jio/")
async def jio_transcription_endpoint(file: UploadFile = File(...)):
    """
    Transcribe audio using Jio Translate STT API and return transcription in original language, English, and Hindi.
    """
    import shutil
    temp_path = f"temp_{file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        # Always use auto language detection
        transcription_original = jio_stt_transcriber.transcribe_audio(temp_path)
        # Translate to English and Hindi using your translation service
        translation_en = safe_translate_with_status(transcription_original, 'en')
        translation_hi = safe_translate_with_status(transcription_original, 'hi')
        return {
            "transcription_original": transcription_original,
            "transcription_english": translation_en["text"],
            "transcription_hindi": translation_hi["text"]
        }
    except Exception as e:
        logger.exception("Jio transcription failed")
        raise HTTPException(status_code=500, detail=f"Jio transcription failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)