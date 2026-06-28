# Chatrix — WhatsApp Chat Analytics Dashboard

A fully local, AI-powered analytics platform for WhatsApp chat exports. Upload a `.zip` export from WhatsApp, get rich visual analytics and AI-generated insights — no data ever leaves your machine.

---

## Features

### Analytics Dashboard

| Feature | Description |
|---------|-------------|
| **KPI Cards** | Animated counters for total messages, participants, active days, words sent, and media shared |
| **Message Contribution Heatmap** | Month-by-month activity grid across all years. Hover a cell to see a day-wise sparkline trend graph and message count. Click any cell to trigger an AI summary of that month |
| **Hour × Day Heatmap** | 24 × 7 matrix showing when the conversation is most active, with color intensity mapped to volume |
| **Participant Bars** | Ranked bar chart of every participant's share of messages and word count |
| **Top Words** | Word cloud of the 20 most-used words, excluding stopwords and filler phrases |
| **AI Behavior Analysis** | Per-participant trait profiling powered by a local Ollama LLM — streams results live as each participant is analyzed |
| **AI Month Summary** | Click any heatmap cell to open a modal with AI-generated topics (1-2 words each) and a narrative summary of the conversation that month |

### Heatmap Interactions

- **Hover** → tooltip with total message count + a day-wise sparkline trend graph (no axes, pure shape)
- **Click** → modal with:
  - **Top Topics** — 1-2 word topic chips extracted by the LLM (e.g. "Travel Plans", "Work Stress")
  - **Conversation Summary** — 3-5 sentence narrative of the month's vibe and social dynamics, with no message quotes or references

### AI Analysis (Behavior)

- Runs locally via [Ollama](https://ollama.com)
- Samples up to 50 messages per participant (≥ 4 words, media excluded)
- Produces structured output: overall summary, identified traits with confidence scores, communication style breakdown, and risk flags
- Supports English, Hinglish, mixed Hindi-English, slang, abbreviations, and emojis
- Streams participant results live — progress visible in real time

---

## Project Structure

```
chattrix/
├── backend/
│   ├── main.py                        # FastAPI app, chat parser, analytics builder, API routes
│   ├── config.py                      # Typed env-var loader (fails loudly on missing vars)
│   ├── agents/
│   │   ├── behavior_analyzer.py       # Ollama LLM caller for per-participant trait analysis
│   │   ├── month_summarizer.py        # Ollama LLM caller for per-month topic + summary
│   │   └── prompts/
│   │       ├── behavior_analysis.txt  # System prompt for behavior analysis
│   │       └── month_summary.txt      # System prompt for month summary
│   ├── schema/
│   │   ├── behavior_schemas.py        # Pydantic output schema for behavior analysis
│   │   └── month_summary_schema.py    # Pydantic output schema for month summary
│   ├── uploads/                       # CSV exports of parsed chats (auto-created)
│   └── sessions/                      # Session JSON files keyed by session_id (auto-created)
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Landing.jsx            # Upload page with drag-and-drop zone
    │   │   └── Dashboard.jsx          # Full analytics dashboard
    │   └── components/
    │       ├── KPICards.jsx           # Animated KPI metric cards
    │       ├── ContributionHeatmap.jsx # Month heatmap with sparkline tooltip + click summary
    │       ├── HourHeatmap.jsx        # Hour × weekday heatmap
    │       ├── ParticipantBars.jsx    # Ranked participant bar chart
    │       ├── BehaviorAnalysis.jsx   # Streaming AI behavior analysis UI
    │       ├── MonthSummaryModal.jsx  # Click-to-summary modal for heatmap cells
    │       ├── ChartTooltip.jsx       # Shared portal-based tooltip (avoids backdrop-filter clipping)
    │       └── ParticlesBg.jsx        # Animated canvas background
    └── public/
```

---

## Backend Setup

### Prerequisites

- Python 3.11+
- [Ollama](https://ollama.com) installed and running locally

### Install

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Configure

Copy `.env.sample` to `.env` and fill in your values. Every variable is required — the app will fail at startup if any are missing.

```bash
cp .env.sample .env
```

| Variable | Default in sample | Description |
|----------|-------------------|-------------|
| `OLLAMA_MODEL` | `llama3.2:latest` | Ollama model tag to use for all AI features |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_TEMPERATURE` | `0.4` | LLM sampling temperature |
| `OLLAMA_NUM_PREDICT` | `2048` | Max tokens per response |
| `OLLAMA_NUM_CTX` | `8192` | Context window size in tokens |
| `OLLAMA_TIMEOUT_SECONDS` | `180` | Per-request timeout in seconds |
| `BEHAVIOR_SAMPLE_SIZE` | `50` | Max messages sampled per participant for behavior analysis |
| `BEHAVIOR_MIN_WORDS` | `4` | Minimum word count for a message to be included in behavior sampling |
| `BEHAVIOR_PROMPT_MAX_MESSAGES` | `50` | Hard cap on messages passed to the LLM per call |
| `MESSAGE_TRUNCATE_CHARS` | `150` | Max characters per message in the behavior prompt |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Comma-separated allowed frontend origins |
| `MAX_UPLOAD_SIZE_MB` | `50` | Maximum ZIP upload size |
| `UPLOADS_DIR` | `uploads` | Folder for CSV exports (relative to `backend/`) |
| `SESSIONS_DIR` | `sessions` | Folder for session JSON files (relative to `backend/`) |

### Pull the model

```bash
ollama pull llama3.2:latest
```

### Run

```bash
uvicorn main:app --reload --port 8000
```

Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Root — confirms API is running |
| `GET` | `/health` | Health check with timestamp |
| `POST` | `/upload` | Upload a WhatsApp `.zip` export. Returns full analytics + `session_id` |
| `POST` | `/analyze-behavior` | Run behavior analysis on a session (blocking) |
| `POST` | `/analyze-behavior/stream` | Stream behavior analysis results as NDJSON, one event per participant |
| `POST` | `/month-summary` | Generate AI topic + summary for a specific month in a session |

### Upload

```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@WhatsApp_Chat_export.zip"
```

Returns:
```json
{
  "status": "success",
  "session_id": "abc123...",
  "kpi": { ... },
  "participants": [ ... ],
  "monthly_counts": { "2024-01": 312, ... },
  "daily_counts": { "2024-01": { "1": 14, "2": 8, ... }, ... },
  "hourly_weekday": [ [...], ... ],
  "top_words": [ "bhai", "okay", ... ]
}
```

### Behavior Analysis (streaming)

```bash
curl -X POST http://localhost:8000/analyze-behavior/stream \
  -H "Content-Type: application/json" \
  -d '{"session_id": "abc123"}'
```

Analyze a single participant:

```bash
curl -X POST http://localhost:8000/analyze-behavior/stream \
  -H "Content-Type: application/json" \
  -d '{"session_id": "abc123", "participant": "John"}'
```

Each NDJSON line is one of: `start` · `running` · `result` · `done` · `error`

### Month Summary

```bash
curl -X POST http://localhost:8000/month-summary \
  -H "Content-Type: application/json" \
  -d '{"session_id": "abc123", "month": "2024-03"}'
```

Returns:
```json
{
  "status": "success",
  "month": "2024-03",
  "message_count": 148,
  "topics": ["Travel Plans", "Work Stress", "Gaming", "Family"],
  "summary": "March saw the group in high spirits..."
}
```

---

## Frontend Setup

### Prerequisites

- Node.js 18+

### Install & Run

```bash
cd frontend
npm install
npm run dev
```

Opens at: [http://localhost:5173](http://localhost:5173)

Make sure the backend is running on port 8000 before uploading a file.

### Build for production

```bash
npm run build
```

---

## How It Works

1. **Upload** — drop a WhatsApp `.zip` export onto the landing page. The backend extracts the `.txt` chat log, parses every message (handles multiple date formats, Hinglish, media stubs, system messages), and computes all analytics in one pass.

2. **Session** — analytics and raw messages are saved to a JSON session file (`sessions/<id>.json`). The session ID and full analytics payload are stored in `localStorage` on the frontend.

3. **Dashboard** — the frontend reads analytics from `localStorage` and renders all charts instantly. No repeat API calls needed for the static analytics.

4. **Behavior Analysis** — clicking "Analyze" sends the `session_id` to the streaming endpoint. The backend samples messages per participant, calls Ollama with a structured-output prompt, and streams results back as they complete. The frontend renders each result live.

5. **Month Summary** — clicking a heatmap cell sends the `session_id` and `month` (e.g. `2024-03`) to `/month-summary`. The backend filters messages for that month, samples up to 150 evenly-spaced messages, calls Ollama, and returns structured topics + a narrative summary.

---

## Privacy

All processing is local. No message content, no analytics, and no personal data is sent to any external server. Ollama runs on your machine. The only network calls are between the browser and `localhost:8000`.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI · Python 3.11 · Uvicorn |
| AI / LLM | Ollama (local) · LangChain · Pydantic structured output |
| Frontend | React 18 · Vite · CSS Modules |
| Charts | Hand-rolled SVG (sparklines, heatmaps, bar charts) |
| Storage | Browser `localStorage` + local JSON session files |
