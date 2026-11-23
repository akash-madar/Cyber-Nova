import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dbPath = process.env.DB_PATH?.trim() || path.resolve(process.cwd(), 'data', 'scholarai.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  reset_failed_attempts INTEGER NOT NULL DEFAULT 0,
  reset_locked_until TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS password_reset_codes;

CREATE TABLE IF NOT EXISTS user_security_questions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slot_index INTEGER NOT NULL,
  question_key TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, slot_index),
  UNIQUE(user_id, question_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sec_q_user ON user_security_questions(user_id, slot_index);

CREATE TABLE IF NOT EXISTS student_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  education_level TEXT NOT NULL DEFAULT '',
  course TEXT NOT NULL DEFAULT '',
  institution_name TEXT NOT NULL DEFAULT '',
  institution_type TEXT NOT NULL DEFAULT '',
  academic_year TEXT NOT NULL DEFAULT '2026-27',
  previous_percentage REAL,
  annual_family_income REAL,
  disability_status TEXT NOT NULL DEFAULT 'None',
  minority_status TEXT NOT NULL DEFAULT 'None',
  first_generation INTEGER NOT NULL DEFAULT 0,
  hosteller_or_dayscholar TEXT NOT NULL DEFAULT '',
  profile_pic_url TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS research_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  query_text TEXT NOT NULL,
  state_filter TEXT NOT NULL DEFAULT '',
  category_filter TEXT NOT NULL DEFAULT '',
  education_filter TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'live_research',
  language TEXT NOT NULL DEFAULT 'en',
  custom_prompt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING',
  current_stage TEXT NOT NULL DEFAULT 'Queued',
  agent1_status TEXT NOT NULL DEFAULT 'IDLE',
  agent2_status TEXT NOT NULL DEFAULT 'IDLE',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS research_cache (
  cache_key TEXT PRIMARY KEY,
  query_signature TEXT NOT NULL,
  bundle_json TEXT NOT NULL,
  scheme_count INTEGER NOT NULL,
  verified_sources_count INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_research_cache_expires ON research_cache(expires_at);

CREATE TABLE IF NOT EXISTS scholarships (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  official_name TEXT NOT NULL,
  provider_ministry TEXT NOT NULL,
  portal_name TEXT NOT NULL,
  scheme_type TEXT NOT NULL DEFAULT 'Central',
  description TEXT NOT NULL,
  benefits_summary TEXT NOT NULL,
  benefit_amount_inr TEXT NOT NULL,
  opening_date TEXT NOT NULL,
  application_deadline TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  official_portal_url TEXT NOT NULL,
  source_url TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'Partial',
  outdated_flag INTEGER NOT NULL DEFAULT 0,
  outdated_reason TEXT NOT NULL DEFAULT '',
  last_verified_at TEXT NOT NULL,
  is_test_data INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES research_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS eligibility_criteria (
  id TEXT PRIMARY KEY,
  scholarship_id TEXT NOT NULL UNIQUE,
  min_education_level TEXT NOT NULL,
  allowed_states_json TEXT NOT NULL,
  allowed_categories_json TEXT NOT NULL,
  max_family_income_inr REAL,
  income_limit_note TEXT NOT NULL DEFAULT '',
  min_percentage REAL,
  allowed_courses_json TEXT NOT NULL,
  gender_requirement TEXT NOT NULL DEFAULT 'All',
  disability_requirement TEXT NOT NULL DEFAULT 'Any',
  minority_requirement TEXT NOT NULL DEFAULT 'Any',
  institution_requirement TEXT NOT NULL DEFAULT 'Recognized Institution',
  other_conditions_json TEXT NOT NULL,
  required_documents_json TEXT NOT NULL,
  rules_verified INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS official_sources (
  id TEXT PRIMARY KEY,
  scholarship_id TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  domain_authority TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  http_reachable INTEGER,
  retrieved_at TEXT NOT NULL,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  sender_agent TEXT NOT NULL,
  receiver_agent TEXT NOT NULL,
  message_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SENT',
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES research_tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS eligibility_reports (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  scholarship_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  rule_checks_json TEXT NOT NULL,
  missing_fields_json TEXT NOT NULL,
  explanation_summary TEXT NOT NULL,
  evidence_urls_json TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES research_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS application_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  scholarship_id TEXT NOT NULL,
  eligibility_report_id TEXT NOT NULL,
  steps_json TEXT NOT NULL,
  document_checklist_json TEXT NOT NULL,
  deadline_date TEXT NOT NULL,
  human_approved_portal_open INTEGER NOT NULL DEFAULT 0,
  approved_at TEXT,
  application_stage TEXT NOT NULL DEFAULT 'Plan Ready (Not Submitted)',
  application_number TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE,
  FOREIGN KEY (eligibility_report_id) REFERENCES eligibility_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_schemes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  scholarship_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, scholarship_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);
`);

function ensureColumn(tableName: string, columnName: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
  }
}

ensureColumn('users', 'reset_failed_attempts', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('users', 'reset_locked_until', 'TEXT');
ensureColumn('student_profiles', 'profile_pic_url', "TEXT NOT NULL DEFAULT ''");
ensureColumn('application_plans', 'application_number', "TEXT NOT NULL DEFAULT ''");
ensureColumn('research_tasks', 'language', "TEXT NOT NULL DEFAULT 'en'");
ensureColumn('research_tasks', 'custom_prompt', "TEXT NOT NULL DEFAULT ''");
