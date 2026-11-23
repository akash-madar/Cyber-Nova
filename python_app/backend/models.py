"""SQLAlchemy ORM models matching the ScholarAI MySQL schema."""
import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from backend.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), nullable=False, unique=True, index=True)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="student")
    reset_failed_attempts = Column(Integer, nullable=False, default=0)
    reset_locked_until = Column(DateTime, nullable=True)
    password_changed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    security_questions = relationship(
        "UserSecurityQuestion",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="UserSecurityQuestion.slot_index",
    )


class UserSecurityQuestion(Base):
    __tablename__ = "user_security_questions"
    __table_args__ = (
        UniqueConstraint("user_id", "slot_index", name="uq_sec_q_slot"),
        UniqueConstraint("user_id", "question_key", name="uq_sec_q_key"),
    )

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    slot_index = Column(Integer, nullable=False)
    question_key = Column(String(64), nullable=False)
    answer_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="security_questions")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    full_name = Column(String(255), nullable=False, default="")
    state = Column(String(120), nullable=False, default="")
    district = Column(String(120), nullable=False, default="")
    category = Column(String(64), nullable=False, default="")
    gender = Column(String(32), nullable=False, default="")
    education_level = Column(String(120), nullable=False, default="")
    course = Column(String(180), nullable=False, default="")
    institution_name = Column(String(255), nullable=False, default="")
    institution_type = Column(String(120), nullable=False, default="")
    academic_year = Column(String(32), nullable=False, default="2026-27")
    previous_percentage = Column(Float, nullable=True)
    annual_family_income = Column(Float, nullable=True)
    disability_status = Column(String(120), nullable=False, default="None")
    minority_status = Column(String(64), nullable=False, default="None")
    first_generation = Column(Boolean, nullable=False, default=False)
    hosteller_or_dayscholar = Column(String(32), nullable=False, default="")
    profile_pic_url = Column(Text, nullable=False, default="")
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")


class ResearchTask(Base):
    __tablename__ = "research_tasks"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    query_text = Column(Text, nullable=False)
    state_filter = Column(String(120), nullable=False, default="")
    category_filter = Column(String(64), nullable=False, default="")
    education_filter = Column(String(120), nullable=False, default="")
    mode = Column(String(32), nullable=False, default="live_research")
    status = Column(String(32), nullable=False, default="PENDING")
    current_stage = Column(String(255), nullable=False, default="Queued")
    agent1_status = Column(String(32), nullable=False, default="IDLE")
    agent2_status = Column(String(32), nullable=False, default="IDLE")
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    language = Column(String(8), nullable=False, default="en")
    custom_prompt = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class ResearchCache(Base):
    __tablename__ = "research_cache"

    cache_key = Column(String(64), primary_key=True)
    query_summary = Column(String(500), nullable=False)
    bundle_json = Column(JSON, nullable=False)
    scheme_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)


class Scholarship(Base):
    __tablename__ = "scholarships"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    task_id = Column(String(36), ForeignKey("research_tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    official_name = Column(String(500), nullable=False)
    provider_ministry = Column(String(255), nullable=False)
    portal_name = Column(String(255), nullable=False)
    scheme_type = Column(String(64), nullable=False, default="Central")
    description = Column(Text, nullable=False)
    benefits_summary = Column(Text, nullable=False)
    benefit_amount_inr = Column(String(255), nullable=False)
    opening_date = Column(String(120), nullable=False)
    application_deadline = Column(String(120), nullable=False)
    academic_year = Column(String(64), nullable=False)
    official_portal_url = Column(Text, nullable=False)
    source_url = Column(Text, nullable=False)
    verification_status = Column(String(32), nullable=False, default="Partial")
    outdated_flag = Column(Boolean, nullable=False, default=False)
    outdated_reason = Column(Text, nullable=False, default="")
    last_verified_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    is_test_data = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    criteria = relationship("EligibilityCriterion", back_populates="scholarship", uselist=False, cascade="all, delete-orphan")
    sources = relationship("OfficialSource", back_populates="scholarship", cascade="all, delete-orphan")


class EligibilityCriterion(Base):
    __tablename__ = "eligibility_criteria"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    scholarship_id = Column(String(36), ForeignKey("scholarships.id", ondelete="CASCADE"), nullable=False, unique=True)
    min_education_level = Column(String(120), nullable=False)
    allowed_states_json = Column(JSON, nullable=False, default=list)
    allowed_categories_json = Column(JSON, nullable=False, default=list)
    max_family_income_inr = Column(Float, nullable=True)
    income_limit_note = Column(String(255), nullable=False, default="")
    min_percentage = Column(Float, nullable=True)
    allowed_courses_json = Column(JSON, nullable=False, default=list)
    gender_requirement = Column(String(64), nullable=False, default="All")
    disability_requirement = Column(String(64), nullable=False, default="Any")
    minority_requirement = Column(String(64), nullable=False, default="Any")
    institution_requirement = Column(String(255), nullable=False, default="Recognized Institution")
    other_conditions_json = Column(JSON, nullable=False, default=list)
    required_documents_json = Column(JSON, nullable=False, default=list)
    rules_verified = Column(Boolean, nullable=False, default=False)

    scholarship = relationship("Scholarship", back_populates="criteria")


class OfficialSource(Base):
    __tablename__ = "official_sources"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    scholarship_id = Column(String(36), ForeignKey("scholarships.id", ondelete="CASCADE"), nullable=False)
    source_title = Column(String(500), nullable=False)
    source_url = Column(Text, nullable=False)
    domain_authority = Column(String(160), nullable=False)
    excerpt = Column(Text, nullable=False)
    http_reachable = Column(Boolean, nullable=True)
    retrieved_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    scholarship = relationship("Scholarship", back_populates="sources")


class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    task_id = Column(String(36), ForeignKey("research_tasks.id", ondelete="CASCADE"), nullable=False)
    sender_agent = Column(String(64), nullable=False)
    receiver_agent = Column(String(64), nullable=False)
    message_type = Column(String(120), nullable=False)
    payload_json = Column(JSON, nullable=False)
    status = Column(String(32), nullable=False, default="SENT")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class EligibilityReport(Base):
    __tablename__ = "eligibility_reports"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    task_id = Column(String(36), ForeignKey("research_tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scholarship_id = Column(String(36), ForeignKey("scholarships.id", ondelete="CASCADE"), nullable=False)
    outcome = Column(String(64), nullable=False)
    rule_checks_json = Column(JSON, nullable=False)
    missing_fields_json = Column(JSON, nullable=False)
    explanation_summary = Column(Text, nullable=False)
    evidence_urls_json = Column(JSON, nullable=False)
    evaluated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class ApplicationPlan(Base):
    __tablename__ = "application_plans"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scholarship_id = Column(String(36), ForeignKey("scholarships.id", ondelete="CASCADE"), nullable=False)
    eligibility_report_id = Column(String(36), ForeignKey("eligibility_reports.id", ondelete="CASCADE"), nullable=False)
    steps_json = Column(JSON, nullable=False)
    document_checklist_json = Column(JSON, nullable=False)
    deadline_date = Column(String(120), nullable=False)
    human_approved_portal_open = Column(Boolean, nullable=False, default=False)
    approved_at = Column(DateTime, nullable=True)
    application_stage = Column(String(64), nullable=False, default="Plan Ready (Not Submitted)")
    application_number = Column(String(120), nullable=False, default="")
    notes = Column(Text, nullable=False, default="")
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class SavedScheme(Base):
    __tablename__ = "saved_schemes"
    __table_args__ = (UniqueConstraint("user_id", "scholarship_id", name="uq_user_sch"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scholarship_id = Column(String(36), ForeignKey("scholarships.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
