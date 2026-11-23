"""Deterministic rule-based eligibility checking engine (no AI guessing)."""
from backend.models import StudentProfile
from backend.schemas import ResearchedSchemePayload, RuleCheckItem

EDUCATION_RANK = {
    "pre-matric": 1,
    "class 9-10": 1,
    "post-matric (class 11-12 / puc)": 2,
    "class 11-12": 2,
    "puc": 2,
    "diploma / polytechnic": 3,
    "undergraduate (ug)": 4,
    "undergraduate": 4,
    "postgraduate (pg)": 5,
    "postgraduate": 5,
    "phd / research": 6,
}


def _edu_rank(level: str) -> int | None:
    low = (level or "").strip().lower()
    if not low or low == "not verified":
        return None
    if low in EDUCATION_RANK:
        return EDUCATION_RANK[low]
    if "pre-matric" in low or "class 9" in low or "class 10" in low:
        return 1
    if "11" in low or "12" in low or "puc" in low:
        return 2
    if "diploma" in low or "polytechnic" in low:
        return 3
    if "undergraduate" in low or "ug" in low or "b.tech" in low or "b.e" in low or "b.sc" in low:
        return 4
    if "postgraduate" in low or "pg" in low or "m.tech" in low or "master" in low:
        return 5
    if "phd" in low or "doctoral" in low:
        return 6
    return None


def evaluate_eligibility_deterministic(
    profile: StudentProfile,
    scheme: ResearchedSchemePayload,
) -> tuple[str, list[RuleCheckItem], list[str]]:
    checks: list[RuleCheckItem] = []
    missing_fields: list[str] = []

    if not scheme.rules_verified:
        checks.append(
            RuleCheckItem(
                condition="Official Rules Verification",
                official_rule="Verified rules required",
                student_value="Profile available",
                status="UNVERIFIED_RULE",
                reason="Official criteria could not be fully verified from government sources.",
            )
        )

    # 1. State / Domicile
    allowed_states = [s.strip().lower() for s in scheme.allowed_states]
    is_all_india = not allowed_states or any(
        s in ("all india", "all states", "india", "pan india") for s in allowed_states
    )
    if any(s == "not verified" for s in allowed_states):
        checks.append(
            RuleCheckItem(
                condition="State / Domicile",
                official_rule="Not verified",
                student_value=profile.state or "Missing",
                status="UNVERIFIED_RULE",
                reason="State requirement was not verified.",
            )
        )
    elif not (profile.state or "").strip():
        missing_fields.append("state")
        checks.append(
            RuleCheckItem(
                condition="State / Domicile",
                official_rule=", ".join(scheme.allowed_states),
                student_value="Not provided",
                status="MISSING_STUDENT_DATA",
                reason="Domicile state is missing in your student profile.",
            )
        )
    elif is_all_india:
        checks.append(
            RuleCheckItem(
                condition="State / Domicile",
                official_rule="All India",
                student_value=profile.state,
                status="PASS",
                reason=f"Scheme covers all Indian states including {profile.state}.",
            )
        )
    else:
        stu_state = profile.state.strip().lower()
        matched = any(stu_state in s or s in stu_state for s in allowed_states)
        checks.append(
            RuleCheckItem(
                condition="State / Domicile",
                official_rule=", ".join(scheme.allowed_states),
                student_value=profile.state,
                status="PASS" if matched else "FAIL",
                reason=(
                    f"State ({profile.state}) matches scheme domicile rules."
                    if matched
                    else f"Scheme restricted to {', '.join(scheme.allowed_states)}."
                ),
            )
        )

    # 2. Category
    allowed_cats = [c.strip().lower() for c in scheme.allowed_categories]
    is_all_cats = not allowed_cats or any(c in ("all", "all categories") for c in allowed_cats)
    if any(c == "not verified" for c in allowed_cats):
        checks.append(
            RuleCheckItem(
                condition="Social Category",
                official_rule="Not verified",
                student_value=profile.category or "Missing",
                status="UNVERIFIED_RULE",
                reason="Eligible category list not verified.",
            )
        )
    elif not (profile.category or "").strip():
        missing_fields.append("category")
        checks.append(
            RuleCheckItem(
                condition="Social Category",
                official_rule=", ".join(scheme.allowed_categories),
                student_value="Not provided",
                status="MISSING_STUDENT_DATA",
                reason="Social category is missing from student profile.",
            )
        )
    elif is_all_cats:
        checks.append(
            RuleCheckItem(
                condition="Social Category",
                official_rule="All Categories",
                student_value=profile.category,
                status="PASS",
                reason=f"Open to all categories including {profile.category}.",
            )
        )
    else:
        stu_cat = profile.category.strip().lower()
        matched = any(stu_cat == c or stu_cat in c or c in stu_cat for c in allowed_cats)
        checks.append(
            RuleCheckItem(
                condition="Social Category",
                official_rule=", ".join(scheme.allowed_categories),
                student_value=profile.category,
                status="PASS" if matched else "FAIL",
                reason=(
                    f"Category ({profile.category}) matches scheme requirement."
                    if matched
                    else f"Restricted to {', '.join(scheme.allowed_categories)}."
                ),
            )
        )

    # 3. Annual Family Income
    income_note = (scheme.income_limit_note or "").lower()
    no_limit = "no income limit" in income_note or "not applicable" in income_note
    if scheme.max_family_income_inr is None:
        if no_limit:
            checks.append(
                RuleCheckItem(
                    condition="Annual Family Income",
                    official_rule=scheme.income_limit_note or "No ceiling",
                    student_value=f"INR {profile.annual_family_income:,.0f}" if profile.annual_family_income is not None else "Not required",
                    status="PASS",
                    reason="Scheme specifies no income limit.",
                )
            )
        else:
            checks.append(
                RuleCheckItem(
                    condition="Annual Family Income",
                    official_rule=scheme.income_limit_note or "Not verified",
                    student_value=f"INR {profile.annual_family_income:,.0f}" if profile.annual_family_income is not None else "Missing",
                    status="UNVERIFIED_RULE",
                    reason="Income limit could not be verified from official source.",
                )
            )
    elif profile.annual_family_income is None:
        missing_fields.append("annual_family_income")
        checks.append(
            RuleCheckItem(
                condition="Annual Family Income",
                official_rule=f"<= INR {scheme.max_family_income_inr:,.0f}/year",
                student_value="Not provided",
                status="MISSING_STUDENT_DATA",
                reason="Annual family income is missing in your profile.",
            )
        )
    else:
        passed = profile.annual_family_income <= scheme.max_family_income_inr
        checks.append(
            RuleCheckItem(
                condition="Annual Family Income",
                official_rule=f"<= INR {scheme.max_family_income_inr:,.0f}/year",
                student_value=f"INR {profile.annual_family_income:,.0f}/year",
                status="PASS" if passed else "FAIL",
                reason=(
                    "Within official income ceiling."
                    if passed
                    else f"Exceeds ceiling of INR {scheme.max_family_income_inr:,.0f}."
                ),
            )
        )

    # 4. Education Level
    req_rank = _edu_rank(scheme.min_education_level)
    if req_rank is None:
        checks.append(
            RuleCheckItem(
                condition="Education Level",
                official_rule=scheme.min_education_level or "Not verified",
                student_value=profile.education_level or "Missing",
                status="UNVERIFIED_RULE",
                reason="Required education level could not be verified.",
            )
        )
    elif not (profile.education_level or "").strip():
        missing_fields.append("education_level")
        checks.append(
            RuleCheckItem(
                condition="Education Level",
                official_rule=scheme.min_education_level,
                student_value="Not provided",
                status="MISSING_STUDENT_DATA",
                reason="Education level is missing from your profile.",
            )
        )
    else:
        stu_rank = _edu_rank(profile.education_level)
        if stu_rank is not None:
            passed = stu_rank >= req_rank
            checks.append(
                RuleCheckItem(
                    condition="Education Level",
                    official_rule=scheme.min_education_level,
                    student_value=profile.education_level,
                    status="PASS" if passed else "FAIL",
                    reason=(
                        "Education level satisfies requirement."
                        if passed
                        else f"Requires {scheme.min_education_level}."
                    ),
                )
            )

    # 5. Minimum Percentage
    if scheme.min_percentage is not None and scheme.min_percentage > 0:
        if profile.previous_percentage is None:
            missing_fields.append("previous_percentage")
            checks.append(
                RuleCheckItem(
                    condition="Minimum Percentage",
                    official_rule=f">= {scheme.min_percentage}%",
                    student_value="Not provided",
                    status="MISSING_STUDENT_DATA",
                    reason="Previous qualifying marks missing from profile.",
                )
            )
        else:
            passed = profile.previous_percentage >= scheme.min_percentage
            checks.append(
                RuleCheckItem(
                    condition="Minimum Percentage",
                    official_rule=f">= {scheme.min_percentage}%",
                    student_value=f"{profile.previous_percentage}%",
                    status="PASS" if passed else "FAIL",
                    reason="Meets minimum percentage." if passed else "Below required percentage.",
                )
            )

    has_fail = any(c.status == "FAIL" for c in checks)
    has_missing = any(c.status in ("MISSING_STUDENT_DATA", "UNVERIFIED_RULE") for c in checks)

    if has_fail:
        outcome = "Not Eligible"
    elif has_missing:
        outcome = "Needs More Information"
    else:
        outcome = "Likely Eligible"

    return outcome, checks, list(dict.fromkeys(missing_fields))
