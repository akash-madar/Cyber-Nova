export type EligibilityOutcome =
  | 'Likely Eligible'
  | 'Not Eligible'
  | 'Needs More Information';

export type RuleCheckStatus =
  | 'PASS'
  | 'FAIL'
  | 'MISSING_STUDENT_DATA'
  | 'UNVERIFIED_RULE';

export type ApplicationStage =
  | 'Discovered'
  | 'Plan Ready (Not Submitted)'
  | 'Documents Gathering'
  | 'Portal Approved by Student'
  | 'Self-Submitted by Student';

export type SecurityQuestionKey =
  | 'birth_city'
  | 'first_school'
  | 'childhood_nickname'
  | 'mother_name'
  | 'favorite_teacher'
  | 'favorite_pet_or_book';

export interface SecurityQuestionItem {
  slot_index: number;
  question_key: SecurityQuestionKey;
}

export interface SecurityQuestionAnswer {
  question_key: SecurityQuestionKey;
  answer: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'developer';
  created_at: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string;
  state: string;
  district: string;
  category: string;
  gender: string;
  education_level: string;
  course: string;
  institution_name: string;
  institution_type: string;
  academic_year: string;
  previous_percentage: number | null;
  annual_family_income: number | null;
  disability_status: string;
  minority_status: string;
  first_generation: boolean;
  hosteller_or_dayscholar: string;
  profile_pic_url: string;
  updated_at: string;
}

export interface RuleCheckResult {
  condition: string;
  official_rule: string;
  student_value: string;
  status: RuleCheckStatus;
  reason: string;
}

export interface ApplicationStep {
  step_number: number;
  title: string;
  description: string;
  completed: boolean;
  requires_portal_action: boolean;
}

export interface DocumentChecklistItem {
  name: string;
  purpose: string;
  mandatory: boolean;
  ready: boolean;
}

export interface OfficialSource {
  id: string;
  scholarship_id: string;
  source_title: string;
  source_url: string;
  domain_authority: string;
  excerpt: string;
  http_reachable: number | null;
  retrieved_at: string;
}

export interface EnrichedScholarship {
  id: string;
  task_id: string;
  official_name: string;
  provider_ministry: string;
  portal_name: string;
  scheme_type: string;
  description: string;
  benefits_summary: string;
  benefit_amount_inr: string;
  opening_date: string;
  application_deadline: string;
  academic_year: string;
  official_portal_url: string;
  source_url: string;
  verification_status: 'Verified' | 'Partial' | 'Unverified';
  outdated_flag: boolean;
  outdated_reason: string;
  last_verified_at: string;
  is_test_data: boolean;
  created_at: string;
  is_saved: boolean;
  criteria: {
    min_education_level: string;
    allowed_states: string[];
    allowed_categories: string[];
    max_family_income_inr: number | null;
    income_limit_note: string;
    min_percentage: number | null;
    allowed_courses: string[];
    gender_requirement: string;
    disability_requirement: string;
    minority_requirement: string;
    institution_requirement: string;
    other_conditions: string[];
    required_documents: string[];
    rules_verified: boolean;
  };
  eligibility_report: {
    id: string;
    outcome: EligibilityOutcome;
    rule_checks: RuleCheckResult[];
    missing_fields: string[];
    explanation_summary: string;
    evidence_urls: string[];
    evaluated_at: string;
  } | null;
  application_plan: {
    id: string;
    steps: ApplicationStep[];
    document_checklist: DocumentChecklistItem[];
    deadline_date: string;
    human_approved_portal_open: boolean;
    approved_at: string | null;
    application_stage: ApplicationStage;
    application_number: string;
    notes: string;
  } | null;
  sources: OfficialSource[];
}

export interface ResearchTask {
  id: string;
  user_id: string;
  query_text: string;
  state_filter: string;
  category_filter: string;
  education_filter: string;
  mode: 'live_research' | 'developer_test';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  current_stage: string;
  agent1_status: 'IDLE' | 'SEARCHING' | 'VERIFYING' | 'DONE' | 'FAILED';
  agent2_status: 'IDLE' | 'WAITING' | 'EVALUATING' | 'PLANNING' | 'DONE' | 'FAILED';
  error_message: string | null;
  retry_count: number;
  language?: 'en' | 'kn' | 'hi';
  custom_prompt?: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface AgentMessage {
  id: string;
  task_id: string;
  sender_agent: string;
  receiver_agent: string;
  message_type: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
}

export interface DashboardSummary {
  total_discovered_schemes: number;
  likely_eligible_count: number;
  needs_info_count: number;
  not_eligible_count: number;
  saved_schemes_count: number;
  research_runs_count: number;
  active_tasks_count: number;
  stages: Array<{ application_stage: string; cnt: number }>;
}

export interface SystemStatus {
  gemini_configured: boolean;
  gemini_model?: string;
  gemini_key_hint?: string | null;
  quota_status?: 'OK' | 'COOLDOWN' | 'EXHAUSTED' | 'AUTH_ERROR';
  quota_cooldown_until?: string | null;
  last_quota_error?: string | null;
  database_engine: string;
  python_stack_available: boolean;
  agent_count: number;
  agents: Array<{ id: string; name: string }>;
}
