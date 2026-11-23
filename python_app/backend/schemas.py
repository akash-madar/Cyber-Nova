"""Pydantic v2 validation and A2A message schemas."""
from typing import Any, Literal, Optional
from pydantic import BaseModel, EmailStr, Field


SecurityQuestionKey = Literal[
    "birth_city",
    "first_school",
    "childhood_nickname",
    "mother_name",
    "favorite_teacher",
    "favorite_pet_or_book",
]


class SecurityQuestionAnswerInput(BaseModel):
    question_key: SecurityQuestionKey
    answer: str = Field(min_length=2, max_length=150)


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    security_questions: list[SecurityQuestionAnswerInput] = Field(min_length=3, max_length=3)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class ForgotQuestionsRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    answers: list[SecurityQuestionAnswerInput] = Field(min_length=3, max_length=3)
    new_password: str = Field(min_length=8, max_length=128)


class StudentProfileUpdate(BaseModel):
    full_name: str = ""
    state: str = ""
    district: str = ""
    category: str = ""
    gender: str = ""
    education_level: str = ""
    course: str = ""
    institution_name: str = ""
    institution_type: str = ""
    academic_year: str = "2026-27"
    previous_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    annual_family_income: Optional[float] = Field(default=None, ge=0)
    disability_status: str = "None"
    minority_status: str = "None"
    first_generation: bool = False
    hosteller_or_dayscholar: str = ""
    profile_pic_url: str = ""


class ResearchStartRequest(BaseModel):
    query_text: str = ""
    state_filter: str = ""
    category_filter: str = ""
    education_filter: str = ""
    language: Literal["en", "kn", "hi"] = "en"
    force_refresh: bool = False


class DeveloperTestRequest(BaseModel):
    scenario_name: str = "Custom Sandbox Scenario"
    custom_prompt: str = ""
    test_profile: dict[str, Any] = Field(default_factory=dict)
    language: Literal["en", "kn", "hi"] = "en"
    force_refresh: bool = False


class RetryTaskRequest(BaseModel):
    force_refresh: bool = False


class RuleCheckItem(BaseModel):
    condition: str
    official_rule: str
    student_value: str
    status: Literal["PASS", "FAIL", "MISSING_STUDENT_DATA", "UNVERIFIED_RULE"]
    reason: str


class ResearchedSchemePayload(BaseModel):
    official_name: str
    provider_ministry: str
    portal_name: str
    scheme_type: str = "Central"
    description: str
    benefits_summary: str
    benefit_amount_inr: str
    opening_date: str
    application_deadline: str
    academic_year: str
    official_portal_url: str
    source_url: str
    verification_status: Literal["Verified", "Partial", "Unverified"] = "Partial"
    outdated_flag: bool = False
    outdated_reason: str = ""
    min_education_level: str = "Not verified"
    allowed_states: list[str] = Field(default_factory=lambda: ["Not verified"])
    allowed_categories: list[str] = Field(default_factory=lambda: ["Not verified"])
    max_family_income_inr: Optional[float] = None
    income_limit_note: str = ""
    min_percentage: Optional[float] = None
    allowed_courses: list[str] = Field(default_factory=lambda: ["All"])
    gender_requirement: str = "All"
    disability_requirement: str = "Any"
    minority_requirement: str = "Any"
    institution_requirement: str = "Recognized Institution"
    other_conditions: list[str] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    rules_verified: bool = False
    evidence_excerpt: str = ""
    sources: list[dict[str, Any]] = Field(default_factory=list)


class A2AResearchBundle(BaseModel):
    message_id: str
    task_id: str
    protocol_version: str = "a2a.scholarai.v1"
    timestamp: str
    sender: Literal["AGENT_1_RESEARCH"] = "AGENT_1_RESEARCH"
    receiver: Literal["AGENT_2_ELIGIBILITY"] = "AGENT_2_ELIGIBILITY"
    mode: Literal["live_research", "developer_test"]
    search_queries_executed: list[str]
    grounding_urls_discovered: list[dict[str, str]]
    schemes: list[ResearchedSchemePayload]
    warnings: list[str] = Field(default_factory=list)


class PlanChecklistUpdate(BaseModel):
    steps: Optional[list[dict[str, Any]]] = None
    document_checklist: Optional[list[dict[str, Any]]] = None
    notes: Optional[str] = None
    application_number: Optional[str] = Field(default=None, max_length=120)


class PlanStageUpdate(BaseModel):
    application_stage: Literal[
        "Discovered",
        "Plan Ready (Not Submitted)",
        "Documents Gathering",
        "Portal Approved by Student",
        "Self-Submitted by Student",
    ]
    human_approved: bool = False
    application_number: Optional[str] = Field(default=None, max_length=120)
