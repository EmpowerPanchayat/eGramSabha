import os
import logging
import requests
import json
import base64
import subprocess
import wave
from pydub import AudioSegment
import tempfile
from app.core.config import settings

logger = logging.getLogger(__name__)

class JioTranslateSTTTranscriber:
    """Jio Translate STT Transcriber using the correct API format"""
    
    def __init__(self):
        self.api_key = settings.JIO_API_KEY
        self.endpoint = "https://sit.translate.jio/translator/stt"
        self.chunk_length_ms = 60 * 1000
        self.overlap_ms = 3 * 1000
        logger.info(f"Jio STT initialized: API key loaded -> {bool(self.api_key)}")
    
    def convert_to_wav(self, input_path, output_path):
        """Convert any audio file to 16kHz mono WAV format with 16-bit PCM encoding"""
        try:
            subprocess.run([
                "ffmpeg", "-y", "-i", input_path,
                "-ac", "1",              # Mono
                "-ar", "16000",          # 16kHz sample rate
                "-acodec", "pcm_s16le",  # 16-bit PCM
                "-vn",                   # No video
                output_path
            ], check=True, capture_output=True)
            return output_path
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg conversion failed: {e.stderr.decode('utf-8')}")
            raise Exception(f"Audio conversion failed: {e}")

    def validate_wav_format(self, wav_path):
        """Check if WAV file meets requirements (16kHz, mono, 16-bit)"""
        try:
            with wave.open(wav_path, 'rb') as wav_file:
                return (wav_file.getnchannels() == 1 and 
                        wav_file.getsampwidth() == 2 and 
                        wav_file.getframerate() == 16000)
        except Exception as e:
            logger.error(f"WAV validation failed: {str(e)}")
            return False

    def process_audio(self, input_path):
        """Ensure audio is in correct format for API"""
        temp_wav = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        temp_wav.close()
        
        if not input_path.lower().endswith('.wav'):
            return self.convert_to_wav(input_path, temp_wav.name)
        
        if not self.validate_wav_format(input_path):
            return self.convert_to_wav(input_path, temp_wav.name)
        
        import shutil
        shutil.copy2(input_path, temp_wav.name)
        return temp_wav.name

    def get_audio_duration(self, wav_path):
        """Get duration in seconds from WAV file"""
        with wave.open(wav_path, 'rb') as wav_file:
            frames = wav_file.getnframes()
            rate = wav_file.getframerate()
            return frames / float(rate)

    def transcribe_chunk(self, wav_path, language="Hindi"):
        """Send audio chunk to JioTranslate STT API using correct format"""
        try:
            if not os.path.exists(wav_path):
                logger.error(f"Audio file does not exist: {wav_path}")
                return None
            
            with open(wav_path, "rb") as f:
                audio_bytes = f.read()
                audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
            
            duration = self.get_audio_duration(wav_path)
            
            payload = {
                "audio": {
                    "content": audio_base64
                },
                "config": {
                    "encoding": "LINEAR16",
                    "language": language,
                    "sampleRateHertz": 16000
                },
                "platform": "jiotranslate",
                "duration": int(duration)
            }
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": self.api_key
            }
            
            response = requests.post(
                self.endpoint,
                headers=headers,
                data=json.dumps(payload),
                timeout=300
            )
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    return result
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON response: {e}")
                    return None
            else:
                logger.error(f"Jio API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Chunk transcription failed: {e}")
            return None

    def extract_transcript_from_result(self, result):
        """Extract transcript text from API result - Updated for new Jio API format"""
        try:
            if not result:
                return ""
            
            # NEW FORMAT: Check for direct recognized_text field
            if "recognized_text" in result:
                recognized_text = result["recognized_text"]
                if recognized_text and recognized_text.strip():
                    return recognized_text.strip()
                else:
                    return ""
            
            # FALLBACK: Check for old format with results array
            elif "results" in result:
                results = result["results"]
                if not results:
                    return ""
                
                transcript = ""
                for res in results:
                    if "alternatives" in res and res["alternatives"]:
                        transcript_part = res["alternatives"][0].get("transcript", "")
                        if transcript_part:
                            transcript += transcript_part + " "
                return transcript.strip()
            
            else:
                logger.error(f"Neither 'recognized_text' nor 'results' key found in response")
                return ""
                    
        except Exception as e:
            logger.error(f"Error extracting transcript: {e}")
            return ""

    def create_smart_chunks(self, audio, total_length):
        """Create overlapping chunks with smart boundary detection"""
        chunks_info = []
        step_size = self.chunk_length_ms - self.overlap_ms
        
        start = 0
        i = 0
        while start < total_length:
            end = min(start + self.chunk_length_ms, total_length)
            
            chunk_info = {
                'index': i,
                'start': start,
                'end': end,
                'is_first': i == 0,
                'is_last': end >= total_length,
                'overlap_start': self.overlap_ms if i > 0 else 0,
                'overlap_end': self.overlap_ms if end < total_length else 0
            }
            chunks_info.append(chunk_info)
            
            start += step_size
            i += 1

        logger.info(f"Created {len(chunks_info)} overlapping chunks")
        return chunks_info

    def remove_overlap_from_transcript(self, current_transcript, previous_transcript, overlap_seconds):
        """Remove overlapping content from transcript using word-level matching"""
        if not previous_transcript or overlap_seconds <= 0:
            return current_transcript
        
        if not current_transcript or not current_transcript.strip():
            return current_transcript
        
        current_words = current_transcript.split()
        previous_words = previous_transcript.split()
        
        if not current_words or not previous_words:
            return current_transcript
        
        max_overlap_words = min(len(current_words), len(previous_words), 
                               max(1, int(overlap_seconds * 2)))
        
        best_match_length = 0
        
        for overlap_length in range(1, max_overlap_words + 1):
            if overlap_length >= len(current_words) * 0.7:
                break
                
            current_start = current_words[:overlap_length]
            previous_end = previous_words[-overlap_length:]
            
            if [w.lower() for w in current_start] == [w.lower() for w in previous_end]:
                best_match_length = overlap_length
        
        if best_match_length > 0:
            if best_match_length >= len(current_words):
                return current_transcript
            
            trimmed_words = current_words[best_match_length:]
            if trimmed_words:
                return ' '.join(trimmed_words)
            else:
                return current_transcript
        
        return current_transcript

    def transcribe_audio(self, audio_file_path: str, language: str = "Hindi") -> str:
        """Transcribe audio using Jio Translate with smart overlapping chunks"""
        processed_path = None
        chunk_files = []
        
        try:
            if not self.api_key:
                raise Exception("Jio API key not configured")
            
            logger.info(f"Starting Jio transcription for: {audio_file_path}")
            
            processed_path = self.process_audio(audio_file_path)
            audio = AudioSegment.from_wav(processed_path)
            total_length = len(audio)
            
            if total_length <= self.chunk_length_ms:
                result = self.transcribe_chunk(processed_path, language)
                if result:
                    transcript = self.extract_transcript_from_result(result)
                    if transcript and transcript.strip():
                        return transcript.strip()
                    else:
                        raise Exception("Direct transcription returned empty result")
                else:
                    raise Exception("Direct transcription failed")
            
            logger.info(f"Audio duration: {total_length/1000:.1f}s, creating chunks")
            chunks_info = self.create_smart_chunks(audio, total_length)
            
            transcripts = []
            failed_chunks = 0
            empty_chunks = 0
            
            for chunk_info in chunks_info:
                start = chunk_info['start']
                end = chunk_info['end']
                chunk_index = chunk_info['index']
                
                try:
                    chunk = audio[start:end]
                    
                    chunk_file = tempfile.NamedTemporaryFile(suffix=f'_chunk_{chunk_index}.wav', delete=False)
                    chunk_file.close()
                    chunk_files.append(chunk_file.name)
                    
                    chunk.export(chunk_file.name, format="wav")
                    
                    result = self.transcribe_chunk(chunk_file.name, language)
                    
                    if result:
                        chunk_transcript = self.extract_transcript_from_result(result)
                        
                        if chunk_transcript and chunk_transcript.strip():
                            if chunk_index > 0 and transcripts:
                                overlap_seconds = self.overlap_ms / 1000
                                previous_transcript = transcripts[-1]
                                chunk_transcript = self.remove_overlap_from_transcript(
                                    chunk_transcript, previous_transcript, overlap_seconds
                                )
                                
                                if not chunk_transcript or not chunk_transcript.strip():
                                    chunk_transcript = self.extract_transcript_from_result(result)
                            
                            if chunk_transcript and chunk_transcript.strip():
                                transcripts.append(chunk_transcript.strip())
                            else:
                                empty_chunks += 1
                        else:
                            empty_chunks += 1
                    else:
                        failed_chunks += 1
                        
                except Exception as e:
                    logger.error(f"Error processing chunk {chunk_index + 1}: {e}")
                    failed_chunks += 1
                    continue
            
            successful_chunks = len(transcripts)
            logger.info(f"Processing summary: {successful_chunks} successful, {empty_chunks} empty, {failed_chunks} failed out of {len(chunks_info)} total")
            
            if not transcripts:
                error_msg = f"No chunks produced valid transcripts. Empty: {empty_chunks}, Failed: {failed_chunks}, Total: {len(chunks_info)}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            combined_transcript = self._combine_transcripts_safely(transcripts)
            
            if combined_transcript and combined_transcript.strip():
                logger.info(f"Jio transcription successful, final length: {len(combined_transcript)} characters")
                return combined_transcript.strip()
            else:
                error_msg = f"Combined transcript is empty despite {successful_chunks} successful chunks"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except Exception as e:
            logger.error(f"Jio transcription failed: {e}")
            raise
        finally:
            if processed_path and os.path.exists(processed_path):
                try:
                    os.unlink(processed_path)
                except:
                    pass
            
            for chunk_file in chunk_files:
                if os.path.exists(chunk_file):
                    try:
                        os.unlink(chunk_file)
                    except:
                        pass

    def _combine_transcripts_safely(self, transcripts):
        """Safely combine transcripts with validation"""
        if not transcripts:
            return ""
        
        valid_transcripts = [t.strip() for t in transcripts if t and t.strip()]
        
        if not valid_transcripts:
            return ""
        
        combined = ' '.join(valid_transcripts)
        
        import re
        combined = re.sub(r'\s+', ' ', combined).strip()
        
        return combined

class JioOnlySTTTranscriber:
    """Wrapper for Jio-only STT service"""
    
    def __init__(self):
        self.jio_transcriber = JioTranslateSTTTranscriber()
        logger.info(f"Jio-Only STT Transcriber initialized")
    
    def transcribe_audio(self, audio_file_path: str, language: str = "Hindi") -> str:
        """Transcribe audio using only Jio Translate API with smart chunking"""
        try:
            if not self.jio_transcriber.api_key:
                logger.error("Jio API key not configured properly. Check your .env file.")
                raise Exception("Jio API key not configured properly. Check your .env file.")
            
            logger.info(f"Starting Jio Translate transcription for: {audio_file_path}")
            result = self.jio_transcriber.transcribe_audio(audio_file_path, language)
            
            if result and result.strip():
                logger.info(f"Jio Translate transcription successful, length: {len(result)}")
                return result.strip()
            else:
                raise Exception("Jio Translate returned empty transcription")
                
        except Exception as e:
            logger.error(f"Jio Translate transcription failed: {e}")
            raise Exception(f"Jio Translate transcription failed: {str(e)}")

# Create global instance
jio_only_stt_transcriber = JioOnlySTTTranscriber()