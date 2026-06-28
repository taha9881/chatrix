import csv
import json
import os
import re
import uuid
import zipfile
import tempfile
import asyncio
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import config
from agents.behavior_analyzer import (
    analyze_all_participants,
    analyze_participant,
    sample_messages_for_person,
)
from agents.month_summarizer import summarize_month

app = FastAPI(title="Chatrix API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = config.UPLOADS_DIR
SESSIONS_DIR = config.SESSIONS_DIR

# ── WhatsApp chat parser ──────────────────────────────────────────────────────

WHATSAPP_LINE = re.compile(
    r"^(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}),?\s+"
    r"(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\s+-\s+"
    r"([^:]+?):\s+(.*)",
    re.IGNORECASE,
)

MEDIA_OMITTED = re.compile(r"<Media omitted>|<\u202fattachment: .*?>", re.IGNORECASE)
SYSTEM_MSG    = re.compile(
    r"Messages and calls are end-to-end encrypted|"
    r"changed the group|added|removed|left|created group|changed this group",
    re.IGNORECASE,
)

DATE_FORMATS = [
    "%d/%m/%Y, %H:%M",
    "%m/%d/%Y, %H:%M",
    "%d/%m/%y, %H:%M",
    "%m/%d/%y, %H:%M",
    "%d/%m/%Y, %I:%M\u202f%p",
    "%m/%d/%Y, %I:%M\u202f%p",
    "%d/%m/%Y, %I:%M %p",
    "%m/%d/%Y, %I:%M %p",
    "%d-%m-%Y, %H:%M",
    "%m-%d-%Y, %H:%M",
]


def parse_dt(date_str: str, time_str: str) -> Optional[datetime]:
    raw = f"{date_str}, {time_str}".replace("\u202f", " ")
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def parse_chat_file(text: str) -> list[dict]:
    messages = []
    current: Optional[dict] = None

    for line in text.splitlines():
        m = WHATSAPP_LINE.match(line)
        if m:
            if current:
                messages.append(current)
            date_str, time_str, sender, body = m.groups()
            sender = sender.strip()
            body   = body.strip()
            if SYSTEM_MSG.search(body) or SYSTEM_MSG.search(sender):
                current = None
                continue
            dt = parse_dt(date_str.strip(), time_str.strip())
            current = {
                "date":     date_str.strip(),
                "time":     time_str.strip(),
                "datetime": dt,
                "sender":   sender,
                "message":  body,
                "is_media": bool(MEDIA_OMITTED.search(body)),
            }
        elif current and line.strip():
            current["message"] += "\n" + line.strip()

    if current:
        messages.append(current)

    return messages


def extract_chat_from_zip(zip_bytes: bytes) -> tuple[str, str]:
    """Returns (chat_text, chat_name_from_filename)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        zip_path = os.path.join(tmpdir, "chat.zip")
        with open(zip_path, "wb") as f:
            f.write(zip_bytes)

        with zipfile.ZipFile(zip_path, "r") as zf:
            txt_files = [n for n in zf.namelist() if n.endswith(".txt")]
            if not txt_files:
                raise ValueError("No .txt chat file found inside the ZIP.")
            # Prefer the largest txt file (the actual chat vs readme)
            txt_files.sort(key=lambda n: zf.getinfo(n).file_size, reverse=True)
            with zf.open(txt_files[0]) as tf:
                text = tf.read().decode("utf-8", errors="replace")
            # Extract a human-readable name from the txt filename
            raw_name = os.path.splitext(os.path.basename(txt_files[0]))[0]
            chat_name = (
                raw_name
                .replace("WhatsApp Chat with ", "")
                .replace("WhatsApp Chat - ", "")
                .replace("_chat", "")
                .strip()
            ) or raw_name
            return text, chat_name


def save_csv(messages: list[dict], chat_name: str) -> str:
    safe_name  = re.sub(r"[^\w\-]", "_", chat_name)[:50]
    timestamp  = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path   = UPLOADS_DIR / f"{timestamp}_{safe_name}.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "time", "sender", "message", "is_media"])
        writer.writeheader()
        for msg in messages:
            writer.writerow({
                "date":     msg["date"],
                "time":     msg["time"],
                "sender":   msg["sender"],
                "message":  msg["message"],
                "is_media": msg["is_media"],
            })
    return csv_path


def duration_str(days: int) -> str:
    if days < 1:
        return "Less than a day"
    years  = days // 365
    months = (days % 365) // 30
    rem    = days % 30
    parts  = []
    if years:
        parts.append(f"{years}y")
    if months:
        parts.append(f"{months}mo")
    if rem and not years:
        parts.append(f"{rem}d")
    return " ".join(parts) if parts else f"{days}d"


def build_analytics(messages: list[dict], chat_name: str) -> dict:
    if not messages:
        return {}

    # ── Core counts ──────────────────────────────────────────────────────────
    senders     = [m["sender"] for m in messages]
    total       = len(messages)
    media_count = sum(1 for m in messages if m["is_media"])
    total_words = sum(len(m["message"].split()) for m in messages if not m["is_media"])
    participants_ordered = list(dict.fromkeys(senders))

    # ── Per participant ───────────────────────────────────────────────────────
    per_person: dict[str, dict] = {}
    for sender, count in Counter(senders).items():
        person_msgs = [m for m in messages if m["sender"] == sender and not m["is_media"]]
        word_count  = sum(len(m["message"].split()) for m in person_msgs)
        per_person[sender] = {"messages": count, "words": word_count}

    participants_sorted = sorted(
        [{"name": k, "messages": v["messages"], "words": v["words"],
          "percent": round(v["messages"] / total * 100, 1)}
         for k, v in per_person.items()],
        key=lambda x: x["messages"], reverse=True
    )

    most_active       = participants_sorted[0]["name"] if participants_sorted else "—"
    most_active_count = participants_sorted[0]["messages"] if participants_sorted else 0

    # ── Dates ────────────────────────────────────────────────────────────────
    dated = [m for m in messages if m["datetime"] is not None]
    if dated:
        first_dt = min(m["datetime"] for m in dated)
        last_dt  = max(m["datetime"] for m in dated)
        duration_days = (last_dt - first_dt).days
        first_date = first_dt.strftime("%b %d, %Y")
        last_date  = last_dt.strftime("%b %d, %Y")
    else:
        first_dt = last_dt = None
        duration_days = 0
        first_date = messages[0]["date"]
        last_date  = messages[-1]["date"]

    # ── Monthly counts (YYYY-MM → count) + daily counts per month ───────────
    monthly_counter: Counter = Counter()
    daily_counter: dict[str, Counter] = {}   # { "YYYY-MM": Counter(day → count) }
    for m in dated:
        key = m["datetime"].strftime("%Y-%m")
        monthly_counter[key] += 1
        if key not in daily_counter:
            daily_counter[key] = Counter()
        daily_counter[key][m["datetime"].day] += 1

    # Fill missing months in range
    monthly_counts: dict[str, int] = {}
    if first_dt and last_dt:
        cur = first_dt.replace(day=1)
        end = last_dt.replace(day=1)
        while cur <= end:
            k = cur.strftime("%Y-%m")
            monthly_counts[k] = monthly_counter.get(k, 0)
            if cur.month == 12:
                cur = cur.replace(year=cur.year + 1, month=1)
            else:
                cur = cur.replace(month=cur.month + 1)

    # daily_counts: { "YYYY-MM": { "1": n, "2": n, ... } } (only days with messages)
    daily_counts: dict[str, dict[str, int]] = {
        k: {str(day): cnt for day, cnt in counter.items()}
        for k, counter in daily_counter.items()
    }

    # ── Hourly × weekday matrix [24][7] ──────────────────────────────────────
    # weekday: 0=Mon … 6=Sun
    hourly_weekday = [[0] * 7 for _ in range(24)]
    for m in dated:
        h = m["datetime"].hour
        d = m["datetime"].weekday()
        hourly_weekday[h][d] += 1

    # ── Top words ────────────────────────────────────────────────────────────
    STOPWORDS = {
        "that", "this", "with", "from", "have", "will", "your", "they",
        "what", "been", "were", "when", "also", "just", "like", "there",
        "their", "nahi", "karo", "karna", "acha", "okay", "haan", "nope",
        "media", "omitted", "message", "deleted",
    }
    all_words = []
    for m in messages:
        if not m["is_media"]:
            all_words.extend(
                w.lower().strip(".,!?\"'()-") for w in m["message"].split()
                if len(w) > 3 and w.lower().strip(".,!?\"'()-") not in STOPWORDS
            )
    top_words = [w for w, _ in Counter(all_words).most_common(20)]

    chat_type = "group" if len(participants_ordered) > 2 else "individual"

    return {
        "chat_name":       chat_name,
        "chat_type":       chat_type,
        "kpi": {
            "total_messages":    total,
            "total_participants": len(participants_ordered),
            "first_date":        first_date,
            "last_date":         last_date,
            "duration_days":     duration_days,
            "duration_str":      duration_str(duration_days),
            "most_active_user":  most_active,
            "most_active_count": most_active_count,
            "total_words":       total_words,
            "media_count":       media_count,
        },
        "participants":    participants_sorted,
        "monthly_counts":  monthly_counts,
        "daily_counts":    daily_counts,
        "hourly_weekday":  hourly_weekday,
        "top_words":       top_words,
    }


def save_session(messages: list[dict], chat_name: str, analytics: dict) -> str:
    session_id = uuid.uuid4().hex
    path = SESSIONS_DIR / f"{session_id}.json"
    payload = {
        "session_id": session_id,
        "chat_name": chat_name,
        "created_at": datetime.utcnow().isoformat(),
        "messages": [
            {
                "date":         m["date"],
                "time":         m["time"],
                "datetime_iso": m["datetime"].isoformat() if m.get("datetime") else None,
                "sender":       m["sender"],
                "message":      m["message"],
                "is_media":     m["is_media"],
            }
            for m in messages
        ],
        "analytics": analytics,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    return session_id


def load_session(session_id: str) -> dict:
    path = SESSIONS_DIR / f"{session_id}.json"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Session not found.")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


class BehaviorRequest(BaseModel):
    session_id: str
    participant: str | None = None  # None = analyze all participants


class MonthSummaryRequest(BaseModel):
    session_id: str
    month: str  # "YYYY-MM"


# ── API routes ────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Chatrix API is running 🚀", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/upload")
async def upload_chat(file: UploadFile = File(...)):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted.")

    contents = await file.read()
    if len(contents) > config.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {config.MAX_UPLOAD_SIZE_MB} MB).",
        )

    try:
        chat_text, chat_name = extract_chat_from_zip(contents)
    except (zipfile.BadZipFile, ValueError) as e:
        raise HTTPException(status_code=422, detail=str(e))

    # If chat_name is empty, fall back to the zip filename
    if not chat_name:
        chat_name = os.path.splitext(file.filename)[0]

    messages = parse_chat_file(chat_text)
    if not messages:
        raise HTTPException(
            status_code=422,
            detail="Could not parse any messages. Make sure it's a valid WhatsApp export.",
        )

    save_csv(messages, chat_name)
    analytics = build_analytics(messages, chat_name)
    session_id = save_session(messages, chat_name, analytics)

    return {
        "status": "success",
        "file": file.filename,
        "session_id": session_id,
        **analytics,
    }


@app.post("/analyze-behavior")
async def analyze_behavior(req: BehaviorRequest):
    session = load_session(req.session_id)
    messages = session["messages"]

    try:
        if req.participant:
            sampled = sample_messages_for_person(messages, req.participant)
            result = await asyncio.to_thread(analyze_participant, req.participant, sampled)
            return {"session_id": req.session_id, "results": [result]}

        result = await asyncio.to_thread(analyze_all_participants, messages)
        return {"session_id": req.session_id, **result}
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Behavior analysis failed. Is Ollama running with model '{config.OLLAMA_MODEL}' at '{config.OLLAMA_BASE_URL}'? Error: {exc}",
        )


@app.post("/month-summary")
async def month_summary(req: MonthSummaryRequest):
    import re as _re
    if not _re.match(r"^\d{4}-\d{2}$", req.month):
        raise HTTPException(status_code=400, detail="month must be in YYYY-MM format.")

    session = load_session(req.session_id)
    messages = session["messages"]

    try:
        result = await asyncio.to_thread(summarize_month, messages, req.month)
        return {"session_id": req.session_id, "month": req.month, **result}
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Month summary failed. Is Ollama running with model "
                f"'{config.OLLAMA_MODEL}' at '{config.OLLAMA_BASE_URL}'? Error: {exc}"
            ),
        )


@app.post("/analyze-behavior/stream")
async def analyze_behavior_stream(req: BehaviorRequest):
    session = load_session(req.session_id)
    messages = session["messages"]
    senders = (
        [req.participant]
        if req.participant
        else sorted({m["sender"] for m in messages})
    )
    total = len(senders)

    async def event_stream():
        try:
            yield json.dumps({
                "type": "start",
                "total": total,
                "participants": senders,
                "model": config.OLLAMA_MODEL,
            }, ensure_ascii=False) + "\n"

            results = []
            for index, sender in enumerate(senders, start=1):
                yield json.dumps({
                    "type": "running",
                    "participant": sender,
                    "index": index,
                    "total": total,
                }, ensure_ascii=False) + "\n"

                sampled = sample_messages_for_person(messages, sender)
                try:
                    result = await asyncio.wait_for(
                        asyncio.to_thread(analyze_participant, sender, sampled),
                        timeout=config.OLLAMA_TIMEOUT_SECONDS + 30,
                    )
                except asyncio.TimeoutError:
                    result = {
                        "participant": sender,
                        "status": "parse_error",
                        "message_count": len(sampled),
                        "error": (
                            f"Analysis timed out after {config.OLLAMA_TIMEOUT_SECONDS}s. "
                            "Try lowering BEHAVIOR_PROMPT_MAX_MESSAGES in .env."
                        ),
                    }
                results.append(result)
                yield json.dumps({
                    "type": "result",
                    "result": result,
                }, ensure_ascii=False) + "\n"

            yield json.dumps({
                "type": "done",
                "session_id": req.session_id,
                "sample_size": config.BEHAVIOR_SAMPLE_SIZE,
                "min_words": config.BEHAVIOR_MIN_WORDS,
                "participants_analyzed": len(results),
                "results": results,
            }, ensure_ascii=False) + "\n"
        except Exception as exc:
            yield json.dumps({
                "type": "error",
                "detail": (
                    f"Behavior analysis failed. Is Ollama running with model "
                    f"'{config.OLLAMA_MODEL}' at '{config.OLLAMA_BASE_URL}'? Error: {exc}"
                ),
            }, ensure_ascii=False) + "\n"

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
