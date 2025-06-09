from transformers import pipeline
import os
import requests
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class MOMGenerator:
    def __init__(self):
        self.api_url = os.getenv("SUMMARIZATION_MODEL_ENDPOINT")
        self.api_key = os.getenv("HF_TOKEN")

    def generate_mom(self, transcribed_text: str) -> str:
        logger.info("Starting MOM generation")
        
        # Enhanced prompt engineering for better MOM
        prompt = f"""
You are an expert meeting assistant. Please create well-structured, professional Minutes of Meeting (MoM) from the following transcript. 

Guidelines:
- Use proper grammar and formal language
- Structure the content with clear headings
- Include key discussion points, decisions, and action items
- Make it concise but comprehensive

Meeting Transcript:
{transcribed_text}

Minutes of Meeting:
"""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "inputs": prompt
        }
        try:
            response = requests.post(self.api_url, headers=headers, json=payload)
            logger.info(f"MOM API response status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                # HuggingFace API returns a list of dicts with 'summary_text'
                if isinstance(result, list) and "summary_text" in result[0]:
                    logger.info("MOM generation successful (summary_text)")
                    return result[0]["summary_text"]
                # mT5 XLSum may return 'summary_text' or 'generated_text'
                if isinstance(result, list) and "generated_text" in result[0]:
                    logger.info("MOM generation successful (generated_text)")
                    return result[0]["generated_text"]
                # Some endpoints return just a string
                if isinstance(result, str):
                    logger.info("MOM generation successful (string result)")
                    return result
                logger.warning("MOM generation: Unexpected response format")
                return str(result)
            else:
                logger.error(f"MOM generation failed: {response.text}")
                raise Exception(f"Summarization API error: {response.text}")
        except Exception as e:
            logger.exception("Exception during MOM generation")
            raise