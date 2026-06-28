import logging
import random
import re
from functools import lru_cache
from pathlib import Path

from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import ValidationError

import config
from schema.behavior_schemas import BehaviorAnalysisOutput

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent / "prompts" / "behavior_analysis.txt"


@lru_cache(maxsize=1)
def load_system_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


@lru_cache(maxsize=1)
def get_structured_llm():
    """Cached structured LLM — no agent graph overhead."""
    llm = ChatOllama(
        model=config.OLLAMA_MODEL,
        base_url=config.OLLAMA_BASE_URL,
        temperature=config.OLLAMA_TEMPERATURE,
        num_predict=config.OLLAMA_NUM_PREDICT,
        num_ctx=config.OLLAMA_NUM_CTX,
        timeout=config.OLLAMA_TIMEOUT_SECONDS,
    )
    return llm.with_structured_output(BehaviorAnalysisOutput)


def word_count(text: str) -> int:
    return len(text.split())


def truncate_message(msg: str) -> str:
    limit = config.MESSAGE_TRUNCATE_CHARS
    if len(msg) <= limit:
        return msg
    return msg[:limit] + "..."


def sample_messages_for_person(
    messages: list[dict],
    sender: str,
    sample_size: int = config.BEHAVIOR_SAMPLE_SIZE,
    min_words: int = config.BEHAVIOR_MIN_WORDS,
) -> list[str]:
    eligible = [
        truncate_message(m["message"].strip())
        for m in messages
        if m.get("sender") == sender
        and not m.get("is_media")
        and word_count(m.get("message", "")) > min_words
    ]
    if not eligible:
        return []

    if len(eligible) <= sample_size:
        sampled = eligible
    else:
        sampled = random.sample(eligible, sample_size)

    max_prompt = config.BEHAVIOR_PROMPT_MAX_MESSAGES
    if len(sampled) > max_prompt:
        sampled = random.sample(sampled, max_prompt)

    return sampled


def build_user_prompt(participant: str, messages: list[str]) -> str:
    numbered = "\n".join(f"{i + 1}. {msg}" for i, msg in enumerate(messages))
    return (
        f'Analyze participant "{participant}" from these {len(messages)} messages:\n\n'
        f"{numbered}\n\n"
        "Return structured output only. Abstract personality analysis — no message quotes."
    )


def strip_message_references(text: str, source_messages: list[str] | None = None) -> str:
    if not text or not isinstance(text, str):
        return text

    cleaned = text
    cleaned = re.sub(r"\(\s*e\.g\.\s*[^)]*\)", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\(\s*for example\s*[^)]*\)", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\(\s*such as\s*[^)]*\)", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\be\.g\.\s*['\"].*?['\"]", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"['\"][^'\"]{2,}['\"]", "", cleaned)
    cleaned = re.sub(r"\*[^*]+\*", "", cleaned)

    if source_messages:
        lower_cleaned = cleaned.lower()
        for msg in source_messages:
            msg = msg.strip()
            if len(msg) >= 8 and msg.lower() in lower_cleaned:
                cleaned = re.sub(re.escape(msg), "", cleaned, flags=re.IGNORECASE)
                lower_cleaned = cleaned.lower()

    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    cleaned = re.sub(r"\(\s*\)", "", cleaned)
    return cleaned.strip(" ,.;:")


def sanitize_analysis(analysis: dict, source_messages: list[str] | None = None) -> dict:
    if not isinstance(analysis, dict):
        return analysis

    if "overall_summary" in analysis:
        analysis["overall_summary"] = strip_message_references(
            analysis["overall_summary"], source_messages
        )

    for trait in analysis.get("identified_traits") or []:
        if isinstance(trait, dict):
            trait.pop("supporting_messages", None)
            if "reasoning" in trait:
                trait["reasoning"] = strip_message_references(
                    trait["reasoning"], source_messages
                )

    style = analysis.get("communication_style")
    if isinstance(style, dict):
        for key, value in style.items():
            if isinstance(value, str):
                style[key] = strip_message_references(value, source_messages)

    return analysis


def analyze_participant(participant: str, messages: list[str]) -> dict:
    if not messages:
        return {
            "participant": participant,
            "status": "insufficient_data",
            "message_count": 0,
            "error": f"No messages with more than {config.BEHAVIOR_MIN_WORDS} words found for this participant.",
        }

    logger.info("Analyzing %s (%d messages)", participant, len(messages))

    structured_llm = get_structured_llm()
    user_prompt = build_user_prompt(participant, messages)

    try:
        result = structured_llm.invoke([
            SystemMessage(content=load_system_prompt()),
            HumanMessage(content=user_prompt),
        ])
    except Exception as exc:
        logger.exception("Structured LLM failed for %s", participant)
        return {
            "participant": participant,
            "status": "parse_error",
            "message_count": len(messages),
            "error": (
                f"Ollama structured output failed or timed out ({config.OLLAMA_TIMEOUT_SECONDS}s). "
                f"Details: {exc}"
            ),
        }

    try:
        if hasattr(result, "model_dump"):
            analysis_dict = result.model_dump()
        elif isinstance(result, dict):
            analysis_dict = BehaviorAnalysisOutput.model_validate(result).model_dump()
        else:
            raise ValueError(f"Unexpected response type: {type(result)}")

        analysis = sanitize_analysis(analysis_dict, messages)
    except (ValueError, ValidationError) as exc:
        logger.warning("Validation failed for %s: %s", participant, exc)
        return {
            "participant": participant,
            "status": "parse_error",
            "message_count": len(messages),
            "error": str(exc),
        }

    logger.info("Completed %s", participant)
    return {
        "participant": participant,
        "status": "success",
        "message_count": len(messages),
        "analysis": analysis,
    }


def analyze_all_participants(
    messages: list[dict],
    participants: list[str] | None = None,
) -> dict:
    senders = participants or sorted({m["sender"] for m in messages})
    results = []

    for sender in senders:
        sampled = sample_messages_for_person(messages, sender)
        results.append(analyze_participant(sender, sampled))

    return {
        "model": config.OLLAMA_MODEL,
        "sample_size": config.BEHAVIOR_SAMPLE_SIZE,
        "min_words": config.BEHAVIOR_MIN_WORDS,
        "participants_analyzed": len(results),
        "results": results,
    }
