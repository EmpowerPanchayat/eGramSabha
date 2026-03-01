import os
import asyncio
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Depends, Path
from typing import Dict, Any, List
from app.services.audio_extractor import AudioExtractor
from app.services.stt_transcriber import STTTranscriber
from app.services.jio_only_stt_transcriber import jio_only_stt_transcriber
from app.services.request_tracker import RequestTracker
from app.core.config import settings
from app.services.file_storage import file_storage
from app.services.llm_service import llm_service
from app.core.database import get_database, RequestStatus, RequestType
from motor.motor_asyncio import AsyncIOMotorDatabase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
audio_extractor = AudioExtractor()
stt_transcriber = STTTranscriber()

async def get_request_tracker(db: AsyncIOMotorDatabase = Depends(get_database)) -> RequestTracker:
    return RequestTracker(db)

# ======================= MAIN ENDPOINTS =======================

@router.post("/transcription/")
async def transcription_endpoint(
    file: UploadFile = File(...), 
    tracker: RequestTracker = Depends(get_request_tracker)
):
    """Transcribe audio/video file using HuggingFace Whisper API"""
    return await _create_file_processing_request(
        file, tracker, RequestType.TRANSCRIPTION, 
        process_transcription_async, "huggingface_whisper_only"
    )

@router.post("/transcription/jio/{language}")
async def jio_transcription_endpoint(
    language: str = Path(..., description="Language for transcription (e.g., Hindi, English, Tamil, etc.)"),
    file: UploadFile = File(...), 
    tracker: RequestTracker = Depends(get_request_tracker)
):
    """Transcribe audio/video file using Jio Translate API with specified language"""
    # Validate language parameter
    supported_languages = ["English", "Hindi", "Gujarati",
                           "Marathi", "Telugu", "Bengali",
                            "Kannada", "Malayalam", "Tamil",
                            "Spanish", "German", "Italian", 
                            "French", "Urdu", "Punjabi",
                            "Assamese", "Oriya", "Arabic",
                            "Simplified Chinese", "Traditional Chinese","Bahasa", "Dutch", "Korean", "Malay", "Polish",
                            "Portuguese", "Russian", "Tagalog", "Thai",
                            "Turkish", "Vietnamese"
    ]
    
    if language not in supported_languages:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported language: {language}. Supported languages: {', '.join(supported_languages)}"
        )
    
    # Store language in the request data for processing
    request_data = {"language": language}
    return await _create_file_processing_request(
        file, tracker, RequestType.TRANSCRIPTION_JIO, 
        process_jio_transcription_async, "jio_translate_only", 
        additional_data=request_data
    )

# ======================= TEXT-BASED ENDPOINTS =======================

# Updated MOM endpoint with language in URL
@router.post("/mom/generate/{language}")
async def generate_mom_endpoint(
    language: str = Path(..., description="Language code (en, hi, etc.)"),
    transcription: str = Body(..., embed=True),
    tracker: RequestTracker = Depends(get_request_tracker)
):
    """Generate Minutes of Meeting in specified language"""
    return await _create_text_processing_request(
        {"transcription": transcription, "language": language}, 
        tracker, RequestType.MOM_GENERATION,
        process_mom_generation_async, "mom"
    )

# Updated agenda endpoints with language in URL
@router.post("/agenda/generate/{language}")
async def generate_agenda_endpoint(
    language: str = Path(..., description="Language code (en, hi, etc.)"),
    issues: List[Dict[str, Any]] = Body(..., embed=True),
    tracker: RequestTracker = Depends(get_request_tracker)
):
    """Generate structured agenda from list of issues with IDs in specified language"""
    return await _create_text_processing_request(
        {"issues": issues, "language": language}, 
        tracker, RequestType.AGENDA_GENERATION,
        process_agenda_generation_async, "agenda"
    )

@router.post("/agenda/update/{language}")
async def update_agenda_endpoint(
    language: str = Path(..., description="Language code (en, hi, etc.)"),
    current_agenda: List[Dict[str, Any]] = Body(..., embed=True),
    new_issues: List[Dict[str, Any]] = Body(..., embed=True),
    tracker: RequestTracker = Depends(get_request_tracker)
):
    """Update existing structured agenda with new issues in specified language"""
    return await _create_text_processing_request(
        {"current_agenda": current_agenda, "new_issues": new_issues, "language": language}, 
        tracker, RequestType.AGENDA_UPDATE, 
        process_agenda_update_async, "agenda"
    )

@router.post("/translate")
async def translate_text_endpoint(
    text: str = Body(..., embed=True),
    target_language: str = Body(..., embed=True),
    tracker: RequestTracker = Depends(get_request_tracker)
):
    """Translate text to target language"""
    return await _create_text_processing_request(
        {"text": text, "target_language": target_language}, 
        tracker, RequestType.TRANSLATION, 
        process_translation_async, "translate"
    )

# ======================= HELPER FUNCTIONS =======================

async def _create_file_processing_request(
    file: UploadFile, tracker: RequestTracker, request_type: RequestType,
    process_func, provider_name: str, additional_data: dict = None
):
    """Create file processing request with optional additional data"""
    try:
        # Validate file
        if not file.filename or file.size == 0:
            raise HTTPException(status_code=400, detail="No valid file provided")
        
        # Check file extension
        file_extension = file.filename.lower().split('.')[-1]
        if file_extension not in ['mp4', 'wav', 'mp3', 'avi', 'mov', 'mkv', 'flv', 'webm', 'm4a', 'aac', 'ogg', 'flac']:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_extension}")
        
        # Create request first to get request_id
        request_data = {
            "filename": file.filename,
            "provider": provider_name
        }
        
        if additional_data:
            request_data.update(additional_data)
        
        # Create request to get request_id
        request_id = await tracker.create_request(request_type, request_data)
        
        # Read file content as bytes
        file_content = await file.read()
        
        # Store file with request_id - pass bytes content, not UploadFile object
        stored_file_path = file_storage.store_file(file_content, file.filename, request_id)
        
        # Store file metadata for processing
        file_metadata = {
            "stored_path": stored_file_path,
            "original_filename": file.filename,
            "file_size": file.size,
            "content_type": file.content_type
        }
        
        # Store the metadata object in the tracker
        await tracker.store_object(request_id, "file_metadata", file_metadata)
        
        # Start background processing
        asyncio.create_task(process_func(request_id, tracker))
        
        # Determine result endpoint based on request type
        if request_type == RequestType.TRANSCRIPTION:
            result_endpoint = f"/transcription/{request_id}/result"
        elif request_type == RequestType.TRANSCRIPTION_JIO:
            result_endpoint = f"/transcription/jio/{request_id}/result"
        else:
            result_endpoint = f"/request/{request_id}/result"
        
        response = {
            "request_id": request_id,
            "status": "processing",
            "message": f"File uploaded successfully. Processing with {provider_name}.",
            "status_url": f"/request/{request_id}/status",
            "result_url": result_endpoint
        }
        
        # Add language info if available
        if additional_data and "language" in additional_data:
            response["language"] = additional_data["language"]
        
        return response
        
    except Exception as e:
        logger.error(f"Error creating file processing request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

async def _create_text_processing_request(
    data: dict, tracker: RequestTracker, request_type: str, 
    processor_func, endpoint_prefix: str
):
    """Common logic for text-based processing requests"""
    request_id = await tracker.create_request(request_type, data)
    
    try:
        await tracker.store_object(request_id, "input_data", data)
        asyncio.create_task(processor_func(request_id, tracker))
        
        return {
            "request_id": request_id,
            "status": "processing",
            "message": f"Processing started. Use the status_url to check progress.",
            "status_url": f"/request/{request_id}/status",
            "result_url": f"/{endpoint_prefix}/{request_id}/result"
        }
        
    except Exception as e:
        await tracker.update_request_status(request_id, RequestStatus.FAILED, error_message=str(e))
        raise HTTPException(status_code=500, detail={
            "error": str(e), 
            "request_id": request_id, 
            "status": "failed",
            "status_url": f"/request/{request_id}/status"
        })

# ======================= BACKGROUND PROCESSORS =======================

async def process_transcription_async(request_id: str, tracker: RequestTracker):
    """Background processing for HuggingFace Whisper transcription"""
    await _process_transcription_common(
        request_id, tracker, stt_transcriber.transcribe_audio, 
        "huggingface_whisper", "HuggingFace Whisper API"
    )

async def process_jio_transcription_async(request_id: str, tracker: RequestTracker):
    """Background processing for transcription using the configured STT provider"""
    try:
        # Get request data to extract language
        request_data = await tracker.get_request_data(request_id)
        language = request_data.get("language", "Hindi")  # Default to Hindi if not specified

        # Select transcription function based on STT_PROVIDER config
        provider = settings.STT_PROVIDER.lower()
        if provider == "whisper":
            logger.info(f"Processing transcription for request {request_id} with language: {language}, provider: Whisper")
            transcribe_func = stt_transcriber.transcribe_audio
            provider_name = "whisper"
            provider_display = f"HuggingFace Whisper ({language})"
        else:
            logger.info(f"Processing transcription for request {request_id} with language: {language}, provider: Jio")
            transcribe_func = lambda audio_path: jio_only_stt_transcriber.transcribe_audio(audio_path, language)
            provider_name = "jio_translate"
            provider_display = f"Jio Translate API ({language})"

        await _process_transcription_common(
            request_id, tracker, transcribe_func,
            provider_name, provider_display
        )
    except Exception as e:
        logger.error(f"Error in transcription processing: {e}")
        await tracker.update_request_status(
            request_id, RequestStatus.FAILED,
            f"Transcription processing failed: {str(e)}"
        )

async def _process_transcription_common(
    request_id: str, tracker: RequestTracker, transcribe_func, 
    provider_name: str, provider_display: str
):
    """Common transcription processing logic"""
    audio_path = None
    stored_path = None
    
    try:
        # File validation
        await tracker.update_request_status(request_id, RequestStatus.PROCESSING, "file_validation", progress=5)
        file_metadata = await tracker.get_object(request_id, "file_metadata")
        if not file_metadata or not os.path.exists(file_metadata["stored_path"]):
            raise Exception("File metadata or stored file not found")
        
        stored_path = file_metadata["stored_path"]
        
        # Audio extraction
        audio_path = await _handle_audio_extraction(request_id, tracker, file_metadata, stored_path)
        if not audio_path:
            return
        
        # Transcription
        transcription = await _handle_transcription_with_provider(
            request_id, tracker, audio_path, transcribe_func, provider_name
        )
        if not transcription:
            return
        
        # LLM enhancement with multilingual output
        llm_result = await _handle_llm_enhancement(request_id, tracker, transcription)
        
        # Finalize response with new format
        await _finalize_transcription_response(
            request_id, tracker, transcription, llm_result, provider_name, provider_display
        )

    except Exception as e:
        logger.exception(f"Error in transcription processing for request {request_id}")
        await tracker.update_request_status(request_id, RequestStatus.FAILED, error_message=str(e))
    finally:
        _cleanup_audio_file(audio_path, stored_path, request_id)

async def process_mom_generation_async(request_id: str, tracker: RequestTracker):
    """Background processing for MOM generation with multilingual output"""
    try:
        await tracker.update_request_status(request_id, RequestStatus.PROCESSING, "mom_generation", progress=50)
        
        data = await tracker.get_object(request_id, "input_data")
        if not data or "transcription" not in data:
            raise Exception("Input transcription not found")
        
        language = data.get("language", "en")
        transcription = data["transcription"]
        
        # FIX: Generate multilingual MOM in a separate thread
        mom_result = await asyncio.to_thread(llm_service.generate_multilingual_mom, transcription, language)
        
        # Create final response with new format
        final_response = {
            "request_id": request_id,
            f"{language}_mom": mom_result.get(f"{language}_mom", ""),
            "english_mom": mom_result.get("english_mom", ""),
            "hindi_mom": mom_result.get("hindi_mom", ""),
            "primary_language": language,
            "input_transcription_length": len(transcription),
            "llm_status": mom_result.get("status", "unknown")
        }
        
        await tracker.store_object(request_id, "final_response", final_response)
        await tracker.update_request_status(request_id, RequestStatus.COMPLETED, progress=100)
        
    except Exception as e:
        logger.exception(f"Error in MOM generation for request {request_id}")
        await tracker.update_request_status(request_id, RequestStatus.FAILED, error_message=str(e))

async def process_agenda_generation_async(request_id: str, tracker: RequestTracker):
    """Background processing for agenda generation with multilingual output"""
    try:
        await tracker.update_request_status(request_id, RequestStatus.PROCESSING, "agenda_generation", progress=50)
        
        data = await tracker.get_object(request_id, "input_data")
        if not data:
            raise Exception("Input data not found")
        
        issues = data.get("issues", [])
        language = data.get("language", "en")
        
        if not issues:
            raise Exception("Issues list is required")
        
        # FIX: Generate multilingual agenda in a separate thread
        agenda_result = await asyncio.to_thread(llm_service.generate_multilingual_agenda_from_issues, issues, language)
        
        # Create final response with new format
        final_response = {
            "request_id": request_id,
            f"{language}_agenda": agenda_result.get(f"{language}_agenda", ""),
            "english_agenda": agenda_result.get("english_agenda", ""),
            "hindi_agenda": agenda_result.get("hindi_agenda", ""),
            "primary_language": language,
            "total_issues": len(issues),
            "llm_status": agenda_result.get("status", "unknown"),
            "processing_type": "issues_to_multilingual_agenda"
        }
        
        await tracker.store_object(request_id, "final_response", final_response)
        await tracker.update_request_status(request_id, RequestStatus.COMPLETED, progress=100)
        
    except Exception as e:
        logger.exception(f"Error in agenda generation from issues for request {request_id}")
        await tracker.update_request_status(request_id, RequestStatus.FAILED, error_message=str(e))

async def process_agenda_update_async(request_id: str, tracker: RequestTracker):
    """Background processing for updating agenda with multilingual output"""
    try:
        await tracker.update_request_status(request_id, RequestStatus.PROCESSING, "agenda_update", progress=50)
        
        data = await tracker.get_object(request_id, "input_data")
        if not data:
            raise Exception("Input data not found")
        
        current_agenda = data.get("current_agenda", [])
        new_issues = data.get("new_issues", [])
        language = data.get("language", "en")
        
        if not current_agenda:
            raise Exception("Current agenda is required")
        if not new_issues:
            raise Exception("New issues are required")
        
        # FIX: Update agenda with multilingual output in a separate thread
        update_result = await asyncio.to_thread(llm_service.update_multilingual_agenda_with_issues, current_agenda, new_issues, language)
        
        # Create final response with new format
        final_response = {
            "request_id": request_id,
            f"{language}_agenda": update_result.get(f"{language}_agenda", ""),
            "english_agenda": update_result.get("english_agenda", ""),
            "hindi_agenda": update_result.get("hindi_agenda", ""),
            "primary_language": language,
            "original_items_count": len(current_agenda),
            "new_issues_count": len(new_issues),
            "llm_status": update_result.get("status", "unknown"),
            "processing_type": "multilingual_agenda_update"
        }
        
        await tracker.store_object(request_id, "final_response", final_response)
        await tracker.update_request_status(request_id, RequestStatus.COMPLETED, progress=100)
        
    except Exception as e:
        logger.exception(f"Error in agenda update with issues for request {request_id}")
        await tracker.update_request_status(request_id, RequestStatus.FAILED, error_message=str(e))

async def process_translation_async(request_id: str, tracker: RequestTracker):
    """Background processing for translation"""
    try:
        await tracker.update_request_status(request_id, RequestStatus.PROCESSING, "translation", progress=50)
        
        data = await tracker.get_object(request_id, "input_data")
        if not data:
            raise Exception("Input data not found")
        
        # FIX: Run translation in a separate thread
        translation_result = await asyncio.to_thread(llm_service.translate_text, data["text"], data["target_language"])
        
        final_response = {
            "request_id": request_id,
            "original_text": data["text"],
            "target_language": data["target_language"],
            "translated_text": translation_result["text"],
            "translation_status": translation_result["status"],
            "fallback_used": translation_result.get("fallback_used", False),
            "error": translation_result.get("error")
        }
        
        await tracker.store_object(request_id, "final_response", final_response)
        await tracker.update_request_status(request_id, RequestStatus.COMPLETED, progress=100)
        
    except Exception as e:
        logger.exception(f"Error in translation for request {request_id}")
        await tracker.update_request_status(request_id, RequestStatus.FAILED, error_message=str(e))

# ======================= TRANSCRIPTION HELPERS =======================

async def _handle_audio_extraction(request_id: str, tracker: RequestTracker, file_metadata: dict, stored_path: str) -> str:
    """Handle audio extraction with resume capability"""
    existing_audio_path = await tracker.get_object(request_id, "audio_file_path")
    if existing_audio_path and os.path.exists(existing_audio_path):
        await tracker.update_request_status(request_id, RequestStatus.RESUMED, "transcription", progress=30)
        return existing_audio_path
    
    await tracker.update_request_status(request_id, RequestStatus.PROCESSING, "audio_extraction", progress=10)
    
    # FIX: Run the blocking audio_extractor in a separate thread
    audio_path = await asyncio.to_thread(audio_extractor.extract_audio, stored_path)
    
    if not audio_path:
        await tracker.update_request_status(request_id, RequestStatus.FAILED, "Audio extraction failed")
        return ""
    
    await tracker.store_object(request_id, "audio_file_path", audio_path)
    return audio_path

async def _handle_transcription_with_provider(
    request_id: str, tracker: RequestTracker, audio_path: str, 
    transcribe_func, provider_name: str
) -> str:
    """Handle transcription with any provider"""
    existing_transcription = await tracker.get_object(request_id, "raw_transcription")
    if existing_transcription:
        await tracker.update_request_status(request_id, RequestStatus.RESUMED, "llm_enhancement", progress=70)
        return existing_transcription
    
    await tracker.update_request_status(request_id, RequestStatus.PROCESSING, f"{provider_name}_transcription", progress=40)
    
    try:
        # FIX: Run the blocking transcribe_func in a separate thread
        transcription = await asyncio.to_thread(transcribe_func, audio_path)
        
        if not transcription or not transcription.strip():
            await _create_empty_transcription_response(request_id, tracker, provider_name)
            return ""
        
        await tracker.store_object(request_id, "raw_transcription", transcription)
        return transcription
        
    except Exception as e:
        await _create_failed_transcription_response(request_id, tracker, provider_name, str(e))
        return ""

async def _handle_llm_enhancement(request_id: str, tracker: RequestTracker, transcription: str) -> dict:
    """Handle LLM enhancement with resume capability"""
    existing_llm_result = await tracker.get_object(request_id, "llm_result")
    if existing_llm_result:
        return existing_llm_result
    
    await tracker.update_request_status(request_id, RequestStatus.PROCESSING, "llm_enhancement", progress=70)
    
    # FIX: Run the blocking llm_service call in a separate thread
    llm_result = await asyncio.to_thread(llm_service.correct_transcription, transcription)
    
    await tracker.store_object(request_id, "llm_result", llm_result)
    return llm_result

async def _finalize_transcription_response(
    request_id: str, tracker: RequestTracker, transcription: str, 
    llm_result: dict, provider_name: str, provider_display: str
):
    """Finalize transcription response with the new specified format"""
    await tracker.update_request_status(request_id, RequestStatus.PROCESSING, "finalizing", progress=90)
    
    # New format with corrected key name
    final_response = {
        "request_id": request_id,
        "original_transcription": transcription,
        "enhanced_original_transcription": llm_result.get("enhanced_original", transcription),
        "enhanced_english_transcription": llm_result.get("enhanced_english", ""),
        "enhanced_hindi_transcription": llm_result.get("enhanced_hindi", ""),
        "llm_enhancement_status": {
            "error_message": llm_result.get("error") if llm_result.get("error") else None,
            "message": "LLM enhancement applied." if not llm_result.get("error") else f"LLM enhancement issue: {llm_result.get('error')}"
        },
        "processing_mode": f"{provider_name}_only",
        "transcription_provider": provider_name,
        "provider_info": {
            "primary": provider_display,
            "fallback": "None (Independent mode)"
        }
    }

    if final_response["llm_enhancement_status"]["error_message"] is None:
        del final_response["llm_enhancement_status"]["error_message"]
    
    await tracker.store_object(request_id, "final_response", final_response)
    await tracker.update_request_status(request_id, RequestStatus.COMPLETED, progress=100)

async def _create_empty_transcription_response(request_id: str, tracker: RequestTracker, provider_name: str):
    """Create response for empty STT transcription with the new specified format"""
    final_response = {
        "request_id": request_id,
        "original_transcription": "",
        "enhanced_original_transcription": "",
        "enhanced_english_transcription": "",
        "enhanced_hindi_transcription": "",
        "note": f"No transcription could be generated using {provider_name} STT.",
        "llm_enhancement_status": {"message": "LLM enhancement skipped due to empty STT output."},
        "transcription_provider": f"{provider_name}_empty"
    }
    await tracker.store_object(request_id, "final_response", final_response)
    await tracker.update_request_status(request_id, RequestStatus.COMPLETED, progress=100)

async def _create_failed_transcription_response(request_id: str, tracker: RequestTracker, provider_name: str, error: str):
    """Create response for failed STT transcription with the new specified format"""
    final_response = {
        "request_id": request_id,
        "original_transcription": "",
        "enhanced_original_transcription": "",
        "enhanced_english_transcription": "",
        "enhanced_hindi_transcription": "",
        "note": f"{provider_name} STT transcription failed: {error}",
        "llm_enhancement_status": {"message": "LLM enhancement skipped due to STT failure."},
        "transcription_provider": f"{provider_name}_failed"
    }
    await tracker.store_object(request_id, "final_response", final_response)
    await tracker.update_request_status(request_id, RequestStatus.FAILED, error_message=error)

def _cleanup_audio_file(audio_path: str, stored_path: str, request_id: str):
    """Clean up audio files"""
    try:
        if audio_path and audio_path != stored_path and os.path.exists(audio_path):
            os.remove(audio_path)
    except Exception as e:
        logger.warning(f"Failed to cleanup audio file for request {request_id}: {e}")

# ======================= STATUS AND RESULT ENDPOINTS =======================

@router.get("/request/{request_id}/status")
async def get_request_status(request_id: str, tracker: RequestTracker = Depends(get_request_tracker)):
    """Get current status of any request"""
    status = await tracker.get_request_status(request_id)
    if not status:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {
        "request_id": request_id,
        "status": status["status"],
        "progress": status.get("progress_percentage", 0),
        "current_step": status.get("current_step"),
        "created_at": status["created_at"],
        "updated_at": status["updated_at"],
        "error_message": status.get("error_message")
    }

async def _get_result_response(request_id: str, tracker: RequestTracker, cleanup_files: bool = False):
    """Common logic for getting results"""
    status = await tracker.get_request_status(request_id)
    if not status:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if status["status"] == RequestStatus.COMPLETED:
        result = await tracker.get_object(request_id, "final_response")
        if result:
            if cleanup_files:
                file_storage.cleanup_request_files(request_id)
            return result
        else:
            raise HTTPException(status_code=500, detail="Result not found")
    elif status["status"] == RequestStatus.FAILED:
        if cleanup_files:
            file_storage.cleanup_request_files(request_id)
        raise HTTPException(status_code=500, detail={
            "error": f"Processing failed: {status.get('error_message', 'Unknown error')}",
            "request_id": request_id,
            "status": "failed"
        })
    else:
        return {
            "request_id": request_id,
            "status": status["status"],
            "progress": status.get("progress_percentage", 0),
            "current_step": status.get("current_step"),
            "message": "Processing not completed yet. Check status endpoint for updates."
        }

# Result endpoints
@router.get("/transcription/{request_id}/result")
async def get_transcription_result(request_id: str, tracker: RequestTracker = Depends(get_request_tracker)):
    """Get HuggingFace Whisper transcription result"""
    return await _get_result_response(request_id, tracker, cleanup_files=True)

@router.get("/transcription/jio/{request_id}/result")
async def get_jio_transcription_result(
    request_id: str, 
    tracker: RequestTracker = Depends(get_request_tracker)
):
    """Get Jio transcription result with language information"""
    return await _get_result_response(request_id, tracker, cleanup_files=True)

@router.get("/mom/{request_id}/result")
async def get_mom_result(request_id: str, tracker: RequestTracker = Depends(get_request_tracker)):
    """Get MOM generation result"""
    return await _get_result_response(request_id, tracker, cleanup_files=False)

@router.get("/agenda/{request_id}/result")
async def get_agenda_result(request_id: str, tracker: RequestTracker = Depends(get_request_tracker)):
    """Get agenda generation result"""
    return await _get_result_response(request_id, tracker, cleanup_files=False)

@router.get("/translate/{request_id}/result")
async def get_translation_result(request_id: str, tracker: RequestTracker = Depends(get_request_tracker)):
    """Get translation result"""
    return await _get_result_response(request_id, tracker, cleanup_files=False)

# ======================= HEALTH CHECK ENDPOINTS =======================

@router.get("/health/services")
async def health_check_services():
    """Check all service endpoints health"""
    return {
        "overall_status": "configurable_provider_integration",
        "active_providers": {
            "stt": settings.STT_PROVIDER,
        },
        "services": {
            "stt_active": {
                "provider": settings.STT_PROVIDER,
                "status": "active",
                "mode": "factory"
            },
            "llm_service": {
                "provider": "HuggingFace",
                "status": "configured" if llm_service.api_key else "not_configured"
            }
        },
        "available_endpoints": {
            "transcription_whisper": "/transcription/ (HuggingFace Whisper only)",
            "transcription_jio": f"/transcription/jio (Active provider: {settings.STT_PROVIDER})",
            "mom_generation": "/mom/generate/{language}",
            "agenda_generation": "/agenda/generate/{language} (from issues with IDs)",
            "agenda_update": "/agenda/update/{language} (with new issues)",
            "translation": "/translate"
        }
    }

# ======================= DEBUG ENDPOINTS =======================

@router.post("/debug/test-transcription-correction")
async def test_transcription_correction(text: str = Body(..., embed=True)):
    """Debug endpoint to test transcription correction"""
    try:
        # FIX: Run the blocking llm_service call in a separate thread
        result = await asyncio.to_thread(llm_service.correct_transcription, text)
        
        return {
            "status": "success",
            "input_text_length": len(text),
            "correction_result": result,
            "api_key_configured": bool(llm_service.api_key),
            "message": "This is a synchronous debug endpoint - no status/result URLs needed"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "input_text_length": len(text),
            "api_key_configured": bool(llm_service.api_key)
        }