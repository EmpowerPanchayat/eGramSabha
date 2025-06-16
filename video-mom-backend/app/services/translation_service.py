import logging
import time
import requests
from typing import Optional, Dict, Any, List
from googletrans import Translator
import re
import random

logger = logging.getLogger(__name__)

class RobustTranslationService:
    def __init__(self):
        self.translators = []
        self.current_translator_index = 0
        self.max_retries = 3
        self.retry_delay = 2
        self.rate_limit_delay = 5
        self.initialize_translators()

    def initialize_translators(self):
        """Initialize multiple translator instances with different service URLs"""
        service_urls = [
            ['translate.google.com'],
            ['translate.google.co.in'],
            ['translate.google.co.uk'],
            ['translate.google.com.au']
        ]
        
        for urls in service_urls:
            try:
                translator = Translator(service_urls=urls)
                self.translators.append(translator)
                logger.info(f"Initialized translator with URLs: {urls}")
            except Exception as e:
                logger.warning(f"Failed to initialize translator with {urls}: {e}")
        
        if not self.translators:
            # Fallback to default translator
            self.translators.append(Translator())
            logger.info("Using default translator as fallback")

    def _get_next_translator(self) -> Translator:
        """Get next available translator in round-robin fashion"""
        translator = self.translators[self.current_translator_index]
        self.current_translator_index = (self.current_translator_index + 1) % len(self.translators)
        return translator

    def _validate_and_clean_text(self, text: str) -> Optional[str]:
        """Validate and clean input text"""
        if not text or not isinstance(text, str):
            return None
        
        # Clean text
        text = text.strip()
        if not text:
            return None
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Limit text length (Google Translate has ~5000 char limit)
        if len(text) > 4500:
            text = text[:4500] + "..."
            logger.warning("Text truncated due to length limit")
        
        return text

    def _detect_language_safe(self, text: str) -> Optional[str]:
        """Safely detect language with multiple attempts"""
        for translator in self.translators:
            try:
                detection = translator.detect(text)
                if detection and hasattr(detection, 'lang') and detection.lang:
                    logger.info(f"Detected language: {detection.lang}")
                    return detection.lang
            except Exception as e:
                logger.warning(f"Language detection failed: {e}")
                continue
        return None

    def _translate_with_fallback(self, text: str, dest_lang: str) -> Optional[str]:
        """Translate with multiple fallback strategies"""
        cleaned_text = self._validate_and_clean_text(text)
        if not cleaned_text:
            return None

        # Try each translator with retries
        for translator_attempt in range(len(self.translators)):
            translator = self._get_next_translator()
            
            for retry in range(self.max_retries):
                try:
                    logger.info(f"Translation attempt {retry + 1} with translator {translator_attempt + 1}")
                    
                    # Add small random delay to avoid rate limiting
                    time.sleep(random.uniform(0.5, 1.5))
                    
                    result = translator.translate(cleaned_text, dest=dest_lang)
                    
                    if result and hasattr(result, 'text') and result.text:
                        translated_text = result.text.strip()
                        
                        # Validate translation quality
                        if self._is_valid_translation(cleaned_text, translated_text, dest_lang):
                            logger.info("Translation successful")
                            return translated_text
                    
                except Exception as e:
                    error_msg = str(e).lower()
                    
                    if 'json' in error_msg or 'nonetype' in error_msg:
                        logger.warning(f"Rate limiting detected on retry {retry + 1}")
                        if retry < self.max_retries - 1:
                            delay = self.rate_limit_delay * (retry + 1)
                            time.sleep(delay)
                            # Reinitialize translator
                            try:
                                translator = Translator(service_urls=translator.service_urls)
                            except:
                                translator = Translator()
                        continue
                    
                    elif 'timeout' in error_msg or 'connection' in error_msg:
                        logger.warning(f"Network error on retry {retry + 1}")
                        if retry < self.max_retries - 1:
                            time.sleep(self.retry_delay * (retry + 1))
                        continue
                    
                    else:
                        logger.error(f"Translation error on retry {retry + 1}: {e}")
                        if retry < self.max_retries - 1:
                            time.sleep(self.retry_delay)
                        continue

        logger.error("All translation attempts failed")
        return None

    def _is_valid_translation(self, original: str, translated: str, dest_lang: str) -> bool:
        """Validate translation quality"""
        if not translated or len(translated.strip()) == 0:
            return False
        
        # If translating to English and result is very similar to original, check if original was already English
        if dest_lang == 'en' and original.lower() == translated.lower():
            # This might be okay if original was already in English
            return True
        
        # Check for reasonable length difference (not too short, not too long)
        length_ratio = len(translated) / len(original)
        if length_ratio < 0.3 or length_ratio > 3.0:
            logger.warning(f"Suspicious translation length ratio: {length_ratio}")
            return False
        
        return True

    def translate_to_english(self, text: str) -> Optional[str]:
        """Translate text to English with comprehensive error handling"""
        if not text:
            logger.warning("Empty text provided for English translation")
            return None
        
        logger.info(f"Translating to English: '{text[:100]}...'")
        
        # Check if already in English
        detected_lang = self._detect_language_safe(text)
        if detected_lang == 'en':
            logger.info("Text already in English")
            return self._validate_and_clean_text(text)
        
        result = self._translate_with_fallback(text, 'en')
        
        if result:
            logger.info(f"English translation successful: '{result[:100]}...'")
            return result
        else:
            logger.error("English translation failed completely")
            return None

    def translate_to_language(self, text: str, target_language: str) -> Optional[str]:
        """Translate text to target language with comprehensive error handling"""
        if not text:
            logger.warning(f"Empty text provided for {target_language} translation")
            return None
        
        if target_language.lower() == 'en':
            return self.translate_to_english(text)
        
        logger.info(f"Translating to {target_language}: '{text[:100]}...'")
        
        result = self._translate_with_fallback(text, target_language)
        
        if result:
            logger.info(f"{target_language} translation successful: '{result[:100]}...'")
            return result
        else:
            logger.error(f"{target_language} translation failed completely")
            return None

    def is_service_healthy(self) -> bool:
        """Check if translation service is working"""
        try:
            test_result = self.translate_to_english("नमस्ते")  # "Hello" in Hindi
            return test_result is not None and "hello" in test_result.lower()
        except Exception:
            return False

# For backward compatibility, create an alias
class TranslationService(RobustTranslationService):
    pass