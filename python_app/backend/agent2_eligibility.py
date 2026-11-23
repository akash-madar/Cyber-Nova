"""Agent 2 — Eligibility Verification & Application Planning Agent."""
from backend.application_planner import build_batched_application_plans
from backend.eligibility_engine import evaluate_eligibility_deterministic
from backend.gemini_resilience import validate_research_bundle_for_agent2
from backend.models import StudentProfile
from backend.schemas import A2AResearchBundle


def run_agent2_analysis(
    bundle: A2AResearchBundle,
    profile: StudentProfile,
    language: str = "en",
) -> list[dict]:
    valid, reasons = validate_research_bundle_for_agent2(bundle)
    if not valid:
        raise RuntimeError(
            "Agent 2 precondition failed — valid verified research data unavailable: "
            + "; ".join(reasons)
        )

    evaluated_items = []
    for idx, scheme in enumerate(bundle.schemes):
        outcome, checks, missing_fields = evaluate_eligibility_deterministic(profile, scheme)
        evaluated_items.append(
            {
                "scheme_index": idx,
                "scheme": scheme,
                "outcome": outcome,
                "rule_checks": checks,
                "missing_fields": missing_fields,
            }
        )

    plans = build_batched_application_plans(
        profile=profile,
        evaluated_items=evaluated_items,
        language=language,
    )

    results = []
    for idx, item in enumerate(evaluated_items):
        scheme = item["scheme"]
        explanation, steps, checklist = plans[idx]
        evidence_urls = list(
            dict.fromkeys(
                u
                for u in [
                    scheme.official_portal_url,
                    scheme.source_url,
                    *(s.get("source_url", "") for s in scheme.sources),
                ]
                if u and u != "Not verified"
            )
        )
        results.append(
            {
                "scheme_index": item["scheme_index"],
                "outcome": item["outcome"],
                "rule_checks": [c.model_dump() for c in item["rule_checks"]],
                "missing_fields": item["missing_fields"],
                "explanation_summary": explanation,
                "evidence_urls": evidence_urls,
                "steps": steps,
                "document_checklist": checklist,
            }
        )
    return results

