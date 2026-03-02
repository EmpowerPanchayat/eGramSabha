import ffmpeg
import os
import wave
import logging

logger = logging.getLogger(__name__)

class AudioExtractor:
    def __init__(self, output_format='wav'):
        self.output_format = output_format

    def _is_valid_wav(self, file_path: str) -> bool:
        """Check if a file is a valid WAV file with the required format (16kHz, mono, 16-bit PCM)."""
        try:
            with wave.open(file_path, 'rb') as wav_file:
                return (wav_file.getnchannels() == 1 and
                        wav_file.getsampwidth() == 2 and
                        wav_file.getframerate() == 16000)
        except Exception:
            return False

    def _convert_with_ffmpeg(self, input_file_path: str, output_file_path: str) -> str:
        """Convert audio to WAV format (16kHz, mono, 16-bit PCM) using ffmpeg."""
        logger.info(f"Converting audio to proper WAV format: {input_file_path}")
        (
            ffmpeg
            .input(input_file_path)
            .output(output_file_path, ac=1, ar=16000, format='wav', acodec='pcm_s16le')
            .overwrite_output()
            .run(quiet=True, capture_stdout=True, capture_stderr=True)
        )
        logger.info(f"Audio conversion successful: {output_file_path}")
        return output_file_path

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
                    # Even if the extension is .wav, the file may not be a valid WAV
                    # (e.g., browser MediaRecorder produces WebM/Ogg labeled as .wav)
                    if self._is_valid_wav(input_file_path):
                        logger.info(f"Audio file already in correct WAV format: {input_file_path}")
                        return input_file_path
                    else:
                        # File has .wav extension but is not valid WAV - convert it
                        logger.warning(f"File has .wav extension but is not valid WAV, converting: {input_file_path}")
                        temp_output = input_file_path + ".converting.wav"
                        self._convert_with_ffmpeg(input_file_path, temp_output)
                        os.replace(temp_output, input_file_path)
                        return input_file_path
                else:
                    # Convert audio format
                    logger.info(f"Converting audio from {file_ext} to .{self.output_format}")
                    self._convert_with_ffmpeg(input_file_path, audio_file_path)

            elif file_ext in video_extensions:
                # Extract audio from video
                logger.info(f"Extracting audio from video file: {input_file_path}")
                self._convert_with_ffmpeg(input_file_path, audio_file_path)

            else:
                # Unknown file type, try to process it anyway
                logger.warning(f"Unknown file extension {file_ext}, attempting to process as media file")
                self._convert_with_ffmpeg(input_file_path, audio_file_path)

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
