"""Personalized step-by-step application plan and checklist builder."""
from __future__ import annotations

import json
from typing import Any
from google import genai
from google.genai import types
from backend.config import get_settings
from backend.gemini_resilience import (
    GeminiPipelineError,
    classify_gemini_error,
    execute_gemini_with_resilience,
    extract_json_from_model_text,
    resolve_gemini_model,
)
from backend.models import StudentProfile
from backend.schemas import ResearchedSchemePayload, RuleCheckItem


def _default_plan_for_scheme(
    scheme: ResearchedSchemePayload,
    rule_checks: list[RuleCheckItem],
    missing_fields: list[str],
) -> tuple[str, list[dict], list[dict]]:
    fallback_summary = " ".join(f"{c.condition}: {c.status} ({c.reason})" for c in rule_checks)
    docs = scheme.required_documents or [
        "Aadhaar Card (seeded with bank account for DBT)",
        "Previous Academic Marksheet",
        "Official Annual Family Income Certificate",
        "Bonafide Student Certificate from Institution",
        "Student Bank Passbook Copy",
    ]
    default_checklist = [
        {"name": d, "purpose": f"Required for {scheme.official_name}", "mandatory": True, "ready": False}
        for d in docs
    ]
    portal_target = (
        scheme.official_portal_url
        if scheme.official_portal_url != "Not verified"
        else scheme.source_url
    )
    default_steps = [
        {
            "step_number": 1,
            "title": "Verify Profile Completeness & Documents",
            "description": f"Ensure all required documents and profile fields ({', '.join(missing_fields) or 'all complete'}) are ready.",
            "completed": False,
            "requires_portal_action": False,
        },
        {
            "step_number": 2,
            "title": "Review Official Portal Guidelines & Submit Manually",
            "description": f"After explicit human approval in ScholarAI, visit {portal_target} to submit your application directly.",
            "completed": False,
            "requires_portal_action": True,
        },
    ]
    return fallback_summary, default_steps, default_checklist


def build_batched_application_plans(
    profile: StudentProfile,
    evaluated_items: list[dict[str, Any]],
    language: str = "en",
) -> list[tuple[str, list[dict], list[dict]]]:
    """Generate personalized explanations, steps, and checklists for all schemes in 1 Gemini call."""
    if not evaluated_items:
        return []

    defaults = [
        _default_plan_for_scheme(
            item["scheme"],
            item["rule_checks"],
            item["missing_fields"],
        )
        for item in evaluated_items
    ]

    settings = get_settings()
    if not settings.is_gemini_configured:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. Configure a billing-enabled key before running Agent 2."
        )

    lang_map = {"kn": "Kannada (ಕನ್ನಡ)", "hi": "Hindi (हिन्दी)", "en": "English"}
    target_lang = lang_map.get(language, "English")

    schemes_payload = []
    for idx, item in enumerate(evaluated_items):
        sch: ResearchedSchemePayload = item["scheme"]
        portal_target = (
            sch.official_portal_url
            if sch.official_portal_url != "Not verified"
            else sch.source_url
        )
        schemes_payload.append(
            {
                "scheme_index": idx,
                "official_name": sch.official_name,
                "portal_name": sch.portal_name,
                "deadline": sch.application_deadline,
                "official_portal_url": portal_target,
                "deterministic_outcome": item["outcome"],
                "rule_checks": [c.model_dump() for c in item["rule_checks"]],
                "required_documents": sch.required_documents,
            }
        )

    client = genai.Client(api_key=settings.gemini_api_key)
    model_name = resolve_gemini_model()
    prompt = f"""You are AGENT 2 (Eligibility & Application Planning Agent).
Target Output Language: {target_lang} (write explanation_summary, step titles, step descriptions, and document purpose fields naturally in {target_lang}, keeping official portal URLs and scheme names intact).
NEVER alter the deterministic_outcome for any scheme.
Student Profile: State={profile.state}, Category={profile.category}, Education={profile.education_level}, Course={profile.course}.

Schemes to plan:
{json.dumps(schemes_payload, indent=2)}

Return a single JSON object with key "plans": list of objects matching each scheme_index:
{{
  "plans": [
    {{
      "scheme_index": 0,
      "explanation_summary": "2-4 sentence factual summary referencing deterministic checks",
      "steps": [{{"step_number": 1, "title": "...", "description": "...", "requires_portal_action": false}}],
      "document_checklist": [{{"name": "...", "purpose": "...", "mandatory": true}}]
    }}
  ]
}}"""

    try:
        resp, _ = execute_gemini_with_resilience(
            lambda m: client.models.generate_content(
                model=m,
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            ),
            model=model_name,
            max_retries=2,
        )
    except Exception as exc:
        classified = classify_gemini_error(exc, model_name)
        if classified.category in (
            "QUOTA_EXHAUSTED_DAILY",
            "QUOTA_RATE_LIMIT",
            "AUTH_INVALID",
            "MODEL_NOT_FOUND",
        ):
            raise classified from exc
        return defaults

    parsed = extract_json_from_model_text(resp.text or "{}") or {}
    raw_plans = parsed.get("plans") or []
    by_index: dict[int, dict[str, Any]] = {}
    for p in raw_plans:
        if isinstance(p, dict) and isinstance(p.get("scheme_index"), int):
            by_index[p["scheme_index"]] = p

    output: list[tuple[str, list[dict], list[dict]]] = []
    for idx, (fb_summary, fb_steps, fb_checklist) in enumerate(defaults):
        entry = by_index.get(idx)
        if not entry:
            output.append((fb_summary, fb_steps, fb_checklist))
            continue

        steps = [
            {
                "step_number": int(s.get("step_number", i + 1)),
                "title": str(s.get("title", "Step")),
                "description": str(s.get("description", "")),
                "completed": False,
                "requires_portal_action": bool(s.get("requires_portal_action", False)),
            }
            for i, s in enumerate(entry.get("steps", []))
            if isinstance(s, dict)
        ] or fb_steps

        checklist = [
            {
                "name": str(d.get("name", "Document")),
                "purpose": str(d.get("purpose", "")),
                "mandatory": bool(d.get("mandatory", True)),
                "ready": False,
            }
            for d in entry.get("document_checklist", [])
            if isinstance(d, dict)
        ] or fb_checklist

        output.append((str(entry.get("explanation_summary") or fb_summary), steps, checklist))

    return output

