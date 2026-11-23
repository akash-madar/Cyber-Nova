"""Async A2A Orchestrator coordinating Agent 1 -> JSON Message Bus -> Agent 2."""
from __future__ import annotations

from datetime import datetime
from backend.agent1_research import run_agent1_research
from backend.agent2_eligibility import run_agent2_analysis
from backend.database import SessionLocal
from backend.gemini_resilience import validate_research_bundle_for_agent2
from backend.models import (
    AgentMessage,
    ApplicationPlan,
    EligibilityCriterion,
    EligibilityReport,
    OfficialSource,
    ResearchTask,
    Scholarship,
    StudentProfile,
)
from backend.schemas import A2AResearchBundle


def recover_interrupted_tasks() -> None:
    db = SessionLocal()
    try:
        interrupted = (
            db.query(ResearchTask)
            .filter(ResearchTask.status.in_(["PENDING", "RUNNING"]))
            .all()
        )
        now = datetime.utcnow()
        for task in interrupted:
            if task.agent1_status != "DONE":
                task.agent1_status = "FAILED"
                task.agent2_status = "IDLE"
            elif task.agent2_status not in ("DONE", "IDLE"):
                task.agent2_status = "FAILED"
            task.status = "FAILED"
            task.current_stage = "Task interrupted by server restart — ready to retry"
            task.error_message = (
                "Execution was interrupted when the backend server restarted. "
                "Use Retry Task to resume with the same Task ID and logs."
            )
            task.completed_at = now
            db.add(
                AgentMessage(
                    task_id=task.id,
                    sender_agent="ORCHESTRATOR",
                    receiver_agent="SYSTEM",
                    message_type="TASK_INTERRUPTED",
                    payload_json={"reason": "Server restarted while task was active"},
                    status="ERROR",
                )
            )
        db.commit()
    finally:
        db.close()


def execute_two_agent_pipeline(
    task_id: str,
    user_id: str,
    query_text: str,
    state_filter: str,
    category_filter: str,
    education_filter: str,
    mode: str = "live_research",
    custom_prompt: str = "",
    test_profile_override: dict | None = None,
    language: str = "en",
    force_refresh: bool = False,
    pre_validated_bundle: A2AResearchBundle | None = None,
) -> None:
    db = SessionLocal()
    agent1_done = False
    try:
        task = db.query(ResearchTask).filter(ResearchTask.id == task_id).first()
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        if not task or not profile:
            return

        if mode == "developer_test" and test_profile_override:
            for k, v in test_profile_override.items():
                if hasattr(profile, k):
                    setattr(profile, k, v)

        if pre_validated_bundle is not None:
            bundle = pre_validated_bundle
            agent1_done = True
            task.status = "RUNNING"
            task.agent1_status = "DONE"
            task.agent2_status = "EVALUATING"
            task.error_message = None
            task.current_stage = "Resuming Agent 2 from verified Agent 1 research bundle"
            db.commit()
        else:
            task.status = "RUNNING"
            task.agent1_status = "SEARCHING"
            task.agent2_status = "WAITING"
            task.error_message = None
            task.current_stage = "Agent 1 researching official portals via Google Search Grounding"
            db.commit()

            bundle, retries = run_agent1_research(
                task_id=task_id,
                query_text=query_text,
                state_filter=state_filter,
                category_filter=category_filter,
                education_filter=education_filter,
                profile=profile,
                mode=mode,
                custom_prompt=custom_prompt,
                db=db,
                force_refresh=force_refresh,
            )

            task.retry_count = (task.retry_count or 0) + retries
            valid, validation_reasons = validate_research_bundle_for_agent2(bundle)
            if not valid:
                reason_text = "; ".join(validation_reasons)
                task.status = "FAILED"
                task.agent1_status = "DONE"
                task.agent2_status = "IDLE"
                task.error_message = (
                    f"Agent 1 completed without valid verified scholarship records ({reason_text}). "
                    "Agent 2 did not run."
                )
                task.current_stage = "Agent 2 skipped — no verified research records available"
                task.completed_at = datetime.utcnow()
                db.add(
                    AgentMessage(
                        task_id=task_id,
                        sender_agent="AGENT_1_RESEARCH",
                        receiver_agent="AGENT_2_ELIGIBILITY",
                        message_type="RESEARCH_VALIDATION_REJECTED",
                        payload_json={"reasons": validation_reasons, "scheme_count": len(bundle.schemes)},
                        status="ERROR",
                    )
                )
                db.commit()
                return

            agent1_done = True
            task.agent1_status = "DONE"
            task.current_stage = "Agent 1 transmitted validated A2A bundle to Agent 2"
            db.add(
                AgentMessage(
                    task_id=task_id,
                    sender_agent="AGENT_1_RESEARCH",
                    receiver_agent="AGENT_2_ELIGIBILITY",
                    message_type="RESEARCH_RESULT_BUNDLE",
                    payload_json=bundle.model_dump(),
                    status="DELIVERED",
                )
            )
            db.commit()

            task.agent2_status = "EVALUATING"
            task.current_stage = "Agent 2 running deterministic eligibility checks & building plans"
            db.commit()

        analyzed = run_agent2_analysis(bundle, profile, language=language)

        for item in analyzed:
            sch_data = bundle.schemes[item["scheme_index"]]
            sch = Scholarship(
                task_id=task_id,
                user_id=user_id,
                official_name=sch_data.official_name,
                provider_ministry=sch_data.provider_ministry,
                portal_name=sch_data.portal_name,
                scheme_type=sch_data.scheme_type,
                description=sch_data.description,
                benefits_summary=sch_data.benefits_summary,
                benefit_amount_inr=sch_data.benefit_amount_inr,
                opening_date=sch_data.opening_date,
                application_deadline=sch_data.application_deadline,
                academic_year=sch_data.academic_year,
                official_portal_url=sch_data.official_portal_url,
                source_url=sch_data.source_url,
                verification_status=sch_data.verification_status,
                outdated_flag=sch_data.outdated_flag,
                outdated_reason=sch_data.outdated_reason,
                is_test_data=(mode == "developer_test"),
            )
            db.add(sch)
            db.flush()

            db.add(
                EligibilityCriterion(
                    scholarship_id=sch.id,
                    min_education_level=sch_data.min_education_level,
                    allowed_states_json=sch_data.allowed_states,
                    allowed_categories_json=sch_data.allowed_categories,
                    max_family_income_inr=sch_data.max_family_income_inr,
                    income_limit_note=sch_data.income_limit_note,
                    min_percentage=sch_data.min_percentage,
                    allowed_courses_json=sch_data.allowed_courses,
                    gender_requirement=sch_data.gender_requirement,
                    disability_requirement=sch_data.disability_requirement,
                    minority_requirement=sch_data.minority_requirement,
                    institution_requirement=sch_data.institution_requirement,
                    other_conditions_json=sch_data.other_conditions,
                    required_documents_json=sch_data.required_documents,
                    rules_verified=sch_data.rules_verified,
                )
            )

            for src in sch_data.sources:
                db.add(
                    OfficialSource(
                        scholarship_id=sch.id,
                        source_title=src.get("source_title", "Official Source"),
                        source_url=src.get("source_url", ""),
                        domain_authority=src.get("domain_authority", ""),
                        excerpt=src.get("excerpt", ""),
                        http_reachable=src.get("http_reachable"),
                    )
                )

            report = EligibilityReport(
                task_id=task_id,
                user_id=user_id,
                scholarship_id=sch.id,
                outcome=item["outcome"],
                rule_checks_json=item["rule_checks"],
                missing_fields_json=item["missing_fields"],
                explanation_summary=item["explanation_summary"],
                evidence_urls_json=item["evidence_urls"],
            )
            db.add(report)
            db.flush()

            db.add(
                ApplicationPlan(
                    user_id=user_id,
                    scholarship_id=sch.id,
                    eligibility_report_id=report.id,
                    steps_json=item["steps"],
                    document_checklist_json=item["document_checklist"],
                    deadline_date=sch_data.application_deadline,
                    human_approved_portal_open=False,
                    application_stage="Plan Ready (Not Submitted)",
                    application_number="",
                    notes="",
                )
            )

        db.add(
            AgentMessage(
                task_id=task_id,
                sender_agent="AGENT_2_ELIGIBILITY",
                receiver_agent="ORCHESTRATOR",
                message_type="ELIGIBILITY_AND_PLANS_PERSISTED",
                payload_json={"schemes_evaluated": len(analyzed)},
                status="PROCESSED",
            )
        )
        task.status = "COMPLETED"
        task.agent2_status = "DONE"
        task.error_message = None
        task.current_stage = f"Evaluated {len(analyzed)} schemes and created application plans."
        task.completed_at = datetime.utcnow()
        db.commit()
    except Exception as exc:
        db.rollback()
        task = db.query(ResearchTask).filter(ResearchTask.id == task_id).first()
        if task:
            task.status = "FAILED"
            if not agent1_done:
                task.agent1_status = "FAILED"
                task.agent2_status = "IDLE"
                task.current_stage = "Agent 1 failed — Agent 2 did not run"
            else:
                task.agent1_status = "DONE"
                task.agent2_status = "FAILED"
                task.current_stage = "Agent 2 failed — retry task to resume"
            task.error_message = str(exc)
            task.completed_at = datetime.utcnow()
            db.add(
                AgentMessage(
                    task_id=task_id,
                    sender_agent="AGENT_2_ELIGIBILITY" if agent1_done else "AGENT_1_RESEARCH",
                    receiver_agent="ORCHESTRATOR",
                    message_type="AGENT_EXECUTION_FAILED",
                    payload_json={"error": str(exc), "agent1_done": agent1_done},
                    status="ERROR",
                )
            )
            db.commit()
    finally:
        db.close()

