"""Agent 1 — Live Research Agent using Gemini Google Search Grounding + verified caching."""
from __future__ import annotations

from datetime import datetime, timedelta
import hashlib
import json
import uuid
from typing import Optional
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from backend.config import get_settings
from backend.gemini_resilience import (
    execute_gemini_with_resilience,
    extract_json_from_model_text,
    resolve_gemini_model,
    validate_research_bundle_for_agent2,
)
from backend.models import ResearchCache, StudentProfile
from backend.research_tools import (
    OFFICIAL_PORTAL_PRIORITY,
    check_url_reachable,
    classify_domain_authority,
)
from backend.schemas import A2AResearchBundle, ResearchedSchemePayload

CACHE_TTL_HOURS = 6


def build_research_cache_key(
    *,
    query_text: str,
    state_filter: str,
    category_filter: str,
    education_filter: str,
    course: str,
    mode: str,
    custom_prompt: str = "",
) -> str:
    payload = json.dumps(
        {
            "q": query_text.strip().lower(),
            "s": state_filter.strip().lower(),
            "c": category_filter.strip().lower(),
            "e": education_filter.strip().lower(),
            "course": course.strip().lower(),
            "mode": mode,
            "cp": custom_prompt.strip().lower(),
        },
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _get_cached_bundle(
    db: Optional[Session],
    cache_key: str,
    task_id: str,
) -> Optional[A2AResearchBundle]:
    if db is None:
        return None
    row = db.query(ResearchCache).filter(ResearchCache.cache_key == cache_key).first()
    if not row:
        return None
    if row.expires_at <= datetime.utcnow():
        db.delete(row)
        db.commit()
        return None
    try:
        raw = dict(row.bundle_json or {})
        raw["task_id"] = task_id
        raw["message_id"] = str(uuid.uuid4())
        bundle = A2AResearchBundle(**raw)
        valid, _ = validate_research_bundle_for_agent2(bundle)
        if not valid:
            return None
        return bundle
    except Exception:
        return None


def _save_cached_bundle(
    db: Optional[Session],
    cache_key: str,
    query_summary: str,
    bundle: A2AResearchBundle,
) -> None:
    if db is None:
        return
    valid, _ = validate_research_bundle_for_agent2(bundle)
    if not valid:
        return
    now = datetime.utcnow()
    expires = now + timedelta(hours=CACHE_TTL_HOURS)
    existing = db.query(ResearchCache).filter(ResearchCache.cache_key == cache_key).first()
    data = bundle.model_dump()
    if existing:
        existing.query_summary = query_summary[:500]
        existing.bundle_json = data
        existing.scheme_count = len(bundle.schemes)
        existing.created_at = now
        existing.expires_at = expires
    else:
        db.add(
            ResearchCache(
                cache_key=cache_key,
                query_summary=query_summary[:500],
                bundle_json=data,
                scheme_count=len(bundle.schemes),
                created_at=now,
                expires_at=expires,
            )
        )
    db.commit()


def run_agent1_research(
    task_id: str,
    query_text: str,
    state_filter: str,
    category_filter: str,
    education_filter: str,
    profile: StudentProfile,
    mode: str = "live_research",
    custom_prompt: str = "",
    db: Optional[Session] = None,
    force_refresh: bool = False,
) -> tuple[A2AResearchBundle, int]:
    settings = get_settings()
    if not settings.is_gemini_configured:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Add a valid billing-enabled key in python_app/.env or Settings > Secrets."
        )

    eff_state = state_filter or profile.state or "India"
    eff_cat = category_filter or profile.category or "All"
    eff_edu = education_filter or profile.education_level or "Higher Education"
    cache_key = build_research_cache_key(
        query_text=query_text,
        state_filter=eff_state,
        category_filter=eff_cat,
        education_filter=eff_edu,
        course=profile.course or "",
        mode=mode,
        custom_prompt=custom_prompt,
    )

    if not force_refresh:
        cached = _get_cached_bundle(db, cache_key, task_id)
        if cached:
            return cached, 0

    client = genai.Client(api_key=settings.gemini_api_key)
    model_name = resolve_gemini_model()

    queries_executed = [
        f"Official Indian government scholarships for {eff_edu} {eff_cat} in {eff_state} site:scholarships.gov.in OR site:myscheme.gov.in",
        query_text.strip(),
    ]

    focus = custom_prompt.strip() if mode == "developer_test" and custom_prompt.strip() else (query_text or "Active central and state government scholarships")
    prompt = f"""You are AGENT 1 (Research Agent) for ScholarAI. Today's date is {datetime.utcnow().strftime('%Y-%m-%d')}.
Use Google Search to discover 3 to 5 authentic Indian Central and State Government scholarships matching:
- Search Focus: {focus}
- State: {eff_state}
- Category: {eff_cat}
- Education Level: {eff_edu}
- Course: {profile.course or 'Any'}

Prioritize: {', '.join(OFFICIAL_PORTAL_PRIORITY)}.
NEVER invent scholarship names, deadlines, amounts, income limits, or URLs.
If any detail cannot be verified in search results, state "Not verified" (or null for numeric limits).

Return strictly a single JSON object with keys:
- "warnings": list[str]
- "schemes": list[object] matching ResearchedSchemePayload fields:
  official_name, provider_ministry, portal_name, scheme_type, description, benefits_summary,
  benefit_amount_inr, opening_date, application_deadline, academic_year, official_portal_url,
  source_url, verification_status ("Verified"|"Partial"|"Unverified"), outdated_flag (bool),
  outdated_reason, min_education_level, allowed_states (list[str]), allowed_categories (list[str]),
  max_family_income_inr (number|null), income_limit_note, min_percentage (number|null),
  allowed_courses (list[str]), gender_requirement, disability_requirement, minority_requirement,
  institution_requirement, other_conditions (list[str]), required_documents (list[str]),
  rules_verified (bool), evidence_excerpt."""

    grounded_resp, retries = execute_gemini_with_resilience(
        lambda m: client.models.generate_content(
            model=m,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())]
            ),
        ),
        model=model_name,
        max_retries=2,
    )

    raw_text = grounded_resp.text or ""
    discovered_urls: list[dict[str, str]] = []
    seen: set[str] = set()
    try:
        chunks = grounded_resp.candidates[0].grounding_metadata.grounding_chunks or []
        for ch in chunks:
            if ch.web and ch.web.uri and ch.web.uri not in seen:
                seen.add(ch.web.uri)
                discovered_urls.append({"title": ch.web.title or "Official Source", "url": ch.web.uri})
    except Exception:
        pass

    # Parse JSON directly from single grounded call first; only make secondary extraction call if needed
    parsed = extract_json_from_model_text(raw_text)
    if not parsed or not isinstance(parsed.get("schemes"), list):
        extraction_prompt = f"""Extract ONLY verified schemes from the grounded research text below into JSON.
Set missing dates, amounts, or URLs to "Not verified" (or null for numeric limits).
Set rules_verified=true ONLY if core rules were explicitly retrieved.

Discovered URLs:
{json.dumps(discovered_urls, indent=2)}

Research Text:
{raw_text}

Return JSON with keys: "warnings": list[str], "schemes": list[object] matching ResearchedSchemePayload fields."""

        structured_resp, extra_retries = execute_gemini_with_resilience(
            lambda m: client.models.generate_content(
                model=m,
                contents=extraction_prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            ),
            model=model_name,
            max_retries=1,
        )
        retries += extra_retries
        parsed = extract_json_from_model_text(structured_resp.text or "{}") or {}

    raw_schemes = (parsed.get("schemes") or [])[:5]
    schemes: list[ResearchedSchemePayload] = []
    for item in raw_schemes:
        if not isinstance(item, dict):
            continue
        source_url = str(item.get("source_url") or (discovered_urls[0]["url"] if discovered_urls else "Not verified"))
        portal_url = str(item.get("official_portal_url") or "Not verified")
        if not str(item.get("official_name") or "").strip():
            continue
        if not source_url.startswith("http") and not portal_url.startswith("http"):
            continue
        reachable = check_url_reachable(source_url)
        sources = []
        if source_url != "Not verified":
            sources.append(
                {
                    "source_title": str(item.get("portal_name") or item.get("official_name") or "Primary Source"),
                    "source_url": source_url,
                    "domain_authority": classify_domain_authority(source_url),
                    "excerpt": str(item.get("evidence_excerpt") or item.get("description") or "")[:320],
                    "http_reachable": reachable,
                }
            )
        item["source_url"] = source_url
        item["official_portal_url"] = portal_url
        item["sources"] = sources
        schemes.append(ResearchedSchemePayload(**item))

    bundle = A2AResearchBundle(
        message_id=str(uuid.uuid4()),
        task_id=task_id,
        timestamp=datetime.utcnow().isoformat(),
        mode="developer_test" if mode == "developer_test" else "live_research",
        search_queries_executed=[q for q in queries_executed if q],
        grounding_urls_discovered=discovered_urls,
        schemes=schemes,
        warnings=[str(w) for w in parsed.get("warnings", [])],
    )

    valid, _ = validate_research_bundle_for_agent2(bundle)
    if valid:
        _save_cached_bundle(db, cache_key, f"{query_text or focus} ({eff_state}/{eff_cat})", bundle)

    return bundle, retries

