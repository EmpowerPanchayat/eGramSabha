import ffmpeg
import os
import logging

logger = logging.getLogger(__name__)

class AudioExtractor:
    def __init__(self, output_format='wav'):
        self.output_format = output_format

    def extract_audio(self, video_file_path: str) -> str:
        audio_file_path = f"{os.path.splitext(video_file_path)[0]}.{self.output_format}"
        logger.info(f"Extracting audio from {video_file_path} to {audio_file_path}")
        try:
            (
                ffmpeg
                .input(video_file_path)
                .output(audio_file_path, ac=1, ar=16000, format='wav', acodec='pcm_s16le')
                .overwrite_output()
                .run(quiet=True)
            )
            logger.info(f"Audio extraction successful: {audio_file_path}")
        except Exception as e:
            logger.exception(f"Audio extraction failed for {video_file_path}")
            raise
        return audio_file_path