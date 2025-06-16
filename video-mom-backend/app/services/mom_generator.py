from transformers import pipeline
import os
import requests
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

class MOMGenerator:
    def __init__(self):
        self.model_name = os.getenv("SUMMARIZATION_MODEL_NAME", "deepseek-ai/DeepSeek-R1-0528")
        self.api_key = os.getenv("HF_TOKEN")
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_name}"

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
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=120)
            logger.info(f"MOM API response status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                # Handle various possible response formats
                if isinstance(result, list):
                    # DeepSeek and similar models may return a list of dicts
                    if "summary_text" in result[0]:
                        logger.info("MOM generation successful (summary_text)")
                        return result[0]["summary_text"]
                    if "generated_text" in result[0]:
                        logger.info("MOM generation successful (generated_text)")
                        return result[0]["generated_text"]
                if isinstance(result, dict):
                    # Some models may return a dict directly
                    if "summary_text" in result:
                        logger.info("MOM generation successful (summary_text in dict)")
                        return result["summary_text"]
                    if "generated_text" in result:
                        logger.info("MOM generation successful (generated_text in dict)")
                        return result["generated_text"]
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