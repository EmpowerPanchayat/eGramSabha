from googletrans import Translator
import logging

logger = logging.getLogger(__name__)

class TranslationService:
    def __init__(self):
        self.translator = Translator()

    def translate_to_english(self, text: str) -> str:
        try:
            result = self.translator.translate(text, dest='en')
            return result.text
        except Exception as e:
            logger.error(f"Translation to English failed: {e}")
            return text

    def translate_to_language(self, text: str, target_language: str) -> str:
        try:
            result = self.translator.translate(text, dest=target_language)
            return result.text
        except Exception as e:
            logger.error(f"Translation to {target_language} failed: {e}")
            return text