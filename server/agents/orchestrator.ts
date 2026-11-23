import crypto from 'node:crypto';
import { db } from '../db.ts';
import {
  classifyGeminiError,
  validateResearchBundleForAgent2,
} from '../geminiResilience.ts';
import type { A2AResearchBundle, StudentProfile } from '../types.ts';
import { runResearchAgent } from './researchAgent.ts';
import { runEligibilityAndPlanningAgent } from './eligibilityAgent.ts';

function logAgentMessage(params: {
  taskId: string;
  sender: 'ORCHESTRATOR' | 'AGENT_1_RESEARCH' | 'AGENT_2_ELIGIBILITY';
  receiver: 'AGENT_1_RESEARCH' | 'AGENT_2_ELIGIBILITY' | 'ORCHESTRATOR';
  messageType: string;
  payload: Record<string, unknown>;
  status?: 'SENT' | 'DELIVERED' | 'PROCESSED' | 'ERROR';
}): string {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO agent_messages (id, task_id, sender_agent, receiver_agent, message_type, payload_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.taskId,
    params.sender,
    params.receiver,
    params.messageType,
    JSON.stringify(params.payload),
    params.status ?? 'SENT',
    new Date().toISOString()
  );
  return id;
}

function updateTaskState(
  taskId: string,
  fields: {
    status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    current_stage?: string;
    agent1_status?: 'IDLE' | 'SEARCHING' | 'VERIFYING' | 'DONE' | 'FAILED';
    agent2_status?: 'IDLE' | 'WAITING' | 'EVALUATING' | 'PLANNING' | 'DONE' | 'FAILED';
    error_message?: string | null;
    retry_count?: number;
    completed_at?: string | null;
  }
): void {
  const sets: string[] = [];
  const values: Array<string | number | null> = [];
  if (fields.status !== undefined) {
    sets.push('status = ?');
    values.push(fields.status);
  }
  if (fields.current_stage !== undefined) {
    sets.push('current_stage = ?');
    values.push(fields.current_stage);
  }
  if (fields.agent1_status !== undefined) {
    sets.push('agent1_status = ?');
    values.push(fields.agent1_status);
  }
  if (fields.agent2_status !== undefined) {
    sets.push('agent2_status = ?');
    values.push(fields.agent2_status);
  }
  if (fields.error_message !== undefined) {
    sets.push('error_message = ?');
    values.push(fields.error_message);
  }
  if (fields.retry_count !== undefined) {
    sets.push('retry_count = ?');
    values.push(fields.retry_count);
  }
  if (fields.completed_at !== undefined) {
    sets.push('completed_at = ?');
    values.push(fields.completed_at);
  }
  if (sets.length === 0) return;
  values.push(taskId);
  db.prepare(`UPDATE research_tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

/**
 * Mark any tasks stuck in PENDING/RUNNING after a server restart as FAILED
 * so users can inspect them and click Retry Task cleanly without endless polling.
 */
export function recoverInterruptedTasks(): number {
  const stuckRows = db
    .prepare("SELECT id, agent1_status FROM research_tasks WHERE status IN ('PENDING', 'RUNNING')")
    .all() as Array<{ id: string; agent1_status: string }>;

  if (stuckRows.length === 0) return 0;

  const nowIso = new Date().toISOString();
  const interruptionMsg =
    'Task execution was interrupted by a server restart before completion. Click Retry Task to resume with this Task ID.';

  for (const row of stuckRows) {
    logAgentMessage({
      taskId: row.id,
      sender: 'ORCHESTRATOR',
      receiver: 'AGENT_1_RESEARCH',
      messageType: 'TASK_INTERRUPTED',
      payload: {
        reason: interruptionMsg,
        previous_agent1_status: row.agent1_status,
      },
      status: 'ERROR',
    });
    updateTaskState(row.id, {
      status: 'FAILED',
      current_stage: 'Interrupted by server restart — ready to retry',
      agent1_status: row.agent1_status === 'DONE' ? 'DONE' : 'FAILED',
      agent2_status: row.agent1_status === 'DONE' ? 'FAILED' : 'IDLE',
      error_message: interruptionMsg,
      completed_at: nowIso,
    });
  }

  return stuckRows.length;
}

export interface StartPipelineInput {
  userId: string;
  queryText: string;
  stateFilter: string;
  categoryFilter: string;
  educationFilter: string;
  profile: StudentProfile;
  mode: 'live_research' | 'developer_test';
  language?: 'en' | 'kn' | 'hi';
  forceRefresh?: boolean;
  developerTestPayload?: {
    scenarioName?: string;
    customPrompt?: string;
  };
}

interface PipelineExecutionParams {
  taskId: string;
  userId: string;
  queryText: string;
  stateFilter: string;
  categoryFilter: string;
  educationFilter: string;
  profile: StudentProfile;
  mode: 'live_research' | 'developer_test';
  language: 'en' | 'kn' | 'hi';
  forceRefresh: boolean;
  baseRetryCount: number;
  customPrompt?: string;
  resumeBundle?: A2AResearchBundle | null;
}

function executePipelineInBackground(params: PipelineExecutionParams): void {
  const { taskId } = params;

  setImmediate(async () => {
    let agent1Completed = Boolean(params.resumeBundle);
    let totalRetriesUsed = params.baseRetryCount;

    try {
      let bundle: A2AResearchBundle;

      if (params.resumeBundle) {
        bundle = params.resumeBundle;
        updateTaskState(taskId, {
          status: 'RUNNING',
          current_stage: 'Resuming with validated Agent 1 research bundle for Agent 2',
          agent1_status: 'DONE',
          agent2_status: 'WAITING',
          error_message: null,
        });
      } else {
        updateTaskState(taskId, {
          status: 'RUNNING',
          current_stage: 'Agent 1 starting official portal research',
          agent1_status: 'SEARCHING',
          agent2_status: 'WAITING',
          error_message: null,
        });

        const agent1Output = await runResearchAgent(
          {
            taskId,
            queryText: params.queryText,
            stateFilter: params.stateFilter,
            categoryFilter: params.categoryFilter,
            educationFilter: params.educationFilter,
            profile: params.profile,
            mode: params.mode,
            forceRefresh: params.forceRefresh,
            developerTestPayload: params.customPrompt
              ? { customPrompt: params.customPrompt }
              : undefined,
          },
          (stage, agent1Status) => {
            updateTaskState(taskId, {
              current_stage: stage,
              agent1_status: agent1Status,
            });
          }
        );

        bundle = agent1Output.bundle;
        totalRetriesUsed += agent1Output.retriesUsed;

        // Genuine Agent-to-Agent structured JSON message handoff
        const handoffMessageId = logAgentMessage({
          taskId,
          sender: 'AGENT_1_RESEARCH',
          receiver: 'AGENT_2_ELIGIBILITY',
          messageType: 'RESEARCH_RESULT_BUNDLE',
          payload: bundle as unknown as Record<string, unknown>,
          status: 'DELIVERED',
        });

        // Strict validation gate: Agent 2 must NOT run unless Agent 1 delivered valid research data
        const validation = validateResearchBundleForAgent2(bundle);
        if (!validation.valid) {
          logAgentMessage({
            taskId,
            sender: 'AGENT_2_ELIGIBILITY',
            receiver: 'AGENT_1_RESEARCH',
            messageType: 'RESEARCH_VALIDATION_REJECTED',
            payload: {
              rejected_message_id: handoffMessageId,
              reason:
                validation.reason ||
                'Agent 2 did not run eligibility analysis because valid verified research data is unavailable.',
            },
            status: 'PROCESSED',
          });
          updateTaskState(taskId, {
            status: 'COMPLETED',
            retry_count: totalRetriesUsed,
            current_stage:
              'Completed — no verified schemes matched official source validation (Agent 2 skipped)',
            agent1_status: 'DONE',
            agent2_status: 'IDLE',
            completed_at: new Date().toISOString(),
          });
          return;
        }

        agent1Completed = true;
        updateTaskState(taskId, {
          retry_count: totalRetriesUsed,
          current_stage: agent1Output.cacheHit
            ? 'Agent 1 delivered cached verified A2A bundle to Agent 2'
            : 'Agent 1 transmitted structured A2A JSON bundle to Agent 2',
          agent1_status: 'DONE',
        });

        logAgentMessage({
          taskId,
          sender: 'AGENT_2_ELIGIBILITY',
          receiver: 'AGENT_1_RESEARCH',
          messageType: 'A2A_BUNDLE_ACKNOWLEDGED',
          payload: {
            acknowledged_message_id: handoffMessageId,
            schemes_received: validation.validSchemes.length,
            grounding_urls_count: bundle.grounding_urls_discovered.length,
            cache_hit: agent1Output.cacheHit,
          },
          status: 'PROCESSED',
        });
      }

      const agent2Output = await runEligibilityAndPlanningAgent(
        bundle,
        params.profile,
        (stage, agent2Status) => {
          updateTaskState(taskId, {
            current_stage: stage,
            agent2_status: agent2Status,
          });
        },
        params.language
      );

      totalRetriesUsed += agent2Output.retriesUsed;

      // Persist all scholarships, criteria, sources, eligibility reports, and application plans atomically
      const persistTimestamp = new Date().toISOString();
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const analyzed of agent2Output.analyzedSchemes) {
          const item = bundle.schemes[analyzed.schemeIndex];
          if (!item) continue;

          const scholarshipId = crypto.randomUUID();
          const criteriaId = crypto.randomUUID();
          const reportId = crypto.randomUUID();
          const planId = crypto.randomUUID();

          db.prepare(
            `INSERT INTO scholarships (
              id, task_id, user_id, official_name, provider_ministry, portal_name, scheme_type,
              description, benefits_summary, benefit_amount_inr, opening_date, application_deadline,
              academic_year, official_portal_url, source_url, verification_status, outdated_flag,
              outdated_reason, last_verified_at, is_test_data, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            scholarshipId,
            taskId,
            params.userId,
            item.scholarship.official_name,
            item.scholarship.provider_ministry,
            item.scholarship.portal_name,
            item.scholarship.scheme_type,
            item.scholarship.description,
            item.scholarship.benefits_summary,
            item.scholarship.benefit_amount_inr,
            item.scholarship.opening_date,
            item.scholarship.application_deadline,
            item.scholarship.academic_year,
            item.scholarship.official_portal_url,
            item.scholarship.source_url,
            item.scholarship.verification_status,
            item.scholarship.outdated_flag ? 1 : 0,
            item.scholarship.outdated_reason,
            item.scholarship.last_verified_at,
            item.scholarship.is_test_data ? 1 : 0,
            persistTimestamp
          );

          db.prepare(
            `INSERT INTO eligibility_criteria (
              id, scholarship_id, min_education_level, allowed_states_json, allowed_categories_json,
              max_family_income_inr, income_limit_note, min_percentage, allowed_courses_json,
              gender_requirement, disability_requirement, minority_requirement,
              institution_requirement, other_conditions_json, required_documents_json, rules_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            criteriaId,
            scholarshipId,
            item.criteria.min_education_level,
            JSON.stringify(item.criteria.allowed_states),
            JSON.stringify(item.criteria.allowed_categories),
            item.criteria.max_family_income_inr,
            item.criteria.income_limit_note,
            item.criteria.min_percentage,
            JSON.stringify(item.criteria.allowed_courses),
            item.criteria.gender_requirement,
            item.criteria.disability_requirement,
            item.criteria.minority_requirement,
            item.criteria.institution_requirement,
            JSON.stringify(item.criteria.other_conditions),
            JSON.stringify(item.criteria.required_documents),
            item.criteria.rules_verified ? 1 : 0
          );

          for (const src of item.sources) {
            db.prepare(
              `INSERT INTO official_sources (
                id, scholarship_id, source_title, source_url, domain_authority, excerpt, http_reachable, retrieved_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(
              crypto.randomUUID(),
              scholarshipId,
              src.source_title,
              src.source_url,
              src.domain_authority,
              src.excerpt,
              src.http_reachable === null ? null : src.http_reachable ? 1 : 0,
              persistTimestamp
            );
          }

          db.prepare(
            `INSERT INTO eligibility_reports (
              id, task_id, user_id, scholarship_id, outcome, rule_checks_json,
              missing_fields_json, explanation_summary, evidence_urls_json, evaluated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            reportId,
            taskId,
            params.userId,
            scholarshipId,
            analyzed.outcome,
            JSON.stringify(analyzed.rule_checks),
            JSON.stringify(analyzed.missing_fields),
            analyzed.explanation_summary,
            JSON.stringify(analyzed.evidence_urls),
            persistTimestamp
          );

          db.prepare(
            `INSERT INTO application_plans (
              id, user_id, scholarship_id, eligibility_report_id, steps_json,
              document_checklist_json, deadline_date, human_approved_portal_open,
              approved_at, application_stage, notes, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, 'Plan Ready (Not Submitted)', '', ?)`
          ).run(
            planId,
            params.userId,
            scholarshipId,
            reportId,
            JSON.stringify(analyzed.steps),
            JSON.stringify(analyzed.document_checklist),
            item.scholarship.application_deadline,
            persistTimestamp
          );
        }
        db.exec('COMMIT');
      } catch (persistErr) {
        db.exec('ROLLBACK');
        throw persistErr;
      }

      logAgentMessage({
        taskId,
        sender: 'AGENT_2_ELIGIBILITY',
        receiver: 'ORCHESTRATOR',
        messageType: 'ELIGIBILITY_AND_PLANS_PERSISTED',
        payload: {
          summary: agent2Output.agent2Summary,
          schemes_evaluated: agent2Output.analyzedSchemes.length,
          outcomes: agent2Output.analyzedSchemes.map((s) => ({
            scheme: bundle.schemes[s.schemeIndex]?.scholarship.official_name,
            outcome: s.outcome,
            missing_fields: s.missing_fields,
          })),
        },
        status: 'PROCESSED',
      });

      updateTaskState(taskId, {
        status: 'COMPLETED',
        retry_count: totalRetriesUsed,
        current_stage: agent2Output.agent2Summary,
        agent1_status: 'DONE',
        agent2_status: 'DONE',
        error_message: null,
        completed_at: new Date().toISOString(),
      });
    } catch (err) {
      const classified = classifyGeminiError(err);
      const message = classified.userMessage;

      logAgentMessage({
        taskId,
        sender: agent1Completed ? 'AGENT_2_ELIGIBILITY' : 'AGENT_1_RESEARCH',
        receiver: 'ORCHESTRATOR',
        messageType: 'PIPELINE_ERROR',
        payload: {
          failed_agent: agent1Completed ? 'AGENT_2_ELIGIBILITY' : 'AGENT_1_RESEARCH',
          error_category: classified.category,
          http_status: classified.httpStatus,
          retry_after_seconds: classified.retryAfterMs
            ? Math.ceil(classified.retryAfterMs / 1000)
            : null,
          error: message,
          agent2_blocked: !agent1Completed,
        },
        status: 'ERROR',
      });

      updateTaskState(taskId, {
        status: 'FAILED',
        retry_count: totalRetriesUsed,
        current_stage: agent1Completed
          ? 'Agent 2 halted — eligible for retry'
          : 'Agent 1 halted — Agent 2 did not run',
        agent1_status: agent1Completed ? 'DONE' : 'FAILED',
        agent2_status: agent1Completed ? 'FAILED' : 'IDLE',
        error_message: message,
        completed_at: new Date().toISOString(),
      });
    }
  });
}

export function launchTwoAgentResearchTask(input: StartPipelineInput): string {
  const taskId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const language: 'en' | 'kn' | 'hi' = input.language || 'en';
  const customPrompt = input.developerTestPayload?.customPrompt || '';

  db.prepare(
    `INSERT INTO research_tasks (
      id, user_id, query_text, state_filter, category_filter, education_filter,
      mode, language, custom_prompt, status, current_stage, agent1_status, agent2_status, started_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'Task queued for Agent 1', 'IDLE', 'WAITING', ?)`
  ).run(
    taskId,
    input.userId,
    input.queryText,
    input.stateFilter,
    input.categoryFilter,
    input.educationFilter,
    input.mode,
    language,
    customPrompt,
    nowIso
  );

  logAgentMessage({
    taskId,
    sender: 'ORCHESTRATOR',
    receiver: 'AGENT_1_RESEARCH',
    messageType: 'RESEARCH_TASK_DISPATCHED',
    payload: {
      task_id: taskId,
      mode: input.mode,
      query_text: input.queryText,
      filters: {
        state: input.stateFilter,
        category: input.categoryFilter,
        education: input.educationFilter,
      },
    },
    status: 'DELIVERED',
  });

  executePipelineInBackground({
    taskId,
    userId: input.userId,
    queryText: input.queryText,
    stateFilter: input.stateFilter,
    categoryFilter: input.categoryFilter,
    educationFilter: input.educationFilter,
    profile: input.profile,
    mode: input.mode,
    language,
    forceRefresh: Boolean(input.forceRefresh),
    baseRetryCount: 0,
    customPrompt,
    resumeBundle: null,
  });

  return taskId;
}

export function retryTwoAgentResearchTask(params: {
  taskId: string;
  userId: string;
  profile: StudentProfile;
  forceRefresh?: boolean;
}): { ok: true; resumedFromAgent2: boolean } | { ok: false; status: number; error: string } {
  const task = db
    .prepare('SELECT * FROM research_tasks WHERE id = ? AND user_id = ?')
    .get(params.taskId, params.userId) as Record<string, unknown> | undefined;

  if (!task) {
    return { ok: false, status: 404, error: 'Research task not found.' };
  }

  const currentStatus = String(task.status);
  if (currentStatus === 'PENDING' || currentStatus === 'RUNNING') {
    return { ok: false, status: 409, error: 'This task is already queued or running.' };
  }
  if (currentStatus !== 'FAILED') {
    return { ok: false, status: 400, error: 'Only failed tasks can be retried.' };
  }

  const nextRetryCount = Number(task.retry_count || 0) + 1;
  const languageRaw = String(task.language || 'en');
  const language: 'en' | 'kn' | 'hi' =
    languageRaw === 'kn' || languageRaw === 'hi' ? languageRaw : 'en';
  const mode: 'live_research' | 'developer_test' =
    String(task.mode) === 'developer_test' ? 'developer_test' : 'live_research';

  // If Agent 1 previously succeeded and handed off a valid bundle, and no scholarships were written yet,
  // Agent 2 can resume directly without repeating Agent 1 Gemini calls (unless forceRefresh=true).
  let resumeBundle: A2AResearchBundle | null = null;
  if (!params.forceRefresh && String(task.agent1_status) === 'DONE') {
    const existingSchemesCount = (
      db.prepare('SELECT COUNT(*) AS cnt FROM scholarships WHERE task_id = ?').get(params.taskId) as {
        cnt: number;
      }
    ).cnt;

    if (existingSchemesCount === 0) {
      const bundleMsg = db
        .prepare(
          `SELECT payload_json FROM agent_messages
           WHERE task_id = ? AND sender_agent = 'AGENT_1_RESEARCH' AND message_type = 'RESEARCH_RESULT_BUNDLE'
           ORDER BY created_at DESC LIMIT 1`
        )
        .get(params.taskId) as { payload_json: string } | undefined;

      if (bundleMsg) {
        try {
          const parsedBundle = JSON.parse(bundleMsg.payload_json) as A2AResearchBundle;
          const validation = validateResearchBundleForAgent2(parsedBundle);
          if (validation.valid) {
            parsedBundle.schemes = validation.validSchemes;
            resumeBundle = parsedBundle;
          }
        } catch {
          resumeBundle = null;
        }
      }
    }
  }

  logAgentMessage({
    taskId: params.taskId,
    sender: 'ORCHESTRATOR',
    receiver: resumeBundle ? 'AGENT_2_ELIGIBILITY' : 'AGENT_1_RESEARCH',
    messageType: 'TASK_RETRY_REQUESTED',
    payload: {
      task_id: params.taskId,
      retry_attempt: nextRetryCount,
      resuming_from_validated_agent1_bundle: Boolean(resumeBundle),
      previous_error: task.error_message || null,
    },
    status: 'DELIVERED',
  });

  updateTaskState(params.taskId, {
    status: 'PENDING',
    retry_count: nextRetryCount,
    error_message: null,
    completed_at: null,
    current_stage: resumeBundle
      ? `Retry #${nextRetryCount} queued — resuming Agent 2 with validated research bundle`
      : `Retry #${nextRetryCount} queued — re-dispatching Agent 1`,
    agent1_status: resumeBundle ? 'DONE' : 'IDLE',
    agent2_status: 'WAITING',
  });

  executePipelineInBackground({
    taskId: params.taskId,
    userId: params.userId,
    queryText: String(task.query_text || ''),
    stateFilter: String(task.state_filter || ''),
    categoryFilter: String(task.category_filter || ''),
    educationFilter: String(task.education_filter || ''),
    profile: params.profile,
    mode,
    language,
    forceRefresh: Boolean(params.forceRefresh),
    baseRetryCount: nextRetryCount,
    customPrompt: String(task.custom_prompt || ''),
    resumeBundle,
  });

  return { ok: true, resumedFromAgent2: Boolean(resumeBundle) };
}
