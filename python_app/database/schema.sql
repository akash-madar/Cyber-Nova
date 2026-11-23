CREATE DATABASE IF NOT EXISTS scholarai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE scholarai_db;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'student',
  reset_failed_attempts INT NOT NULL DEFAULT 0,
  reset_locked_until DATETIME NULL,
  password_changed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS password_reset_codes;

CREATE TABLE IF NOT EXISTS user_security_questions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  slot_index INT NOT NULL,
  question_key VARCHAR(64) NOT NULL,
  answer_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sec_q_slot (user_id, slot_index),
  UNIQUE KEY uq_sec_q_key (user_id, question_key),
  INDEX idx_sec_q_user (user_id, slot_index),
  CONSTRAINT fk_sec_q_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  state VARCHAR(120) NOT NULL DEFAULT '',
  district VARCHAR(120) NOT NULL DEFAULT '',
  category VARCHAR(64) NOT NULL DEFAULT '',
  gender VARCHAR(32) NOT NULL DEFAULT '',
  education_level VARCHAR(120) NOT NULL DEFAULT '',
  course VARCHAR(180) NOT NULL DEFAULT '',
  institution_name VARCHAR(255) NOT NULL DEFAULT '',
  institution_type VARCHAR(120) NOT NULL DEFAULT '',
  academic_year VARCHAR(32) NOT NULL DEFAULT '2026-27',
  previous_percentage DECIMAL(5,2) NULL,
  annual_family_income DECIMAL(14,2) NULL,
  disability_status VARCHAR(120) NOT NULL DEFAULT 'None',
  minority_status VARCHAR(64) NOT NULL DEFAULT 'None',
  first_generation BOOLEAN NOT NULL DEFAULT FALSE,
  hosteller_or_dayscholar VARCHAR(32) NOT NULL DEFAULT '',
  profile_pic_url MEDIUMTEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS research_tasks (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  query_text TEXT NOT NULL,
  state_filter VARCHAR(120) NOT NULL DEFAULT '',
  category_filter VARCHAR(64) NOT NULL DEFAULT '',
  education_filter VARCHAR(120) NOT NULL DEFAULT '',
  mode VARCHAR(32) NOT NULL DEFAULT 'live_research',
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  current_stage VARCHAR(255) NOT NULL DEFAULT 'Queued',
  agent1_status VARCHAR(32) NOT NULL DEFAULT 'IDLE',
  agent2_status VARCHAR(32) NOT NULL DEFAULT 'IDLE',
  error_message TEXT NULL,
  retry_count INT NOT NULL DEFAULT 0,
  language VARCHAR(8) NOT NULL DEFAULT 'en',
  custom_prompt TEXT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CONSTRAINT fk_task_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS research_cache (
  cache_key VARCHAR(64) PRIMARY KEY,
  query_summary VARCHAR(500) NOT NULL,
  bundle_json JSON NOT NULL,
  scheme_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  INDEX idx_research_cache_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS scholarships (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  official_name VARCHAR(500) NOT NULL,
  provider_ministry VARCHAR(255) NOT NULL,
  portal_name VARCHAR(255) NOT NULL,
  scheme_type VARCHAR(64) NOT NULL DEFAULT 'Central',
  description TEXT NOT NULL,
  benefits_summary TEXT NOT NULL,
  benefit_amount_inr VARCHAR(255) NOT NULL,
  opening_date VARCHAR(120) NOT NULL,
  application_deadline VARCHAR(120) NOT NULL,
  academic_year VARCHAR(64) NOT NULL,
  official_portal_url TEXT NOT NULL,
  source_url TEXT NOT NULL,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'Partial',
  outdated_flag BOOLEAN NOT NULL DEFAULT FALSE,
  outdated_reason TEXT NOT NULL,
  last_verified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sch_task FOREIGN KEY (task_id) REFERENCES research_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_sch_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS eligibility_criteria (
  id VARCHAR(36) PRIMARY KEY,
  scholarship_id VARCHAR(36) NOT NULL UNIQUE,
  min_education_level VARCHAR(120) NOT NULL,
  allowed_states_json JSON NOT NULL,
  allowed_categories_json JSON NOT NULL,
  max_family_income_inr DECIMAL(14,2) NULL,
  income_limit_note VARCHAR(255) NOT NULL DEFAULT '',
  min_percentage DECIMAL(5,2) NULL,
  allowed_courses_json JSON NOT NULL,
  gender_requirement VARCHAR(64) NOT NULL DEFAULT 'All',
  disability_requirement VARCHAR(64) NOT NULL DEFAULT 'Any',
  minority_requirement VARCHAR(64) NOT NULL DEFAULT 'Any',
  institution_requirement VARCHAR(255) NOT NULL DEFAULT 'Recognized Institution',
  other_conditions_json JSON NOT NULL,
  required_documents_json JSON NOT NULL,
  rules_verified BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_crit_sch FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS official_sources (
  id VARCHAR(36) PRIMARY KEY,
  scholarship_id VARCHAR(36) NOT NULL,
  source_title VARCHAR(500) NOT NULL,
  source_url TEXT NOT NULL,
  domain_authority VARCHAR(160) NOT NULL,
  excerpt TEXT NOT NULL,
  http_reachable BOOLEAN NULL,
  retrieved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_src_sch FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  sender_agent VARCHAR(64) NOT NULL,
  receiver_agent VARCHAR(64) NOT NULL,
  message_type VARCHAR(120) NOT NULL,
  payload_json JSON NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'SENT',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_task FOREIGN KEY (task_id) REFERENCES research_tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS eligibility_reports (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  scholarship_id VARCHAR(36) NOT NULL,
  outcome VARCHAR(64) NOT NULL,
  rule_checks_json JSON NOT NULL,
  missing_fields_json JSON NOT NULL,
  explanation_summary TEXT NOT NULL,
  evidence_urls_json JSON NOT NULL,
  evaluated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rep_task FOREIGN KEY (task_id) REFERENCES research_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_rep_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rep_sch FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS application_plans (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  scholarship_id VARCHAR(36) NOT NULL,
  eligibility_report_id VARCHAR(36) NOT NULL,
  steps_json JSON NOT NULL,
  document_checklist_json JSON NOT NULL,
  deadline_date VARCHAR(120) NOT NULL,
  human_approved_portal_open BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at DATETIME NULL,
  application_stage VARCHAR(64) NOT NULL DEFAULT 'Plan Ready (Not Submitted)',
  application_number VARCHAR(120) NOT NULL DEFAULT '',
  notes TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_plan_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_sch FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_rep FOREIGN KEY (eligibility_report_id) REFERENCES eligibility_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_schemes (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  scholarship_id VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_sch (user_id, scholarship_id),
  CONSTRAINT fk_save_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_save_sch FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);
