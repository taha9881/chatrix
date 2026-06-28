import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)


def require_env(key: str) -> str:
    value = os.getenv(key)
    if value is None or not value.strip():
        raise RuntimeError(
            f"Missing required environment variable '{key}'. "
            f"Set it in {ENV_PATH}"
        )
    return value.strip()


def require_int(key: str) -> int:
    raw = require_env(key)
    try:
        return int(raw)
    except ValueError as exc:
        raise RuntimeError(
            f"Environment variable '{key}' must be an integer, got '{raw}'."
        ) from exc


def require_float(key: str) -> float:
    raw = require_env(key)
    try:
        return float(raw)
    except ValueError as exc:
        raise RuntimeError(
            f"Environment variable '{key}' must be a number, got '{raw}'."
        ) from exc


OLLAMA_MODEL = require_env("OLLAMA_MODEL")
OLLAMA_BASE_URL = require_env("OLLAMA_BASE_URL")
OLLAMA_TEMPERATURE = require_float("OLLAMA_TEMPERATURE")
OLLAMA_NUM_PREDICT = require_int("OLLAMA_NUM_PREDICT")
OLLAMA_NUM_CTX = require_int("OLLAMA_NUM_CTX")
OLLAMA_TIMEOUT_SECONDS = require_int("OLLAMA_TIMEOUT_SECONDS")
BEHAVIOR_SAMPLE_SIZE = require_int("BEHAVIOR_SAMPLE_SIZE")
BEHAVIOR_MIN_WORDS = require_int("BEHAVIOR_MIN_WORDS")
BEHAVIOR_PROMPT_MAX_MESSAGES = require_int("BEHAVIOR_PROMPT_MAX_MESSAGES")
MESSAGE_TRUNCATE_CHARS = require_int("MESSAGE_TRUNCATE_CHARS")
CORS_ORIGINS = [origin.strip() for origin in require_env("CORS_ORIGINS").split(",") if origin.strip()]
MAX_UPLOAD_SIZE_MB = require_int("MAX_UPLOAD_SIZE_MB")
UPLOADS_DIR = BASE_DIR / require_env("UPLOADS_DIR")
SESSIONS_DIR = BASE_DIR / require_env("SESSIONS_DIR")

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
