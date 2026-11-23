"""FastAPI application entrypoint for ScholarAI Python backend."""
from datetime import datetime, timedelta
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.auth import (
    ALLOWED_SECURITY_QUESTION_KEYS,
    create_access_token,
    get_current_user,
    hash_password,
    normalize_security_answer,
    verify_password,
)
from backend.config import get_settings
from backend.database import Base, engine, get_db
from backend.gemini_resilience import (
    get_quota_status_snapshot,
    resolve_gemini_model,
    validate_research_bundle_for_agent2,
)
from backend.models import (
    AgentMessage,
    ApplicationPlan,
    EligibilityReport,
    ResearchTask,
    SavedScheme,
    Scholarship,
    StudentProfile,
    User,
    UserSecurityQuestion,
)
from backend.orchestrator import execute_two_agent_pipeline, recover_interrupted_tasks
from backend.schemas import (
    A2AResearchBundle,
    DeveloperTestRequest,
    ForgotQuestionsRequest,
    LoginRequest,
    PlanChecklistUpdate,
    PlanStageUpdate,
    RegisterRequest,
    ResearchStartRequest,
    ResetPasswordRequest,
    RetryTaskRequest,
    StudentProfileUpdate,
)

Base.metadata.create_all(bind=engine)
recover_interrupted_tasks()

app = FastAPI(title="ScholarAI – Your Future, Funded API", version="1.0.0")


@app.get("/api/system/status")
def system_status():
    settings = get_settings()
    quota = get_quota_status_snapshot()
    return {
        "gemini_configured": settings.is_gemini_configured,
        "gemini_model": resolve_gemini_model(),
        "gemini_key_hint": settings.gemini_key_hint,
        "quota_status": quota["quota_status"],
        "quota_cooldown_until": quota["quota_cooldown_until"],
        "last_quota_error": quota["last_quota_error"],
        "database_engine": "MySQL + SQLAlchemy",
        "agent_count": 2,
    }


def _validate_three_questions(items: list) -> list[tuple[str, str]]:
    if len(items) != 3:
        raise HTTPException(status_code=400, detail="Please answer all 3 personal security questions.")
    seen = set()
    normalized_pairs: list[tuple[str, str]] = []
    for item in items:
        q_key = item.question_key
        if q_key not in ALLOWED_SECURITY_QUESTION_KEYS or q_key in seen:
            raise HTTPException(status_code=400, detail="Please choose 3 different valid security questions.")
        norm = normalize_security_answer(item.answer)
        if len(norm) < 2 or len(norm) > 150:
            raise HTTPException(status_code=400, detail="Each security answer must be between 2 and 150 characters.")
        seen.add(q_key)
        normalized_pairs.append((q_key, norm))
    return normalized_pairs


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    pairs = _validate_three_questions(payload.security_questions)
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already registered.")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()

    for idx, (q_key, norm_ans) in enumerate(pairs, start=1):
        db.add(
            UserSecurityQuestion(
                user_id=user.id,
                slot_index=idx,
                question_key=q_key,
                answer_hash=hash_password(norm_ans),
            )
        )

    db.add(StudentProfile(user_id=user.id, full_name=user.full_name))
    db.commit()
    token = create_access_token(user.id, user.email)
    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role},
    }


@app.post("/api/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(user.id, user.email)
    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role},
    }


@app.post("/api/auth/forgot-password/questions")
def forgot_password_questions(payload: ForgotQuestionsRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email address.")

    if user.reset_locked_until and user.reset_locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect security answers. Password reset is locked for 15 minutes.",
        )

    rows = (
        db.query(UserSecurityQuestion)
        .filter(UserSecurityQuestion.user_id == user.id)
        .order_by(UserSecurityQuestion.slot_index.asc())
        .all()
    )
    if len(rows) != 3:
        raise HTTPException(status_code=400, detail="Personal security questions are not configured for this account.")

    return {
        "questions": [{"slot_index": row.slot_index, "question_key": row.question_key} for row in rows]
    }


@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    pairs = _validate_three_questions(payload.answers)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="One or more security question answers are incorrect.")

    now = datetime.utcnow()
    if user.reset_locked_until and user.reset_locked_until > now:
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect security answers. Password reset is locked for 15 minutes.",
        )

    stored_rows = (
        db.query(UserSecurityQuestion)
        .filter(UserSecurityQuestion.user_id == user.id)
        .order_by(UserSecurityQuestion.slot_index.asc())
        .all()
    )
    if len(stored_rows) != 3:
        raise HTTPException(status_code=400, detail="Personal security questions are not configured for this account.")

    answer_map = dict(pairs)
    all_match = True
    for row in stored_rows:
        candidate = answer_map.get(row.question_key)
        if not candidate or not verify_password(candidate, row.answer_hash):
            all_match = False

    if not all_match:
        prior = 0 if (user.reset_locked_until and user.reset_locked_until <= now) else (user.reset_failed_attempts or 0)
        next_failures = prior + 1
        user.reset_failed_attempts = next_failures
        user.reset_locked_until = now + timedelta(minutes=15) if next_failures >= 5 else None
        db.commit()
        detail = (
            "Too many incorrect security answers. Password reset is locked for 15 minutes."
            if next_failures >= 5
            else "One or more security question answers are incorrect."
        )
        raise HTTPException(status_code=400, detail=detail)

    user.password_hash = hash_password(payload.new_password)
    user.reset_failed_attempts = 0
    user.reset_locked_until = None
    user.password_changed_at = now
    db.commit()
    return {"ok": True, "message": "Password updated successfully. Please sign in with your new password."}


@app.get("/api/profile")
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        profile = StudentProfile(user_id=user.id, full_name=user.full_name)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return {"profile": profile}


@app.put("/api/profile")
def update_profile(
    payload: StudentProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        profile = StudentProfile(user_id=user.id)
        db.add(profile)
    data = payload.model_dump()
    pic = (data.get("profile_pic_url") or "").strip()
    if pic and not (
        pic.startswith("data:image/png;base64,")
        or pic.startswith("data:image/jpeg;base64,")
        or pic.startswith("data:image/jpg;base64,")
        or pic.startswith("data:image/webp;base64,")
        or pic.startswith("https://")
    ):
        raise HTTPException(status_code=400, detail="Invalid profile picture format.")
    for field, value in data.items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return {"profile": profile}


def _check_user_active_or_cooldown(user_id: str, db: Session) -> None:
    active = (
        db.query(ResearchTask)
        .filter(
            ResearchTask.user_id == user_id,
            ResearchTask.status.in_(["PENDING", "RUNNING"]),
        )
        .first()
    )
    if active:
        raise HTTPException(
            status_code=409,
            detail=f"A two-agent research task ({active.id[:8]}) is already running. Please wait for it to finish.",
        )

    quota = get_quota_status_snapshot()
    if quota["quota_status"] != "OK" and quota["quota_cooldown_until"]:
        raise HTTPException(
            status_code=429,
            detail=quota["last_quota_error"]
            or "Gemini API quota cooldown is active. Please wait before retrying or configure a billing-enabled GEMINI_API_KEY.",
        )


@app.post("/api/research/start", status_code=status.HTTP_202_ACCEPTED)
def start_research(
    payload: ResearchStartRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not get_settings().is_gemini_configured:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured. Add a valid billing-enabled key in python_app/.env or Settings > Secrets.",
        )
    _check_user_active_or_cooldown(user.id, db)

    task = ResearchTask(
        user_id=user.id,
        query_text=payload.query_text or "Active central and state government scholarships",
        state_filter=payload.state_filter,
        category_filter=payload.category_filter,
        education_filter=payload.education_filter,
        mode="live_research",
        language=payload.language,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    background_tasks.add_task(
        execute_two_agent_pipeline,
        task.id,
        user.id,
        task.query_text,
        task.state_filter,
        task.category_filter,
        task.education_filter,
        "live_research",
        "",
        None,
        payload.language,
        payload.force_refresh,
        None,
    )
    return {"task_id": task.id, "status": task.status}


@app.post("/api/research/developer-test", status_code=status.HTTP_202_ACCEPTED)
def start_developer_test(
    payload: DeveloperTestRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not get_settings().is_gemini_configured:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is required.")
    _check_user_active_or_cooldown(user.id, db)

    task = ResearchTask(
        user_id=user.id,
        query_text=f"[DEV SANDBOX] {payload.scenario_name}",
        mode="developer_test",
        language=payload.language,
        custom_prompt=payload.custom_prompt,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    background_tasks.add_task(
        execute_two_agent_pipeline,
        task.id,
        user.id,
        task.query_text,
        "",
        "",
        "",
        "developer_test",
        payload.custom_prompt,
        payload.test_profile,
        payload.language,
        payload.force_refresh,
        None,
    )
    return {"task_id": task.id, "status": task.status, "mode": "developer_test"}


@app.get("/api/tasks")
def list_tasks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = (
        db.query(ResearchTask)
        .filter(ResearchTask.user_id == user.id)
        .order_by(ResearchTask.started_at.desc())
        .limit(30)
        .all()
    )
    return {"tasks": tasks}


@app.get("/api/tasks/{task_id}")
def get_task(task_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(ResearchTask).filter(ResearchTask.id == task_id, ResearchTask.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    messages = (
        db.query(AgentMessage)
        .filter(AgentMessage.task_id == task_id)
        .order_by(AgentMessage.created_at.asc())
        .all()
    )
    return {"task": task, "messages": messages}


@app.post("/api/tasks/{task_id}/retry", status_code=status.HTTP_202_ACCEPTED)
def retry_task(
    task_id: str,
    payload: RetryTaskRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not get_settings().is_gemini_configured:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured. Add a valid billing-enabled key before retrying.",
        )
    _check_user_active_or_cooldown(user.id, db)

    task = (
        db.query(ResearchTask)
        .filter(ResearchTask.id == task_id, ResearchTask.user_id == user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Research task not found.")
    if task.status != "FAILED":
        raise HTTPException(status_code=409, detail="Only FAILED research tasks can be retried.")

    pre_bundle: A2AResearchBundle | None = None
    existing_sch_count = (
        db.query(Scholarship).filter(Scholarship.task_id == task_id).count()
    )
    if task.agent1_status == "DONE" and not payload.force_refresh and existing_sch_count == 0:
        bundle_msg = (
            db.query(AgentMessage)
            .filter(
                AgentMessage.task_id == task_id,
                AgentMessage.message_type == "RESEARCH_RESULT_BUNDLE",
                AgentMessage.status == "DELIVERED",
            )
            .order_by(AgentMessage.created_at.desc())
            .first()
        )
        if bundle_msg and isinstance(bundle_msg.payload_json, dict):
            try:
                candidate = A2AResearchBundle(**bundle_msg.payload_json)
                valid, _ = validate_research_bundle_for_agent2(candidate)
                if valid:
                    pre_bundle = candidate
            except Exception:
                pre_bundle = None

    task.status = "PENDING"
    task.agent1_status = "DONE" if pre_bundle else "IDLE"
    task.agent2_status = "WAITING" if pre_bundle else "IDLE"
    task.error_message = None
    task.completed_at = None
    task.retry_count = (task.retry_count or 0) + 1
    task.current_stage = (
        f"Retry #{task.retry_count} queued (resuming Agent 2)"
        if pre_bundle
        else f"Retry #{task.retry_count} queued"
    )
    db.add(
        AgentMessage(
            task_id=task.id,
            sender_agent="ORCHESTRATOR",
            receiver_agent="AGENT_2_ELIGIBILITY" if pre_bundle else "AGENT_1_RESEARCH",
            message_type="TASK_RETRY_REQUESTED",
            payload_json={
                "retry_attempt": task.retry_count,
                "resumed_from_agent2": pre_bundle is not None,
                "force_refresh": payload.force_refresh,
            },
            status="DELIVERED",
        )
    )
    db.commit()

    background_tasks.add_task(
        execute_two_agent_pipeline,
        task.id,
        user.id,
        task.query_text,
        task.state_filter,
        task.category_filter,
        task.education_filter,
        task.mode or "live_research",
        task.custom_prompt or "",
        None,
        task.language or "en",
        payload.force_refresh,
        pre_bundle,
    )
    return {
        "ok": True,
        "task_id": task.id,
        "status": "PENDING",
        "resumed_from_agent2": pre_bundle is not None,
    }


@app.get("/api/scholarships")
def list_scholarships(
    include_test: bool = Query(default=False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Scholarship).filter(Scholarship.user_id == user.id)
    if not include_test:
        q = q.filter(Scholarship.is_test_data == False)  # noqa: E712
    items = q.order_by(Scholarship.created_at.desc()).all()

    enriched = []
    for sch in items:
        rep = db.query(EligibilityReport).filter(EligibilityReport.scholarship_id == sch.id).first()
        plan = db.query(ApplicationPlan).filter(ApplicationPlan.scholarship_id == sch.id).first()
        saved = db.query(SavedScheme).filter(SavedScheme.scholarship_id == sch.id, SavedScheme.user_id == user.id).first()
        enriched.append(
            {
                "scholarship": sch,
                "criteria": sch.criteria,
                "sources": sch.sources,
                "eligibility_report": rep,
                "application_plan": plan,
                "is_saved": saved is not None,
            }
        )
    return {"scholarships": enriched}


@app.patch("/api/plans/{plan_id}/checklist")
def update_plan_checklist(
    plan_id: str,
    payload: PlanChecklistUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(ApplicationPlan).filter(ApplicationPlan.id == plan_id, ApplicationPlan.user_id == user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")
    if payload.steps is not None:
        plan.steps_json = payload.steps
    if payload.document_checklist is not None:
        plan.document_checklist_json = payload.document_checklist
    if payload.notes is not None:
        plan.notes = payload.notes
    if payload.application_number is not None:
        plan.application_number = payload.application_number.strip()
    db.commit()
    return {"ok": True, "application_number": plan.application_number}


@app.patch("/api/plans/{plan_id}/stage")
def update_plan_stage(
    plan_id: str,
    payload: PlanStageUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(ApplicationPlan).filter(ApplicationPlan.id == plan_id, ApplicationPlan.user_id == user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")
    if (
        payload.application_stage in ("Portal Approved by Student", "Self-Submitted by Student")
        and not payload.human_approved
        and not plan.human_approved_portal_open
    ):
        raise HTTPException(
            status_code=400,
            detail="Explicit human approval required before opening external portal.",
        )
    plan.application_stage = payload.application_stage
    if payload.application_number is not None:
        plan.application_number = payload.application_number.strip()
    if payload.human_approved:
        plan.human_approved_portal_open = True
        plan.approved_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "application_stage": plan.application_stage, "application_number": plan.application_number}
