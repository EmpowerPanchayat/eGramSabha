import os
import requests
import json
import logging
import re
from typing import Dict, Any, Optional
from app.core.config import settings # Make sure settings is imported

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.api_key = settings.HF_TOKEN
        self.hugging_face_api_url = settings.HUGGING_FACE_LLM_ENDPOINT
        self.model_name = settings.HF_LLM
        
        # Validation
        if not self.hugging_face_api_url:
            logger.error("HUGGING_FACE_LLM_ENDPOINT not configured in environment variables")
        if not self.model_name:
            logger.error("HF_LLM not configured in environment variables")
        
        logger.info(f"LLM Service initialized with Hugging Face API: {self.hugging_face_api_url}")
        logger.info(f"Using model: {self.model_name}")
        logger.info(f"API key configured: {bool(self.api_key)}")
        
    def _get_headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def _make_chat_request(self, messages: list, max_tokens: int = 8000) -> Optional[Dict]:
        """Make request to Hugging Face chat completions API with proper token validation"""
        if not self.api_key:
            logger.error("HF_TOKEN not configured - cannot make API requests")
            return None
        
        # Validate and cap max_tokens for Cohere model
        model_max_tokens = 8192  # Cohere command-a-03-2025 limit
        if max_tokens > model_max_tokens:
            logger.warning(f"Requested {max_tokens} tokens exceeds model limit {model_max_tokens}, capping to safe limit")
            max_tokens = min(4000, model_max_tokens - 500)  # Leave buffer for input tokens
            
        try:
            logger.info(f"Making chat request to Hugging Face API with {len(messages)} messages")
            logger.debug(f"Request payload: model={self.model_name}, max_tokens={max_tokens}")
            
            payload = {
                "model": self.model_name,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.3,
                "top_p": 0.9
            }
            
            response = requests.post(
                self.hugging_face_api_url,
                headers=self._get_headers(), 
                json=payload, 
                timeout=600
            )
            
            logger.info(f"Hugging Face API response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info("Hugging Face API request successful")
                logger.debug(f"Response keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
                return result
            elif response.status_code == 400:
                # Handle token limit errors specifically
                error_text = response.text
                if "too many tokens" in error_text:
                    logger.error(f"Token limit error: {error_text}")
                logger.error(f"Bad request: {error_text}")
                return None
            elif response.status_code == 503:
                logger.warning(f"Model {self.model_name} is loading - service unavailable")
                return None
            else:
                logger.error(f"Hugging Face API error: {response.status_code}")
                logger.error(f"Response text: {response.text}")
                return None
                
        except requests.exceptions.Timeout as e:
            logger.error(f"Timeout error for Hugging Face API: {e}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error for Hugging Face API: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error for Hugging Face API: {e}")
            return None
    
    def correct_transcription(self, transcription: str) -> Dict[str, str]:
        """
        Correct and enhance transcription using Hugging Face chat API.
        Relies entirely on the LLM's expert prompt.
        """
        logger.info(f"Starting transcription correction for text length: {len(transcription) if transcription else 0}")
        
        if not transcription or not transcription.strip():
            logger.warning("Empty transcription provided")
            return {
                "enhanced_original": "",
                "enhanced_hindi": "",
                "enhanced_english": "",
                "error": "Empty input transcription"
            }
        
        input_for_llm = transcription.strip()
        
        logger.info("Attempting Hugging Face API for transcription correction and translation using expert prompt")
        api_result = self._try_enhanced_correction_with_expert_prompt(input_for_llm)
        
        if api_result:
            logger.info("Successfully processed transcription with expert prompt")
            return api_result
        
        logger.error("LLM processing for transcription correction failed using expert prompt.")
        return {
            "enhanced_original": input_for_llm,
            "enhanced_hindi": "",
            "enhanced_english": "",
            "error": "LLM correction/translation failed"
        }
    
    def _try_enhanced_correction_with_expert_prompt(self, transcription: str) -> Optional[Dict[str, str]]:
        """Enhanced correction using the specified expert rural development prompt with intelligent chunking."""
        logger.info("Using expert rural development prompt for transcription correction")
        
        # Check if transcription is too long for single request
        max_chars = 2000  # Safe limit for Cohere model
        
        if len(transcription) > max_chars:
            logger.info(f"Transcription too long ({len(transcription)} chars), using chunked processing")
            return self._process_transcription_in_chunks(transcription)
        
        # Process normally for shorter transcriptions
        return self._process_single_transcription_chunk(transcription)
    
    def _process_transcription_in_chunks(self, transcription: str) -> Optional[Dict[str, str]]:
        """Process large transcription in overlapping chunks with improved merging"""
        chunk_size = 1500
        overlap = 200
        
        # Clean transcription before chunking
        cleaned_transcription = self._preprocess_transcription(transcription)
        chunks = self._split_into_smart_chunks(cleaned_transcription, chunk_size, overlap)
        
        logger.info(f"Split transcription into {len(chunks)} chunks for processing")
        
        enhanced_chunks = []
        english_chunks = []
        hindi_chunks = []
        processing_errors = []
        
        for i, chunk in enumerate(chunks):
            logger.info(f"Processing chunk {i+1}/{len(chunks)} (length: {len(chunk)})")
            
            try:
                result = self._process_single_transcription_chunk(chunk)
                
                if result and not result.get("error"):
                    enhanced_chunks.append({
                        "index": i,
                        "text": result.get("enhanced_original", chunk),
                        "success": True,
                        "original_chunk": chunk
                    })
                    english_chunks.append({
                        "index": i,
                        "text": result.get("enhanced_english", ""),
                        "success": True,
                        "original_chunk": chunk
                    })
                    hindi_chunks.append({
                        "index": i,
                        "text": result.get("enhanced_hindi", chunk),
                        "success": True,
                        "original_chunk": chunk
                    })
                    logger.info(f"Chunk {i+1} processed successfully")
                else:
                    # Fallback to original chunk
                    error_msg = result.get("error", "Unknown error") if result else "No response"
                    processing_errors.append(f"Chunk {i+1}: {error_msg}")
                    enhanced_chunks.append({
                        "index": i,
                        "text": chunk,
                        "success": False,
                        "original_chunk": chunk
                    })
                    english_chunks.append({
                        "index": i,
                        "text": "",
                        "success": False,
                        "original_chunk": chunk
                    })
                    hindi_chunks.append({
                        "index": i,
                        "text": chunk,
                        "success": False,
                        "original_chunk": chunk
                    })
                    logger.warning(f"Chunk {i+1} failed, using fallback: {error_msg}")
                    
            except Exception as e:
                error_msg = f"Exception processing chunk {i+1}: {str(e)}"
                processing_errors.append(error_msg)
                logger.error(error_msg)
                
                # Fallback to original chunk
                enhanced_chunks.append({
                    "index": i,
                    "text": chunk,
                    "success": False,
                    "original_chunk": chunk
                })
                english_chunks.append({
                    "index": i,
                    "text": "",
                    "success": False,
                    "original_chunk": chunk
                })
                hindi_chunks.append({
                    "index": i,
                    "text": chunk,
                    "success": False,
                    "original_chunk": chunk
                })
        
        # Merge chunks with improved logic
        final_result = {
            "enhanced_original": self._merge_chunks_intelligently([c["text"] for c in enhanced_chunks]),
            "enhanced_english": self._merge_chunks_intelligently([c["text"] for c in english_chunks if c["text"].strip()]),
            "enhanced_hindi": self._merge_chunks_intelligently([c["text"] for c in hindi_chunks]),
            "processing_summary": {
                "total_chunks": len(chunks),
                "successful_chunks": sum(1 for c in enhanced_chunks if c["success"]),
                "failed_chunks": sum(1 for c in enhanced_chunks if not c["success"]),
                "errors": processing_errors,
                "chunk_details": [
                    {
                        "index": c["index"],
                        "success": c["success"],
                        "length": len(c["text"]),
                        "original_length": len(c["original_chunk"])
                    } for c in enhanced_chunks
                ]
            }
        }
        
        # Add debug information
        logger.info(f"Merging results:")
        logger.info(f"  Enhanced chunks: {len([c for c in enhanced_chunks if c['text']])}")
        logger.info(f"  English chunks: {len([c for c in english_chunks if c['text'].strip()])}")
        logger.info(f"  Hindi chunks: {len([c for c in hindi_chunks if c['text']])}")
        
        if processing_errors:
            final_result["error"] = f"Partial processing completed with {len(processing_errors)} errors"
        else:
            final_result["error"] = None
        
        logger.info(f"Chunked processing completed. Success rate: {final_result['processing_summary']['successful_chunks']}/{len(chunks)}")
        return final_result

    def _preprocess_transcription(self, transcription: str) -> str:
        """Clean and preprocess transcription before chunking"""
        if not transcription:
            return transcription
        
        import re
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', transcription)
        
        # Remove "foreign" markers
        text = re.sub(r'\bforeign\b', '', text, flags=re.IGNORECASE)
        
        # Remove excessive repetitions (like "जादा हो जादा हो जादा हो...")
        words = text.split()
        cleaned_words = []
        prev_word = ""
        repeat_count = 0
        
        for word in words:
            if word.lower() == prev_word.lower():
                repeat_count += 1
                if repeat_count <= 2:  # Allow max 2 repetitions
                    cleaned_words.append(word)
            else:
                cleaned_words.append(word)
                repeat_count = 0
            prev_word = word
        
        # Remove excessive single character repetitions
        text = ' '.join(cleaned_words)
        text = re.sub(r'\b(\w)\1{5,}\b', r'\1\1', text)  # Reduce excessive character repetition
        
        # Clean up multiple punctuation
        text = re.sub(r'[।.]{3,}', '।', text)
        text = re.sub(r'[,]{2,}', ',', text)
        
        return text.strip()

    def _split_into_smart_chunks(self, text: str, chunk_size: int, overlap: int) -> list:
        """Split text into overlapping chunks at natural boundaries"""
        import re
        
        if len(text) <= chunk_size:
            return [text]
        
        # First try to split by sentences (Hindi and English)
        sentence_endings = r'[।.!?]+\s+'
        sentences = re.split(sentence_endings, text)
        
        chunks = []
        current_chunk = []
        current_length = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            sentence_length = len(sentence)
            
            # If adding this sentence would exceed chunk size and we have content
            if current_length + sentence_length > chunk_size and current_chunk:
                # Create chunk from current sentences
                chunk_text = '. '.join(current_chunk)
                if chunk_text.strip():
                    chunks.append(chunk_text + '.')
                
                # Start new chunk with overlap (last few sentences)
                if len(current_chunk) > 2:
                    overlap_sentences = current_chunk[-2:]  # Keep last 2 sentences for context
                    current_chunk = overlap_sentences + [sentence]
                    current_length = sum(len(s) for s in current_chunk) + len(current_chunk)
                else:
                    current_chunk = [sentence]
                    current_length = sentence_length
            else:
                current_chunk.append(sentence)
                current_length += sentence_length
        
        # Add final chunk
        if current_chunk:
            chunk_text = '. '.join(current_chunk)
            if chunk_text.strip():
                chunks.append(chunk_text + '.')
        
        # If sentence-based splitting didn't work well, fall back to word-based
        if len(chunks) == 1 and len(text) > chunk_size:
            logger.info("Sentence-based chunking ineffective, using word-based chunking")
            return self._split_by_words(text, chunk_size, overlap)
        
        logger.info(f"Created {len(chunks)} chunks using sentence boundaries")
        return chunks

    def _split_by_words(self, text: str, chunk_size: int, overlap: int) -> list:
        """Fallback method to split by words"""
        words = text.split()
        chunks = []
        
        start = 0
        while start < len(words):
            # Calculate words that fit in chunk_size characters
            current_chunk_words = []
            current_length = 0
            
            for i in range(start, len(words)):
                word_length = len(words[i]) + 1  # +1 for space
                if current_length + word_length <= chunk_size:
                    current_chunk_words.append(words[i])
                    current_length += word_length
                else:
                    break
            
            if current_chunk_words:
                chunks.append(' '.join(current_chunk_words))
                
                # Move start with overlap
                overlap_words = min(overlap // 10, len(current_chunk_words) // 2)  # Roughly 10 chars per word
                start += len(current_chunk_words) - overlap_words
            else:
                # If even a single word is too long, include it anyway
                if start < len(words):
                    chunks.append(words[start])
                    start += 1
                else:
                    break
        
        return chunks

    def _merge_chunks_intelligently(self, chunks: list) -> str:
        """Intelligently merge processed chunks with overlap detection and deduplication"""
        if not chunks:
            return ""
        
        # Filter out empty chunks
        valid_chunks = [chunk.strip() for chunk in chunks if chunk and chunk.strip()]
        
        if not valid_chunks:
            return ""
        
        if len(valid_chunks) == 1:
            return valid_chunks[0]
        
        logger.info(f"Merging {len(valid_chunks)} chunks")
        
        # Start with first chunk
        merged = valid_chunks[0]
        
        for i in range(1, len(valid_chunks)):
            current_chunk = valid_chunks[i]
            
            # Try to find overlap between end of merged text and start of current chunk
            overlap_found = False
            merged_words = merged.split()
            current_words = current_chunk.split()
            
            # Check for word-level overlap (up to 15 words)
            max_overlap_check = min(15, len(merged_words), len(current_words))
            
            for overlap_size in range(max_overlap_check, 0, -1):
                if len(merged_words) >= overlap_size and len(current_words) >= overlap_size:
                    merged_suffix = merged_words[-overlap_size:]
                    current_prefix = current_words[:overlap_size]
                    
                    # Check if they match (case-insensitive for better matching)
                    if [w.lower() for w in merged_suffix] == [w.lower() for w in current_prefix]:
                        # Found overlap, merge by taking merged text + remaining part of current
                        remaining_words = current_words[overlap_size:]
                        if remaining_words:
                            merged += " " + " ".join(remaining_words)
                        overlap_found = True
                        logger.debug(f"Found {overlap_size}-word overlap when merging chunk {i+1}")
                        break
            
            if not overlap_found:
                # No overlap found, check if current chunk is a substring of merged (avoid duplication)
                if current_chunk.lower() not in merged.lower():
                    # Add with a space separator
                    merged += " " + current_chunk
                    logger.debug(f"No overlap found, appending chunk {i+1} with space")
                else:
                    logger.debug(f"Chunk {i+1} appears to be duplicate, skipping")
        
        # Final cleanup
        merged = re.sub(r'\s+', ' ', merged).strip()
        
        logger.info(f"Final merged text length: {len(merged)} characters")
        return merged

    def _merge_chunks(self, chunks: list) -> str:
        """Legacy merge method - now calls the intelligent merge"""
        return self._merge_chunks_intelligently(chunks)

    def _process_single_transcription_chunk(self, transcription: str) -> Optional[Dict[str, str]]:
        """Process a single transcription chunk with improved error handling"""
        system_prompt_content = (
            "You are an expert in rural development and deeply familiar with Indian Panchayat-level issues and regional languages. "
            "Given the following potentially inaccurate transcription, correct it based on your expertise and provide "
            "the corrected transcription, its English translation and Hindi translation."
            "\n\nIMPORTANT: Your entire response MUST be a single, valid JSON object. Do not include any text, explanations, or markdown formatting before or after the JSON block. "
            "The JSON object must have these exact keys:\n"
            "{\n"
            "  \"corrected_transcription\": \"<The corrected and improved transcription>\",\n"
            "  \"english_translation\": \"<An accurate English translation of the corrected text>\",\n"
            "  \"hindi_translation\": \"<The corrected Hindi transcription, identical to the corrected_transcription value>\"\n"
            "}"
        )

        messages = [
            {
                "role": "system",
                "content": system_prompt_content
            },
            {
                "role": "user",
                "content": f"Here is the transcription to correct and translate:\n\n---\n\n{transcription}"
            }
        ]
        
        try:
            # Use conservative token limit to avoid truncation
            result = self._make_chat_request(messages, max_tokens=8000)
                   
            if result and "choices" in result and len(result["choices"]) > 0:
                choice = result["choices"][0]
                content = choice["message"]["content"].strip()
                
                # Check if response was truncated
                finish_reason = choice.get("finish_reason")
                if finish_reason == "length":
                    logger.warning("LLM response was truncated due to length limit")
                
                logger.info(f"Received expert correction response, length: {len(content)}, finish_reason: {finish_reason}")
                
                parsed = self._parse_expert_json_response(content, transcription)
                if parsed:
                    return parsed
                else:
                    logger.error("Failed to parse JSON from LLM response")
                    return {
                        "enhanced_original": transcription,
                        "enhanced_english": "",
                        "enhanced_hindi": transcription,
                        "error": "JSON parsing failed"
                    }
            else:
                logger.error("Invalid or empty response structure from expert prompt API call.")
                return {
                    "enhanced_original": transcription,
                    "enhanced_english": "",
                    "enhanced_hindi": transcription,
                    "error": "Invalid API response structure"
                }
                    
        except Exception as e:
            logger.error(f"Exception during expert correction: {e}")
            return {
                "enhanced_original": transcription,
                "enhanced_english": "",
                "enhanced_hindi": transcription,
                "error": f"Processing exception: {str(e)}"
            }

    def _make_chat_request(self, messages: list, max_tokens: int = 8000) -> Optional[Dict]:
        """Make request to Hugging Face chat completions API with proper token validation"""
        if not self.api_key:
            logger.error("HF_TOKEN not configured - cannot make API requests")
            return None
        
        # Validate and cap max_tokens for Cohere model
        model_max_tokens = 8192  # Cohere command-a-03-2025 limit
        if max_tokens > model_max_tokens:
            logger.warning(f"Requested {max_tokens} tokens exceeds model limit {model_max_tokens}, capping to safe limit")
            max_tokens = min(4000, model_max_tokens - 500)  # Leave buffer for input tokens
            
        try:
            logger.info(f"Making chat request to Hugging Face API with {len(messages)} messages")
            logger.debug(f"Request payload: model={self.model_name}, max_tokens={max_tokens}")
            
            payload = {
                "model": self.model_name,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.3,
                "top_p": 0.9
            }
            
            response = requests.post(
                self.hugging_face_api_url,
                headers=self._get_headers(), 
                json=payload, 
                timeout=600
            )
            
            logger.info(f"Hugging Face API response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info("Hugging Face API request successful")
                logger.debug(f"Response keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
                return result
            elif response.status_code == 400:
                # Handle token limit errors specifically
                error_text = response.text
                if "too many tokens" in error_text:
                    logger.error(f"Token limit error: {error_text}")
                logger.error(f"Bad request: {error_text}")
                return None
            elif response.status_code == 503:
                logger.warning(f"Model {self.model_name} is loading - service unavailable")
                return None
            else:
                logger.error(f"Hugging Face API error: {response.status_code}")
                logger.error(f"Response text: {response.text}")
                return None
                
        except requests.exceptions.Timeout as e:
            logger.error(f"Timeout error for Hugging Face API: {e}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error for Hugging Face API: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error for Hugging Face API: {e}")
            return None
    
    def generate_multilingual_mom(self, transcription: str, primary_language: str = "en") -> Dict[str, str]:
        """Generate Minutes of Meeting in multiple languages"""
        primary_language = primary_language.lower()
        mom_input = transcription
        
        # Generate multilingual MOM
        result = self._generate_multilingual_mom_with_llm(mom_input, primary_language)
        return result

    def _generate_multilingual_mom_with_llm(self, transcription: str, primary_language: str) -> Dict[str, str]:
        """Generate MOM in multiple languages using LLM"""
        primary_language = primary_language.lower()
        # Use regular string concatenation to avoid f-string brace conflicts
        system_prompt = (
            "You are an expert in creating formal Minutes of Meeting (MOM) documents from meeting transcriptions, "
            "with deep knowledge of Indian Panchayat-level issues and regional languages. "
            "Your task is to generate a professional MOM in English and Hindi (or another requested language) based on the provided meeting transcript.\n\n"
            
            "1. Input: A meeting transcript (provided by user)\n"
            "2. Output: A VALID JSON STRING (parseable with json.loads()) with these exact keys:\n"
            "{\n"
            '  \"english_mom\": \"Plain text MOM in English (no formatting)\",\n'
            '  \"hindi_mom\": \"Plain text MOM in Hindi (no formatting)\",\n'
            f'  \"{primary_language}_mom\": \"MOM in the requested primary language\"\n'
            "}\n\n"
            
            "3. MOM Structure:\n"
            "- Meeting Overview (Date, Time, Attendees, Location)\n"
            "- Key Discussion Points (Organized by topic/issue)\n"
            "- Decisions Made (Clear, actionable resolutions)\n"
            "- Action Items (Who is responsible, what they must do, and by when)\n"
            "- Next Steps (Future meetings, follow-ups, deadlines)\n\n"
            
            "4. Strict Rules:\n"
            "1. Use formal, professional language suitable for government records.\n"
            "2. Keep content clear and simple for villagers to understand.\n"
            "3. Include specific details (names, locations, dates) where available.\n"
            "4. Organize information logically and chronologically.\n"
            "5. Do not add any information not present in the transcript.\n"
            "6. Ensure consistency across all language versions.\n"
            "7. No formatting (plain text only inside JSON).\n"
            "8. Return ONLY the JSON object, no additional text or explanations."
        )

        messages = [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": (
                    "Generate detailed Minutes of Meeting (MOM) from this Gram Sabha meeting transcription:\n\n"
                    f"Transcription:\n{transcription}\n\n"
                    f"Primary language requested: {primary_language}\n\n"
                    "Create comprehensive, well-structured MOMs that capture all key discussions, decisions, and action items.\n"
                    f"Return as JSON with {primary_language}_mom, english_mom, and hindi_mom keys."
                )
            }
        ]

        try:
            result = self._make_chat_request(messages, max_tokens=8000)
            
            if not result:
                error_msg = "MOM generation failed: LLM API returned no result."
                return {
                    f"{primary_language}_mom": error_msg,
                    "english_mom": error_msg,
                    "hindi_mom": error_msg,
                    "status": "failed_llm_no_result"
                }
            
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"].strip()
                parsed = self._parse_multilingual_response(content, primary_language, "mom")
                
                if parsed:
                    parsed["status"] = "success"
                    return parsed
                else:
                    error_msg = "MOM generation failed: Could not parse LLM response."
                    return {
                        f"{primary_language}_mom": error_msg,
                        "english_mom": error_msg,
                        "hindi_mom": error_msg,
                        "status": "failed_parsing"
                    }
            else:
                error_msg = "MOM generation failed: LLM returned invalid response structure."
                return {
                    f"{primary_language}_mom": error_msg,
                    "english_mom": error_msg,
                    "hindi_mom": error_msg,
                    "status": "failed_llm_structure"
                }
                    
        except Exception as e:
            logger.error(f"Exception during multilingual MOM generation: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            error_msg = f"MOM generation failed: LLM API error - {str(e)}"
            return {
                f"{primary_language}_mom": error_msg,
                "english_mom": error_msg,
                "hindi_mom": error_msg,
                "status": "failed_exception"
            }

    def _synthesize_final_mom(self, combined_summary: str, primary_language: str) -> Dict[str, str]:
        """Creates a final, structured MOM from a collection of key points."""
        logger.info(f"Synthesizing MOM from combined summary of length {len(combined_summary)}")
        primary_language = primary_language.lower()
        # Use string concatenation to avoid f-string brace conflicts
        system_prompt = (
            "You are an expert in creating formal Minutes of Meeting (MOM) documents from meeting summaries "
            "and are deeply familiar with Indian Panchayat-level issues.\n"
            "You will be given a collection of key points, decisions, and action items extracted from a meeting. "
            "Your task is to synthesize these points into a single, coherent, well-structured MOM document.\n\n"
            "Return your response as a single JSON object with these keys:\n"
            f"- {primary_language}_mom: The final, formatted MOM in the requested language.\n"
            "- english_mom: The final, formatted MOM in English.\n"
            "- hindi_mom: The final, formatted MOM in Hindi.\n\n"
            "MOM STRUCTURE:\n"
            "1. Meeting Overview (Date, Time, Attendees - if available)\n"
            "2. Key Discussion Points (Organized by topic)\n"
            "3. Decisions Made\n"
            "4. Action Items (Who, What, When)\n\n"
            "RULES:\n"
            "- Use the provided points to build the MOM. Do not add information not present in the source.\n"
            "- Organize the information logically.\n"
            "- Ensure the final output is professional and well-formatted.\n"
            f"- The primary language for the MOM should be {primary_language}, but provide both English and Hindi versions.\n"
            "- Return ONLY the JSON object, no additional text or explanations."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Synthesize a final MOM from these collected points:\n\n---\n{combined_summary}"}
        ]

        try:
            result = self._make_chat_request(messages, max_tokens=8000)
            
            # DEBUG: Save LLM result to file for synthesis step too
            self._save_llm_debug_result(result, combined_summary, primary_language, "mom_synthesis")
            
            if result and "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"].strip()
                parsed = self._parse_multilingual_response(content, primary_language, "mom")
                if parsed:
                    parsed["status"] = "success"
                    return parsed
        except Exception as e:
            logger.error(f"Exception during final MOM synthesis: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

        error_msg = "MOM generation failed: Could not synthesize the final MOM from summaries."
        return {
            f"{primary_language}_mom": error_msg,
            "english_mom": error_msg,
            "hindi_mom": error_msg,
            "status": "failed_reduce_step"
        }

    def _normalize_agenda_items(self, agenda_list):
        """Ensure each agenda item has title/description as objects with at least an 'en' key."""
        normalized = []
        for item in agenda_list:
            new_item = dict(item)
            # Normalize title
            if isinstance(new_item.get('title'), str):
                new_item['title'] = {'en': new_item['title']}
            elif isinstance(new_item.get('title'), dict):
                # Already a dict, do nothing
                pass
            # Normalize description
            if isinstance(new_item.get('description'), str):
                new_item['description'] = {'en': new_item['description']}
            elif isinstance(new_item.get('description'), dict):
                pass
            normalized.append(new_item)
        return normalized

    def generate_multilingual_agenda_from_issues(self, issues: list, primary_language: str = "en") -> Dict[str, str]:
        """Generate agenda from issues in multiple languages"""
        primary_language = primary_language.lower()
        logger.info(f"Starting multilingual agenda generation for language: {primary_language}")
        
        if not issues:
            error_msg = "Agenda generation failed: No issues provided."
            return {
                f"{primary_language}_agenda": error_msg,
                "english_agenda": error_msg,
                "hindi_agenda": error_msg,
                "status": "failed_no_issues"
            }

        result = self._generate_multilingual_agenda_with_llm(issues, primary_language)
        # --- Normalize agenda items in all languages ---
        for lang in [primary_language, 'english', 'hindi']:
            key = f"{lang}_agenda"
            if key in result and isinstance(result[key], list):
                result[key] = self._normalize_agenda_items(result[key])
        return result

    def _generate_multilingual_agenda_with_llm(self, issues: list, primary_language: str) -> Dict[str, str]:
        """Generate agenda from issues in multiple languages using LLM with consistent format"""
        primary_language = primary_language.lower()
        issues_text = self._format_issues_for_prompt(issues)
        
        # Use regular string concatenation to avoid f-string brace conflicts
        system_prompt = (
            "You are an expert secretary for Gram Sabha meetings and deeply familiar with Indian Panchayat-level issues and regional languages.\n\n"
            "Your task is to create a structured meeting agenda from a list of issues, clustering similar issues together. "
            "You must provide the agenda in English, Hindi, and a requested primary language.\n\n"
            
            "1. Input: A list of issues (provided by user)\n"
            "2. Output: A VALID JSON STRING (parseable with json.loads()) with these exact keys:\n"
            "{\n"
            f'  "{primary_language}_agenda": "A list of structured agenda items in the requested primary language",\n'
            '  "english_agenda": "A list of structured agenda items in English",\n'
            '  "hindi_agenda": "A list of structured agenda items in Hindi"\n'
            "}\n\n"
            
            "3. Agenda Item Structure (Each item in the list must be a JSON object):\n"
            "{\n"
            '   "title": "Very short problem summary (5-8 words)",\n'
            '   "description": "1-line plain language explanation",\n'
            '   "issue_ids": {\n'
            '        "issue_id": "a 2-3 word summary of issue"\n'
            '    }\n'
            "}\n\n"

            "4. Strict Rules:\n"
            "1. GROUP similar issues by matching their core problems (ignore minor wording differences).\n"
            "2. For each group, create ONE agenda item.\n"
            "3. Never split the same issue ID across multiple items.\n"
            "4. Keep titles specific (include location if relevant).\n"
            "5. Make descriptions clear and simple for villagers to understand.\n"
            "6. Ensure consistency across all language versions.\n"
            "7. Return ONLY the JSON object, no additional text or explanations."
        )

        messages = [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": f"""Convert these {len(issues)} issues into clustered agenda items:

                {issues_text}

                Primary language requested: {primary_language}

                Create comprehensive, well-structured agendas that properly group similar issues together.
                "Ensure each agenda item contains BOTH 'linked_issues' (array of issue IDs) and 'issue_ids' (mapping of issue IDs to short labels)."
                Return as JSON with {primary_language}_agenda, english_agenda, and hindi_agenda keys."""
            }
        ]

        try:
            result = self._make_chat_request(messages, max_tokens=8000)
            
            if result and "choices" in result and len(result["choices"]) > 0:
                choice = result["choices"][0]
                content = choice["message"]["content"].strip()
                finish_reason = choice.get("finish_reason", "unknown")

                logger.info(f"LLM response finish_reason: {finish_reason}")
                if finish_reason == "length":
                    logger.warning("⚠️ LLM response was likely cut off due to token limit")

                parsed = self._parse_multilingual_response(content, primary_language, "agenda")
                
                if parsed:
                    parsed["status"] = "success"
                    return parsed
                else:
                    error_msg = "Agenda generation failed: Could not parse LLM response."
                    return {
                        f"{primary_language}_agenda": error_msg,
                        "english_agenda": error_msg,
                        "hindi_agenda": error_msg,
                        "status": "failed_parsing"
                    }
            else:
                error_msg = "Agenda generation failed: LLM returned invalid response structure."
                return {
                    f"{primary_language}_agenda": error_msg,
                    "english_agenda": error_msg,
                    "hindi_agenda": error_msg,
                    "status": "failed_llm_structure"
                }
                    
        except Exception as e:
            logger.error(f"Exception during multilingual agenda generation: {e}")
            error_msg = "Agenda generation failed: LLM API error."
            return {
                f"{primary_language}_agenda": error_msg,
                "english_agenda": error_msg,
                "hindi_agenda": error_msg,
                "status": "failed_exception"
            }

    def update_multilingual_agenda_with_issues(self, current_agenda: list, new_issues: list, primary_language: str = "en") -> Dict[str, str]:
        """Update agenda with new issues in multiple languages"""
        primary_language = primary_language.lower()
        logger.info(f"Starting multilingual agenda update for language: {primary_language}")
        
        if not new_issues:
            # Generate current agenda in all languages if no new issues
            current_agenda_text = json.dumps(current_agenda, indent=2, ensure_ascii=False)
            return self._convert_agenda_to_multilingual(current_agenda_text, primary_language)
        
        if not current_agenda and new_issues:
            # Generate new agenda from issues if no current agenda
            return self.generate_multilingual_agenda_from_issues(new_issues, primary_language)

        result = self._update_multilingual_agenda_with_llm(current_agenda, new_issues, primary_language)
        # --- Normalize agenda items in all languages ---
        for lang in [primary_language, 'english', 'hindi']:
            key = f"{lang}_agenda"
            if key in result and isinstance(result[key], list):
                result[key] = self._normalize_agenda_items(result[key])
        return result

    def _update_multilingual_agenda_with_llm(self, current_agenda: list, new_issues: list, primary_language: str) -> Dict[str, str]:
        """Update agenda with new issues in multiple languages using LLM with consistent format"""
        
        current_agenda_text = json.dumps(current_agenda, indent=2, ensure_ascii=False)
        new_issues_text = self._format_issues_for_prompt(new_issues)
        primary_language = primary_language.lower()
        system_prompt = (
            "You are an expert secretary for Gram Sabha meetings and deeply familiar with Indian Panchayat-level issues and regional languages.\n\n"
            "Your task is to update a structured meeting agenda from a list of issues, clustering similar issues together. "
            "You must provide the updated agenda in English, Hindi, and a requested primary language.\n\n"

            "1. Input:\n"
            "- A current agenda (as a JSON-formatted string).\n"
            "- A list of new issues to integrate.\n\n"

            "2. Output: A VALID JSON STRING (parseable with json.loads()) with these exact keys:\n"
            "{\n"
            f'  "{primary_language}_agenda": "The updated list of structured agenda items in the requested language",\n'
            '  "english_agenda": "The updated list of structured agenda items in English",\n'
            '  "hindi_agenda": "The updated list of structured agenda items in Hindi"\n'
            "}\n\n"

            "3. Agenda Item Structure (Each item in the list must be a JSON object with the following 4 fields:\n"
            "{\n"
            '   "title": "Very short problem summary (5-8 words)",\n'
            '   "description": "1-line plain language explanation",\n'
            '   "linked_issues": [ "issue_id1", "issue_id2" ],\n'
            '   "issue_ids": {\n'
            '        "issue_id1": "short label",\n'
            '        "issue_id2": "short label"\n'
            '    }\n'
            "}\n\n"

            "Both `linked_issues` and `issue_ids` are mandatory for each agenda item.\n"
            "`linked_issues` should be an array of valid issue IDs.\n"
            "`issue_ids` must be a mapping from issue ID → short summary of that specific issue (2-4 words).\n\n"

            "4. Strict Rules:\n"
            "1. GROUP similar issues by matching their core problems (ignore minor wording differences).\n"
            "2. For each group, create ONE agenda item with proper `linked_issues` and `issue_ids`.\n"
            "3. Never split the same issue ID across multiple items.\n"
            "4. Keep titles specific (include location if relevant).\n"
            "5. Make descriptions clear and simple for villagers to understand.\n"
            "6. Ensure consistency across all language versions.\n"
            "7. Return ONLY the JSON object, no additional text or explanations."
        )

        messages = [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": f"""Update this agenda by integrating the new issues:

                Current Agenda (structured format):
                {current_agenda_text}

                New Issues to Integrate:
                {new_issues_text}

                Primary language requested: {primary_language}

                Create updated, well-structured agendas that properly integrate the new issues.
                Return as JSON with {primary_language}_agenda, english_agenda, and hindi_agenda keys."""
            }
        ]

        try:
            result = self._make_chat_request(messages, max_tokens=8000)
            
            if result and "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"].strip()
                parsed = self._parse_multilingual_response(content, primary_language, "agenda")
                
                if parsed:
                    parsed["status"] = "success"
                    return parsed
                else:
                    error_msg = "Agenda update failed: Could not parse LLM response."
                    return {
                        f"{primary_language}_agenda": error_msg,
                        "english_agenda": error_msg,
                        "hindi_agenda": error_msg,
                        "status": "failed_parsing"
                    }
            else:
                error_msg = "Agenda update failed: LLM returned invalid response structure."
                return {
                    f"{primary_language}_agenda": error_msg,
                    "english_agenda": error_msg,
                    "hindi_agenda": error_msg,
                    "status": "failed_llm_structure"
                }
                    
        except Exception as e:
            logger.error(f"Exception during multilingual agenda update: {e}")
            error_msg = "Agenda update failed: LLM API error."
            return {
                f"{primary_language}_agenda": error_msg,
                "english_agenda": error_msg,
                "hindi_agenda": error_msg,
                "status": "failed_exception"
            }

    def _format_issues_for_prompt(self, issues: list) -> str:
        """Format issues data for the LLM prompt"""
        formatted_issues = []
        for issue in issues:
            issue_text = f"""Issue ID: {issue.get('id', 'N/A')}
Category: {issue.get('category', 'General')}
Subcategory: {issue.get('subcategory', 'N/A')}
Description: {issue.get('description', issue.get('transcription', 'No description available'))}
---"""
            formatted_issues.append(issue_text)
        return "\n".join(formatted_issues)

    def _parse_multilingual_response(self, content: str, primary_language: str, content_type: str) -> Optional[Dict[str, str]]:
        """Parse multilingual response from LLM"""
        primary_language = primary_language.lower()
        try:
            if not content:
                logger.error(f"Empty content received for multilingual {content_type}")
                return None
            
            # Find JSON in response
            match = re.search(r"\{.*\}", content, re.DOTALL)
            if match:
                json_str = match.group(0)
            else:
                logger.warning(f"No JSON found in multilingual {content_type} response, trying full content")
                json_str = content

            parsed_json = json.loads(json_str)
            
            # Expected keys
            primary_key = f"{primary_language}_{content_type}"
            english_key = f"english_{content_type}"
            hindi_key = f"hindi_{content_type}"
            
            result = {}
            
            # Extract each language version
            if primary_key in parsed_json:
                result[primary_key] = parsed_json[primary_key]
            else:
                logger.warning(f"Primary key {primary_key} not found in response")
                result[primary_key] = f"Primary {content_type} not generated"
            
            if english_key in parsed_json:
                result[english_key] = parsed_json[english_key]
            else:
                logger.warning(f"English key {english_key} not found in response")
                result[english_key] = f"English {content_type} not generated"
            
            if hindi_key in parsed_json:
                result[hindi_key] = parsed_json[hindi_key]
            else:
                logger.warning(f"Hindi key {hindi_key} not found in response")
                result[hindi_key] = f"Hindi {content_type} not generated"
            
            logger.info(f"Successfully parsed multilingual {content_type} response")
            return result
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from multilingual {content_type} response: {e}")
        except Exception as e:
            logger.error(f"Error parsing multilingual {content_type} response: {e}")
        return None

    def _convert_agenda_to_multilingual(self, agenda_text: str, primary_language: str) -> Dict[str, str]:
        """Convert existing agenda text to multiple languages"""
        primary_language = primary_language.lower()
        messages = [
            {
                "role": "system",
                "content": f"""Convert the given agenda to multiple languages.
                Return as JSON with {primary_language}_agenda, english_agenda, and hindi_agenda keys.
                Maintain the same structure and content, just translate appropriately."""
            },
            {
                "role": "user",
                "content": f"""Convert this agenda to English and Hindi:

                {agenda_text}

                Return as JSON with {primary_language}_agenda, english_agenda, and hindi_agenda keys."""
            }
        ]

        try:
            result = self._make_chat_request(messages, max_tokens=8000)
            
            if result and "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"].strip()
                parsed = self._parse_multilingual_response(content, primary_language, "agenda")
                
                if parsed:
                    parsed["status"] = "success"
                    return parsed
            
            # Fallback
            return {
                f"{primary_language}_agenda": agenda_text,
                "english_agenda": agenda_text,
                "hindi_agenda": agenda_text,
                "status": "fallback_same_content"
            }
                    
        except Exception as e:
            logger.error(f"Exception during agenda conversion: {e}")
            return {
                f"{primary_language}_agenda": agenda_text,
                "english_agenda": agenda_text,
                "hindi_agenda": agenda_text,
                "status": "fallback_exception"
            }

    def translate_text(self, text: str, target_language: str) -> Dict[str, Any]:
        """Translate text using Hugging Face chat API. Relies 100% on LLM."""
        logger.info(f"Starting translation to {target_language} for text length: {len(text) if text else 0}")
        
        if not text or not text.strip():
            logger.warning("Empty text provided for translation")
            return {
                "text": "",
                "status": "failed",
                "error": "No text provided",
                "fallback_used": False
            }
        
        input_text_stripped = text.strip()
        logger.info("Attempting Hugging Face API for translation")
        api_result = self._try_chat_translation(input_text_stripped, target_language)
        
        if api_result is not None:
            logger.info("Successfully used Hugging Face API for translation")
            return {
                "text": api_result,
                "status": "success",
                "error": None,
                "fallback_used": False
            }
        
        logger.error(f"LLM translation to {target_language} failed for text: {input_text_stripped[:50]}...")
        return {
            "text": "",
            "status": "failed",
            "error": "LLM translation failed",
            "fallback_used": False
        }
    
    def _try_chat_translation(self, text: str, target_language: str) -> Optional[str]:
        """Try translation with Hugging Face chat API and detailed logging"""
        logger.info(f"Preparing translation request for {target_language}")
        
        messages = [
            {
                "role": "system",
                "content": f"You are an expert translator. Translate the given text to {target_language}. Respond only with the translated text, no additional explanation or formatting."
            },
            {
                "role": "user",
                "content": f"Translate this text to {target_language}: {text}"
            }
        ]
        
        try:
            estimated_output_tokens = len(text.split()) * 2 + 50
            max_tokens_for_translation = max(200, estimated_output_tokens)

            logger.info("Sending translation request to Hugging Face API")
            result = self._make_chat_request(messages, max_tokens=max_tokens_for_translation) 
            
            if result and "choices" in result and len(result["choices"]) > 0:
                translated = result["choices"][0]["message"]["content"].strip()
                logger.info(f"Received translation, length: {len(translated) if translated else 0}")
                return translated
            else:
                logger.error("Invalid response structure for translation")
                return None
                    
        except Exception as e:
            logger.error(f"Exception during translation with Hugging Face API: {e}")
        return None

    def _parse_expert_json_response(self, content: str, original_transcription: str) -> Optional[Dict[str, str]]:
        """Parse JSON response from expert LLM correction prompt"""
        try:
            if not content:
                logger.error("Empty content received from expert prompt")
                return None
            
            # Try to find JSON in the response
            import re
            
            # First try to extract JSON block
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                logger.warning("No JSON block found, trying full content as JSON")
                json_str = content.strip()
            
            # Parse JSON
            parsed_json = json.loads(json_str)
            
            # Extract expected fields
            corrected_transcription = parsed_json.get("corrected_transcription", "")
            english_translation = parsed_json.get("english_translation", "")
            hindi_translation = parsed_json.get("hindi_translation", "")
            
            # Validate that we got meaningful results
            if not corrected_transcription and not english_translation and not hindi_translation:
                logger.error("All fields empty in parsed JSON response")
                return None
            
            # Map to expected output format
            result = {
                "enhanced_original": corrected_transcription or original_transcription,
                "enhanced_english": english_translation,
                "enhanced_hindi": hindi_translation or corrected_transcription or original_transcription,
                "error": None
            }
            
            logger.info("Successfully parsed expert JSON response")
            logger.debug(f"Parsed result keys: {list(result.keys())}")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from expert response: {e}")
            logger.debug(f"Content that failed to parse: {content[:500]}...")
        except KeyError as e:
            logger.error(f"Missing expected key in expert JSON response: {e}")
        except Exception as e:
            logger.error(f"Unexpected error parsing expert JSON response: {e}")
        
        # Return fallback result
        logger.warning("Returning fallback result due to parsing failure")
        return {
            "enhanced_original": original_transcription,
            "enhanced_english": "",
            "enhanced_hindi": original_transcription,
            "error": "JSON parsing failed"
        }

    def _create_fallback_response(self, original_transcription: str) -> Dict[str, str]:
        """Create a fallback response when LLM processing fails"""
        logger.info("Creating fallback response due to LLM failure")
        return {
            "enhanced_original": original_transcription,
            "enhanced_hindi": original_transcription,  # Assume it's Hindi
            "enhanced_english": "",  # Empty since we can't translate without LLM
            "error": "LLM processing failed - using original transcription"
        }

# Global LLM service instance
llm_service = LLMService()