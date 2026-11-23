"""Gemini API error classification, throttling, cooldown tracking, and validation helpers."""
from __future__ import annotations

from datetime import datetime, timedelta
import json
import random
import re
import threading
import time
from typing import Any, Callable, Literal, Optional, TypeVar

from backend.config import get_settings

T = TypeVar("T")

DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen"
DEPRECATED_MODEL_PATTERNS = (
    re.compile(r"^gemini-1\.5-", re.I),
    re.compile(r"^gemini-2\.0-", re.I),
    re.compile(r"^gemini-2\.5-", re.I),
    re.compile(r"^gemini-pro$", re.I),
)

MIN_REQUEST_INTERVAL_SECONDS = 1.5
MAX_RETRY_WAIT_SECONDS = 15.0
DAILY_OR_EXHAUSTED_COOLDOWN_SECONDS = 60.0

QuotaStatusType = Literal["OK", "COOLDOWN", "EXHAUSTED", "AUTH_ERROR"]
GeminiErrorCategory = Literal[
    "QUOTA_EXHAUSTED_DAILY",
    "QUOTA_RATE_LIMIT",
    "AUTH_INVALID",
    "MODEL_NOT_FOUND",
    "TRANSIENT",
    "UNKNOWN",
]


class GeminiPipelineError(RuntimeError):
    def __init__(
        self,
        category: GeminiErrorCategory,
        message: str,
        *,
        http_status: Optional[int] = None,
        retryable: bool = False,
        retry_after_seconds: Optional[float] = None,
        raw_message: str = "",
    ) -> None:
        super().__init__(message)
        self.category = category
        self.user_message = message
        self.http_status = http_status
        self.retryable = retryable
        self.retry_after_seconds = retry_after_seconds
        self.raw_message = raw_message or message


_state_lock = threading.Lock()
_throttle_lock = threading.Lock()
_last_gemini_call_at = 0.0
_quota_status: QuotaStatusType = "OK"
_quota_cooldown_until: Optional[datetime] = None
_last_quota_error: Optional[str] = None


def resolve_gemini_model() -> str:
    raw = (get_settings().gemini_model or "").strip()
    if not raw:
        return DEFAULT_GEMINI_MODEL
    if any(p.search(raw) for p in DEPRECATED_MODEL_PATTERNS):
        return DEFAULT_GEMINI_MODEL
    return raw


def clear_quota_cooldown() -> None:
    global _quota_status, _quota_cooldown_until, _last_quota_error
    with _state_lock:
        _quota_status = "OK"
        _quota_cooldown_until = None
        _last_quota_error = None


def get_quota_status_snapshot() -> dict[str, Any]:
    with _state_lock:
        now = datetime.utcnow()
        status = _quota_status
        cooldown_until = _quota_cooldown_until
        last_err = _last_quota_error
        if status == "COOLDOWN" and cooldown_until and cooldown_until <= now:
            status = "OK"
            cooldown_until = None
            last_err = None
        return {
            "quota_status": status,
            "quota_cooldown_until": cooldown_until.isoformat() if cooldown_until else None,
            "last_quota_error": last_err,
        }


def _record_quota_state(
    status: QuotaStatusType,
    cooldown_seconds: float,
    user_message: str,
) -> None:
    global _quota_status, _quota_cooldown_until, _last_quota_error
    with _state_lock:
        _quota_status = status
        _quota_cooldown_until = datetime.utcnow() + timedelta(seconds=cooldown_seconds)
        _last_quota_error = user_message


def _parse_retry_delay_seconds(raw: str) -> Optional[float]:
    m1 = re.search(r"retryDelay[\"'\s:=]+(\d+(?:\.\d+)?)s", raw, re.I)
    if m1:
        return float(m1.group(1))
    m2 = re.search(r"retry\s+in\s+(\d+(?:\.\d+)?)\s*s", raw, re.I)
    if m2:
        return float(m2.group(1))
    return None


def classify_gemini_error(exc: Exception, model_name: Optional[str] = None) -> GeminiPipelineError:
    if isinstance(exc, GeminiPipelineError):
        return exc

    model = model_name or resolve_gemini_model()
    raw = str(exc or "").strip()
    lower = raw.lower()
    http_status = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    if not isinstance(http_status, int):
        http_status = None

    if (
        "api_key_invalid" in lower
        or "api key not valid" in lower
        or "permission_denied" in lower
        or http_status in (401, 403)
    ):
        return GeminiPipelineError(
            "AUTH_INVALID",
            (
                f"Gemini API authentication failed ({http_status or '401/403'}). "
                "Verify GEMINI_API_KEY in python_app/.env (or Settings > Secrets) "
                "and confirm the Generative Language API and billing are enabled."
            ),
            http_status=http_status or 403,
            retryable=False,
            raw_message=raw,
        )

    if (
        http_status == 429
        or "resource_exhausted" in lower
        or "quota" in lower
        or "rate limit" in lower
        or "too many requests" in lower
    ):
        retry_delay = _parse_retry_delay_seconds(raw)
        is_daily_or_zero_limit = (
            "perday" in lower
            or "per_day" in lower
            or "limit: 0" in lower
            or "free_tier" in lower
            or (retry_delay is not None and retry_delay > 60)
        )
        if is_daily_or_zero_limit:
            return GeminiPipelineError(
                "QUOTA_EXHAUSTED_DAILY",
                (
                    f"Gemini API quota exhausted (429 RESOURCE_EXHAUSTED) on model '{model}'. "
                    "Your current API key has reached its daily or free-tier quota limit. "
                    "Configure a billing-enabled GEMINI_API_KEY in python_app/.env or Settings > Secrets, then retry this task."
                ),
                http_status=429,
                retryable=False,
                retry_after_seconds=retry_delay or DAILY_OR_EXHAUSTED_COOLDOWN_SECONDS,
                raw_message=raw,
            )

        wait_sec = retry_delay or 4.0
        return GeminiPipelineError(
            "QUOTA_RATE_LIMIT",
            (
                f"Gemini API rate limit reached (429) on model '{model}'. "
                f"Please wait {round(wait_sec)}s and retry this task."
            ),
            http_status=429,
            retryable=wait_sec <= MAX_RETRY_WAIT_SECONDS,
            retry_after_seconds=wait_sec,
            raw_message=raw,
        )

    if http_status == 404 or "not_found" in lower or "is not found for api version" in lower:
        return GeminiPipelineError(
            "MODEL_NOT_FOUND",
            (
                f"Configured Gemini model '{model}' was not found or is unsupported for this API key (404). "
                "Update GEMINI_MODEL in python_app/.env or use default 'gemini-4-hydrogen'."
            ),
            http_status=404,
            retryable=False,
            raw_message=raw,
        )

    if (
        (http_status is not None and http_status >= 500)
        or "unavailable" in lower
        or "deadline_exceeded" in lower
        or "timeout" in lower
        or "connection" in lower
    ):
        return GeminiPipelineError(
            "TRANSIENT",
            "Temporary Gemini service or network error. Please retry this task.",
            http_status=http_status or 503,
            retryable=True,
            retry_after_seconds=2.5,
            raw_message=raw,
        )

    return GeminiPipelineError(
        "UNKNOWN",
        raw or "Gemini API request failed unexpectedly.",
        http_status=http_status,
        retryable=False,
        raw_message=raw,
    )


def execute_gemini_with_resilience(
    operation: Callable[[str], T],
    *,
    model: Optional[str] = None,
    max_retries: int = 2,
    on_retry: Optional[Callable[[int, GeminiPipelineError, float], None]] = None,
) -> tuple[T, int]:
    active_model = model or resolve_gemini_model()

    snap = get_quota_status_snapshot()
    if snap["quota_status"] != "OK" and snap["quota_cooldown_until"]:
        until_dt = datetime.fromisoformat(snap["quota_cooldown_until"])
        rem = max(1.0, (until_dt - datetime.utcnow()).total_seconds())
        raise GeminiPipelineError(
            "QUOTA_EXHAUSTED_DAILY" if snap["quota_status"] == "EXHAUSTED" else "QUOTA_RATE_LIMIT",
            snap["last_quota_error"] or f"Gemini quota cooldown active. Retry in {round(rem)}s.",
            http_status=429,
            retryable=False,
            retry_after_seconds=rem,
        )

    retries_used = 0
    attempt = 0
    while True:
        try:
            with _throttle_lock:
                global _last_gemini_call_at
                elapsed = time.monotonic() - _last_gemini_call_at
                if elapsed < MIN_REQUEST_INTERVAL_SECONDS:
                    time.sleep(MIN_REQUEST_INTERVAL_SECONDS - elapsed)
                try:
                    result = operation(active_model)
                finally:
                    _last_gemini_call_at = time.monotonic()

            clear_quota_cooldown()
            return result, retries_used
        except Exception as exc:
            classified = classify_gemini_error(exc, active_model)
            if classified.category == "AUTH_INVALID":
                _record_quota_state("AUTH_ERROR", DAILY_OR_EXHAUSTED_COOLDOWN_SECONDS, classified.user_message)
                raise classified from exc

            if classified.category == "QUOTA_EXHAUSTED_DAILY":
                _record_quota_state(
                    "EXHAUSTED",
                    min(classified.retry_after_seconds or DAILY_OR_EXHAUSTED_COOLDOWN_SECONDS, 120.0),
                    classified.user_message,
                )
                raise classified from exc

            can_retry = classified.retryable and attempt < max_retries
            if not can_retry:
                if classified.category == "QUOTA_RATE_LIMIT":
                    _record_quota_state(
                        "COOLDOWN",
                        min(classified.retry_after_seconds or 30.0, 60.0),
                        classified.user_message,
                    )
                raise classified from exc

            base_delay = classified.retry_after_seconds or (1.5 * (2**attempt))
            delay = min(MAX_RETRY_WAIT_SECONDS, base_delay + random.uniform(0.15, 0.75))
            retries_used += 1
            attempt += 1
            if on_retry:
                on_retry(retries_used, classified, delay)
            time.sleep(delay)


def extract_json_from_model_text(raw_text: str) -> Optional[dict[str, Any]]:
    text = (raw_text or "").strip()
    if not text:
        return None
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.I)
    if fenced:
        try:
            parsed = json.loads(fenced.group(1).strip())
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        try:
            parsed = json.loads(text[start : end + 1])
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return None


def validate_research_bundle_for_agent2(bundle: Any) -> tuple[bool, list[str]]:
    if not bundle:
        return False, ["Research bundle is missing."]
    schemes = getattr(bundle, "schemes", None)
    if not isinstance(schemes, list) or len(schemes) == 0:
        return False, ["Agent 1 returned zero verified scholarship schemes."]

    valid_count = 0
    for sch in schemes:
        name = (getattr(sch, "official_name", "") or "").strip()
        desc = (getattr(sch, "description", "") or "").strip()
        src = (getattr(sch, "source_url", "") or "").strip()
        portal = (getattr(sch, "official_portal_url", "") or "").strip()
        has_url = src.startswith("http") or portal.startswith("http")
        if len(name) >= 4 and len(desc) >= 10 and has_url:
            valid_count += 1

    if valid_count == 0:
        return False, [
            "None of the returned schemes contained verified metadata and a valid official source URL."
        ]
    return True, []
