# eGramSabha Video MOM Backend

## Overview

The **eGramSabha Video MOM Backend** is a FastAPI-based backend service for processing Gram Sabha meeting recordings. It extracts audio from video, transcribes speech (primarily Hindi and Indian languages), and generates professional Minutes of Meeting (MOM) and agenda documents. The system is designed for asynchronous, robust, and scalable operation, with MongoDB for request tracking and FFmpeg for media processing.

---

## Features

- **Audio/Video Transcription**: Upload and process media files to generate accurate text transcriptions.
- **Audio Extraction**: Extracts audio from video files using FFmpeg.
- **Multi-language Speech-to-Text**: 
  - Jio Translate STT API (primary, for Hindi and regional languages)
  - Hugging Face Whisper models (fallback)
- **Transcription Enhancement**: Improves raw transcriptions using LLMs.
- **MOM Generation**: Generates structured, multilingual Minutes of Meeting documents.
- **Agenda Management**: Generates and updates meeting agendas from issue lists.
- **Asynchronous Processing**: All heavy tasks are non-blocking and status can be polled.
- **Chunked Processing**: Handles large files by splitting into chunks.
- **Temporary File Storage**: Uses `temp_storage/` for intermediate files.
- **File Cleanup**: Old files are cleaned up automatically.

---

## Technology Stack

- **Backend**: FastAPI (Python 3.9+)
- **Database**: MongoDB (Motor async driver)
- **Audio Processing**: FFmpeg (system dependency)
- **STT Services**: Jio Translate API, Hugging Face Whisper
- **LLM Services**: Hugging Face Cohere Command models

---

## Project Structure

```
video-mom-backend/
├── .env
├── README.md
├── requirements.txt
├── app/
│   ├── main.py
│   ├── api/
│   │   └── endpoints.py
│   ├── core/
│   │   ├── config.py
│   │   └── database.py
│   └── services/
│       ├── audio_extractor.py
│       ├── file_storage.py
│       ├── jio_only_stt_transcriber.py
│       ├── llm_service.py
│       ├── request_tracker.py
│       └── stt_transcriber.py
├── temp_storage/
```

---

## Installation

### Prerequisites

- Python 3.9 or higher
- MongoDB (local or remote)
- FFmpeg (must be in your system PATH)
- API keys for Jio Translate and Hugging Face

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd video-mom-backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install FFmpeg:**
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH.
   - Ubuntu: `sudo apt install ffmpeg`
   - macOS: `brew install ffmpeg`

5. **Set up MongoDB:**
   - Install locally or use MongoDB Atlas.
   - Ensure MongoDB is running on port 27017.

6. **Configure environment variables:**
   Create a `.env` file in the project root:
   ```env
   HF_TOKEN=your_huggingface_token
   STT_MODEL_ENDPOINT=https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo
   HUGGING_FACE_LLM_ENDPOINT=https://router.huggingface.co/cohere/compatibility/v1/chat/completions
   HF_LLM=command-a-03-2025
   JIO_API_KEY=your_jio_api_key
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=eGramSabha
   ```

---

## Usage

### Start the Application

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation

Visit [http://localhost:8000/docs](http://localhost:8000/docs) for Swagger UI.

---

## Main API Endpoints

- **POST** `/transcription/jio/{language}`  
  Upload audio/video for Jio STT transcription.

- **GET** `/transcription/jio/{request_id}/result`  
  Get Jio STT transcription result.

- **POST** `/mom/generate/{language}`  
  Generate MOM from transcription text.

- **GET** `/mom/{request_id}/result`  
  Get MOM generation result.

- **POST** `/agenda/generate/{language}`  
  Generate agenda from issues.

- **POST** `/agenda/update/{language}`  
  Update agenda with new issues.

- **GET** `/agenda/{request_id}/result`  
  Get agenda generation/update result.

- **GET** `/request/{request_id}/status`  
  Get status of any request.

- **GET** `/health`  
  Health check.

---

## Example Workflow

1. **Transcribe a file:**
   ```bash
   curl -X POST "http://localhost:8000/transcription/jio/Hindi" \
        -H "Content-Type: multipart/form-data" \
        -F "file=@meeting_video.mp4"
   ```
   - Returns: `{ "request_id": "..." }`

2. **Poll for result:**
   ```bash
   curl "http://localhost:8000/transcription/jio/<request_id>/result"
   ```

3. **Generate MOM:**
   ```bash
   curl -X POST "http://localhost:8000/mom/generate/en" \
        -H "Content-Type: application/json" \
        -d '{"transcription": "Full transcription text..."}'
   ```

4. **Generate Agenda:**
   ```bash
   curl -X POST "http://localhost:8000/agenda/generate/en" \
        -H "Content-Type: application/json" \
        -d '{"issues": [{"id": "issue_001", "transcription_text": "Hand pump not working", "category": "Infrastructure", "subcategory": "Water Supply"}]}'
   ```

---

## Configuration

### Environment Variables

| Variable                    | Description                                      | Required |
|-----------------------------|--------------------------------------------------|----------|
| `HF_TOKEN`                  | Hugging Face API token                           | Yes      |
| `JIO_API_KEY`               | Jio Translate API key                            | Yes      |
| `MONGODB_URL`               | MongoDB connection string                        | Yes      |
| `DATABASE_NAME`             | MongoDB database name                            | Yes      |
| `STT_MODEL_ENDPOINT`        | Hugging Face Whisper endpoint                    | Yes      |
| `HUGGING_FACE_LLM_ENDPOINT` | Hugging Face LLM endpoint                        | Yes      |
| `HF_LLM`                    | LLM model name (e.g., command-a-03-2025)         | Yes      |

### Audio Processing

- **Supported Formats**: MP4, MP3, WAV, AVI, MOV, etc. (any FFmpeg-compatible)
- **Audio Requirements**: Auto-converted to 16kHz, mono, 16-bit PCM WAV.

---

## Development

- **Run with debug logs and auto-reload:**
  ```bash
  uvicorn app.main:app --reload --log-level debug
  ```

- **Health check:**
  ```bash
  curl http://localhost:8000/health
  ```

---

## Troubleshooting

- **FFmpeg not found**: Ensure FFmpeg is installed and in your PATH.
- **MongoDB connection failed**: Check MongoDB service and `MONGODB_URL`.
- **API key errors**: Verify `HF_TOKEN` and `JIO_API_KEY` in `.env`.
- **Large file processing fails**: Check server memory/disk and chunking logic.
- **Poor transcription quality**: Check audio quality (background noise, volume, etc.).

---

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push to your branch.
5. Open a Pull Request.

---

## License

MIT License.

---

**Note:** This backend is optimized for Indian Panchayat governance and rural development use-cases.