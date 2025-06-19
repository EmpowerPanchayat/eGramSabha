import ffmpeg
import os
import logging
import shutil

logger = logging.getLogger(__name__)

class AudioExtractor:
    def __init__(self, output_format='wav'):
        self.output_format = output_format

    def extract_audio(self, input_file_path: str) -> str:
        """Extract or convert audio from video/audio files"""
        
        # Check if input file exists
        if not os.path.exists(input_file_path):
            raise FileNotFoundError(f"Input file not found: {input_file_path}")
        
        # Get file extension
        file_ext = os.path.splitext(input_file_path)[1].lower()
        audio_file_path = f"{os.path.splitext(input_file_path)[0]}.{self.output_format}"
        
        # List of audio file extensions
        audio_extensions = ['.wav', '.mp3', '.flac', '.aac', '.ogg', '.m4a', '.wma']
        video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm']
        
        logger.info(f"Processing file: {input_file_path} (extension: {file_ext})")
        
        try:
            if file_ext in audio_extensions:
                # If it's already an audio file
                if file_ext == f'.{self.output_format}':
                    # If it's already in the desired format, just copy it
                    if input_file_path != audio_file_path:
                        shutil.copy2(input_file_path, audio_file_path)
                        logger.info(f"Audio file copied: {audio_file_path}")
                    else:
                        # Same file, just return the path
                        logger.info(f"Audio file already in correct format: {input_file_path}")
                        return input_file_path
                else:
                    # Convert audio format
                    logger.info(f"Converting audio from {file_ext} to .{self.output_format}")
                    (
                        ffmpeg
                        .input(input_file_path)
                        .output(audio_file_path, ac=1, ar=16000, format='wav', acodec='pcm_s16le')
                        .overwrite_output()
                        .run(quiet=True, capture_stdout=True, capture_stderr=True)
                    )
                    logger.info(f"Audio conversion successful: {audio_file_path}")
            
            elif file_ext in video_extensions:
                # Extract audio from video
                logger.info(f"Extracting audio from video file: {input_file_path}")
                (
                    ffmpeg
                    .input(input_file_path)
                    .output(audio_file_path, ac=1, ar=16000, format='wav', acodec='pcm_s16le')
                    .overwrite_output()
                    .run(quiet=True, capture_stdout=True, capture_stderr=True)
                )
                logger.info(f"Audio extraction successful: {audio_file_path}")
            
            else:
                # Unknown file type, try to process it anyway
                logger.warning(f"Unknown file extension {file_ext}, attempting to process as media file")
                (
                    ffmpeg
                    .input(input_file_path)
                    .output(audio_file_path, ac=1, ar=16000, format='wav', acodec='pcm_s16le')
                    .overwrite_output()
                    .run(quiet=True, capture_stdout=True, capture_stderr=True)
                )
                logger.info(f"Audio processing successful: {audio_file_path}")
                
        except ffmpeg.Error as e:
            error_message = e.stderr.decode('utf-8') if e.stderr else str(e)
            logger.error(f"FFmpeg error processing {input_file_path}: {error_message}")
            raise Exception(f"Audio processing failed: {error_message}")
        except Exception as e:
            logger.exception(f"Audio processing failed for {input_file_path}")
            raise
            
        return audio_file_path

    def is_audio_file(self, file_path: str) -> bool:
        """Check if file is an audio file"""
        audio_extensions = ['.wav', '.mp3', '.flac', '.aac', '.ogg', '.m4a', '.wma']
        file_ext = os.path.splitext(file_path)[1].lower()
        return file_ext in audio_extensions

    def is_video_file(self, file_path: str) -> bool:
        """Check if file is a video file"""
        video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm']
        file_ext = os.path.splitext(file_path)[1].lower()
        return file_ext in video_extensions