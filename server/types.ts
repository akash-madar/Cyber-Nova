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

export type VerificationStatus = 'Verified' | 'Partial' | 'Unverified';

export interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
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

export interface EligibilityCriterion {
  id: string;
  scholarship_id: string;
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
}

export interface OfficialSource {
  id: string;
  scholarship_id: string;
  source_title: string;
  source_url: string;
  domain_authority: string;
  excerpt: string;
  http_reachable: boolean | null;
  retrieved_at: string;
}

export interface ScholarshipRecord {
  id: string;
  task_id: string;
  official_name: string;
  provider_ministry: string;
  portal_name: string;
  scheme_type: 'Central' | 'State' | 'AICTE/UGC' | 'Other';
  description: string;
  benefits_summary: string;
  benefit_amount_inr: string;
  opening_date: string;
  application_deadline: string;
  academic_year: string;
  official_portal_url: string;
  source_url: string;
  verification_status: VerificationStatus;
  outdated_flag: boolean;
  outdated_reason: string;
  last_verified_at: string;
  is_test_data: boolean;
  created_at: string;
}

export interface RuleCheckResult {
  condition: string;
  official_rule: string;
  student_value: string;
  status: RuleCheckStatus;
  reason: string;
}

export interface EligibilityReport {
  id: string;
  task_id: string;
  user_id: string;
  scholarship_id: string;
  outcome: EligibilityOutcome;
  rule_checks: RuleCheckResult[];
  missing_fields: string[];
  explanation_summary: string;
  evidence_urls: string[];
  evaluated_at: string;
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

export interface ApplicationPlan {
  id: string;
  user_id: string;
  scholarship_id: string;
  eligibility_report_id: string;
  steps: ApplicationStep[];
  document_checklist: DocumentChecklistItem[];
  deadline_date: string;
  human_approved_portal_open: boolean;
  approved_at: string | null;
  application_stage: ApplicationStage;
  application_number: string;
  notes: string;
  updated_at: string;
}

export interface ResearchTask {
  id: string;
  user_id: string;
  query_text: string;
  state_filter: string;
  category_filter: string;
  education_filter: string;
  mode: 'live_research' | 'developer_test';
  language?: 'en' | 'kn' | 'hi';
  custom_prompt?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  current_stage: string;
  agent1_status: 'IDLE' | 'SEARCHING' | 'VERIFYING' | 'DONE' | 'FAILED';
  agent2_status: 'IDLE' | 'WAITING' | 'EVALUATING' | 'PLANNING' | 'DONE' | 'FAILED';
  error_message: string | null;
  retry_count: number;
  started_at: string;
  completed_at: string | null;
}

export interface AgentMessage {
  id: string;
  task_id: string;
  sender_agent: 'ORCHESTRATOR' | 'AGENT_1_RESEARCH' | 'AGENT_2_ELIGIBILITY';
  receiver_agent: 'AGENT_1_RESEARCH' | 'AGENT_2_ELIGIBILITY' | 'ORCHESTRATOR';
  message_type: string;
  payload: Record<string, unknown>;
  status: 'SENT' | 'DELIVERED' | 'PROCESSED' | 'ERROR';
  created_at: string;
}

export interface ResearchedSchemeBundleItem {
  scholarship: Omit<ScholarshipRecord, 'id' | 'task_id' | 'created_at'>;
  criteria: Omit<EligibilityCriterion, 'id' | 'scholarship_id'>;
  sources: Array<{
    source_title: string;
    source_url: string;
    domain_authority: string;
    excerpt: string;
    http_reachable: boolean | null;
  }>;
}

export interface A2AResearchBundle {
  message_id: string;
  task_id: string;
  protocol_version: 'a2a.scholarai.v1';
  timestamp: string;
  sender: 'AGENT_1_RESEARCH';
  receiver: 'AGENT_2_ELIGIBILITY';
  mode: 'live_research' | 'developer_test';
  search_queries_executed: string[];
  grounding_urls_discovered: Array<{ title: string; url: string }>;
  schemes: ResearchedSchemeBundleItem[];
  warnings: string[];
  cache_hit?: boolean;
  cached_at?: string;
}
