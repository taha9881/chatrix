import logging
import math
from datetime import datetime
from functools import lru_cache
from pathlib import Path

from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import ValidationError

import config
from schema.month_summary_schema import MonthSummaryOutput

# Same date formats used in main.py's parser
_DATE_FORMATS = [
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


def _message_year_month(m: dict) -> str | None:
    """Return 'YYYY-MM' for a message dict, trying multiple sources."""
    # New sessions store an ISO datetime string
    iso = m.get("datetime_iso")
    if iso:
        try:
            return datetime.fromisoformat(iso).strftime("%Y-%m")
        except Exception:
            pass

    # Old sessions: re-parse from raw date + time strings
    date_str = m.get("date", "").strip()
    time_str = m.get("time", "").strip()
    if date_str and time_str:
        raw = f"{date_str}, {time_str}".replace("\u202f", " ")
        for fmt in _DATE_FORMATS:
            try:
                return datetime.strptime(raw, fmt).strftime("%Y-%m")
            except ValueError:
                continue

    return None

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent / "prompts" / "month_summary.txt"

MAX_MESSAGES = 150
TRUNCATE_CHARS = 120


@lru_cache(maxsize=1)
def load_month_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


@lru_cache(maxsize=1)
def get_month_llm():
    llm = ChatOllama(
        model=config.OLLAMA_MODEL,
        base_url=config.OLLAMA_BASE_URL,
        temperature=0.5,
        num_predict=1024,
        num_ctx=config.OLLAMA_NUM_CTX,
        timeout=config.OLLAMA_TIMEOUT_SECONDS,
    )
    return llm.with_structured_output(MonthSummaryOutput)


def _truncate(text: str) -> str:
    if len(text) <= TRUNCATE_CHARS:
        return text
    return text[:TRUNCATE_CHARS] + "…"


def sample_month_messages(messages: list[dict], year_month: str) -> list[str]:
    """Filter messages for a given YYYY-MM month and return a representative sample."""
    eligible = [
        _truncate(m["message"].strip())
        for m in messages
        if not m.get("is_media")
        and m.get("message", "").strip()
        and _message_year_month(m) == year_month
    ]

    if not eligible:
        return []

    if len(eligible) <= MAX_MESSAGES:
        return eligible

    # Evenly-spaced sampling for diversity across the month
    step = len(eligible) / MAX_MESSAGES
    return [eligible[math.floor(i * step)] for i in range(MAX_MESSAGES)]


def build_month_prompt(year_month: str, messages: list[str]) -> str:
    year, month_num = year_month.split("-")
    month_name = datetime(int(year), int(month_num), 1).strftime("%B %Y")

    numbered = "\n".join(f"{i + 1}. {msg}" for i, msg in enumerate(messages))
    return (
        f"Analyze this WhatsApp conversation from {month_name} ({len(messages)} messages sampled):\n\n"
        f"{numbered}\n\n"
        "Identify the top topics (1-2 words each) and write a concise narrative summary. "
        "Return structured output only. No message quotes or references."
    )


def summarize_month(messages: list[dict], year_month: str) -> dict:
    sampled = sample_month_messages(messages, year_month)

    if not sampled:
        return {
            "status": "insufficient_data",
            "error": "No text messages found for this month.",
            "topics": [],
            "summary": "",
        }

    logger.info("Summarizing month %s (%d messages sampled)", year_month, len(sampled))

    llm = get_month_llm()
    user_prompt = build_month_prompt(year_month, sampled)

    try:
        result = llm.invoke([
            SystemMessage(content=load_month_prompt()),
            HumanMessage(content=user_prompt),
        ])
    except Exception as exc:
        logger.exception("Month summary LLM failed for %s", year_month)
        return {
            "status": "error",
            "error": str(exc),
            "topics": [],
            "summary": "",
        }

    try:
        if hasattr(result, "model_dump"):
            data = result.model_dump()
        elif isinstance(result, dict):
            data = MonthSummaryOutput.model_validate(result).model_dump()
        else:
            raise ValueError(f"Unexpected response type: {type(result)}")
    except (ValueError, ValidationError) as exc:
        logger.warning("Month summary validation failed for %s: %s", year_month, exc)
        return {
            "status": "parse_error",
            "error": str(exc),
            "topics": [],
            "summary": "",
        }

    return {
        "status": "success",
        "message_count": len(sampled),
        "topics": data.get("topics", []),
        "summary": data.get("summary", ""),
    }
