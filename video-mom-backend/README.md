# Video MOM Backend

## Overview
The Video MOM Backend is a FastAPI application designed to process video files, extract audio, transcribe speech in multiple Indian languages, and generate minutes of meeting (MOM) summaries. This project leverages open-source models and APIs, primarily from Hugging Face, to provide a seamless experience for users needing to convert video content into actionable meeting notes.

## Features
- Upload video files for processing.
- Extract audio from various video formats.
- Transcribe audio using speech-to-text models that support multiple Indian languages.
- Generate concise minutes of meeting summaries from transcribed text.

## Project Structure
```
video-mom-backend
├── app
│   ├── api
│   │   └── endpoints.py        # Defines API endpoints for the application
│   ├── services
│   │   ├── audio_extractor.py   # Handles audio extraction from video files
│   │   ├── stt_transcriber.py    # Implements speech-to-text functionality
│   │   ├── mom_generator.py       # Generates meeting summaries from transcriptions
│   │   └── agent.py              # Coordinates the workflow between services
│   ├── core
│   │   ├── config.py             # Manages application configuration and environment variables
│   │   └── dependencies.py        # Defines shared resources and dependencies
│   └── main.py                   # Entry point of the FastAPI application
├── .env                           # Stores environment variables
├── requirements.txt               # Lists project dependencies
└── README.md                      # Documentation for the project
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd video-mom-backend
   ```

2. Create a virtual environment and activate it:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables in the `.env` file. Refer to the `.env.example` for required variables.

## Usage
1. Start the FastAPI application:
   ```
   uvicorn app.main:app --reload
   ```

2. Access the API documentation at `http://127.0.0.1:8000/docs`.

3. Use the endpoints to upload videos, transcribe audio, and generate meeting summaries.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.