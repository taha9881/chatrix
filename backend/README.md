# Chatrix Backend

FastAPI backend for the Chatrix WhatsApp chat analyzer.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Configuration

All settings live in `backend/.env`. There are no defaults in code — the app will fail at startup if any variable is missing.

| Variable | Description |
|----------|-------------|
| `OLLAMA_MODEL` | Ollama model tag (e.g. `llama3.2:latest`) |
| `OLLAMA_BASE_URL` | Ollama server URL |
| `BEHAVIOR_SAMPLE_SIZE` | Random messages sampled per participant |
| `BEHAVIOR_MIN_WORDS` | Minimum word count per sampled message |
| `BEHAVIOR_PROMPT_MAX_MESSAGES` | Hard cap on messages sent to Ollama per call |
| `MESSAGE_TRUNCATE_CHARS` | Max characters per message in the prompt |
| `OLLAMA_TIMEOUT_SECONDS` | Request timeout for each call |
| `OLLAMA_NUM_PREDICT` | Max tokens generated per response |
| `OLLAMA_NUM_CTX` | Context window size |
| `OLLAMA_TEMPERATURE` | `0` recommended for faster structured output |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `MAX_UPLOAD_SIZE_MB` | Max ZIP upload size in MB |
| `UPLOADS_DIR` | Directory name for CSV exports (relative to backend) |
| `SESSIONS_DIR` | Directory name for session JSON files (relative to backend) |

## Run

```bash
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/health` | Detailed health |
| POST | `/upload` | Upload WhatsApp ZIP for analysis |
| POST | `/analyze-behavior` | Run Ollama trait analysis on session |

## Behavioral Analysis (Ollama)

Requires Ollama running locally with the model from `.env` pulled:

```bash
ollama pull llama3.2:latest
```

After uploading a chat, the response includes a `session_id`. Use it to analyze traits:

```bash
curl -X POST http://localhost:8000/analyze-behavior \
  -H "Content-Type: application/json" \
  -d '{"session_id": "YOUR_SESSION_ID"}'
```

Analyze a single participant:

```bash
curl -X POST http://localhost:8000/analyze-behavior \
  -H "Content-Type: application/json" \
  -d '{"session_id": "YOUR_SESSION_ID", "participant": "John"}'
```

Test script:

```bash
python analyze_behavior_sample.py
```
