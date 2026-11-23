import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import {
  ALLOWED_SECURITY_QUESTION_KEYS,
  type AuthenticatedRequest,
  type SecurityQuestionKey,
  createSession,
  hashPassword,
  normalizeSecurityAnswer,
  requireAuth,
  revokeAllUserSessions,
  revokeSession,
  verifyPassword,
} from './server/auth.ts';
import { db } from './server/db.ts';
import { GEMINI_MODEL, getGeminiKeyHint, isGeminiConfigured } from './server/gemini.ts';
import { getQuotaStatusSnapshot } from './server/geminiResilience.ts';
import {
  launchTwoAgentResearchTask,
  recoverInterruptedTasks,
  retryTwoAgentResearchTask,
} from './server/agents/orchestrator.ts';
import { evaluateEligibilityDeterministic } from './server/agents/ruleEngine.ts';
import type {
  ApplicationPlan,
  ApplicationStage,
  ApplicationStep,
  DocumentChecklistItem,
  EligibilityCriterion,
  ScholarshipRecord,
  StudentProfile,
} from './server/types.ts';

dotenv.config();

const app = express();
app.use(express.json({ limit: '2mb' }));

function isValidProfilePicUrl(value: string): boolean {
  if (!value) return true;
  if (value.length > 750_000) return false;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && value.length <= 500;
  } catch {
    return false;
  }
}

function getOrCreateProfile(userId: string, defaultName = ''): StudentProfile {
  const existing = db
    .prepare('SELECT * FROM student_profiles WHERE user_id = ?')
    .get(userId) as Record<string, unknown> | undefined;

  if (existing) {
    return {
      id: String(existing.id),
      user_id: String(existing.user_id),
      full_name: String(existing.full_name || ''),
      state: String(existing.state || ''),
      district: String(existing.district || ''),
      category: String(existing.category || ''),
      gender: String(existing.gender || ''),
      education_level: String(existing.education_level || ''),
      course: String(existing.course || ''),
      institution_name: String(existing.institution_name || ''),
      institution_type: String(existing.institution_type || ''),
      academic_year: String(existing.academic_year || '2026-27'),
      previous_percentage:
        typeof existing.previous_percentage === 'number' ? existing.previous_percentage : null,
      annual_family_income:
        typeof existing.annual_family_income === 'number' ? existing.annual_family_income : null,
      disability_status: String(existing.disability_status || 'None'),
      minority_status: String(existing.minority_status || 'None'),
      first_generation: Boolean(existing.first_generation),
      hosteller_or_dayscholar: String(existing.hosteller_or_dayscholar || ''),
      profile_pic_url: String(existing.profile_pic_url || ''),
      updated_at: String(existing.updated_at),
    };
  }

  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  db.prepare(
    `INSERT INTO student_profiles (id, user_id, full_name, updated_at) VALUES (?, ?, ?, ?)`
  ).run(id, userId, defaultName, nowIso);
  return getOrCreateProfile(userId, defaultName);
}

// Recover any tasks interrupted by an earlier server stop/restart
recoverInterruptedTasks();

// ---------- System Status ----------
app.get('/api/system/status', (_req, res) => {
  const quota = getQuotaStatusSnapshot();
  res.json({
    gemini_configured: isGeminiConfigured(),
    gemini_model: GEMINI_MODEL,
    gemini_key_hint: getGeminiKeyHint(),
    quota_status: quota.quota_status,
    quota_cooldown_until: quota.quota_cooldown_until,
    last_quota_error: quota.last_quota_error,
    database_engine: 'SQLite (Local Preview Mirror of MySQL Schema)',
    python_stack_available: true,
    agent_count: 2,
    agents: [
      { id: 'AGENT_1_RESEARCH', name: 'Research Agent (Live Search Grounding)' },
      { id: 'AGENT_2_ELIGIBILITY', name: 'Eligibility & Application Planning Agent' },
    ],
  });
});

const resetRateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkResetRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = resetRateBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    resetRateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

const ALLOWED_QUESTION_SET = new Set<string>(ALLOWED_SECURITY_QUESTION_KEYS);

function parseSubmittedSecurityQuestions(
  raw: unknown
): { ok: true; items: Array<{ question_key: SecurityQuestionKey; normalized_answer: string }> } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length !== 3) {
    return { ok: false, error: 'Please answer all 3 personal security questions before registering.' };
  }
  const seenKeys = new Set<string>();
  const parsed: Array<{ question_key: SecurityQuestionKey; normalized_answer: string }> = [];

  for (const entry of raw) {
    const key = typeof entry?.question_key === 'string' ? entry.question_key.trim() : '';
    const answerRaw = typeof entry?.answer === 'string' ? entry.answer : '';
    if (!ALLOWED_QUESTION_SET.has(key)) {
      return { ok: false, error: 'One or more selected security questions are invalid.' };
    }
    if (seenKeys.has(key)) {
      return { ok: false, error: 'Please choose 3 different personal security questions.' };
    }
    const normalized = normalizeSecurityAnswer(answerRaw);
    if (normalized.length < 2 || normalized.length > 150) {
      return { ok: false, error: 'Each security question answer must be between 2 and 150 characters.' };
    }
    seenKeys.add(key);
    parsed.push({ question_key: key as SecurityQuestionKey, normalized_answer: normalized });
  }

  return { ok: true, items: parsed };
}

// ---------- Authentication ----------
app.post('/api/auth/register', (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const fullName = typeof req.body?.full_name === 'string' ? req.body.full_name.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }
  if (!fullName || fullName.length < 2) {
    res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }

  const securityCheck = parseSubmittedSecurityQuestions(req.body?.security_questions);
  if (!securityCheck.ok) {
    res.status(400).json({ error: securityCheck.error });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const passwordHash = hashPassword(password);
  const hashedQuestions = securityCheck.items.map((item, idx) => ({
    id: crypto.randomUUID(),
    slotIndex: idx + 1,
    questionKey: item.question_key,
    answerHash: hashPassword(item.normalized_answer),
  }));

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      'INSERT INTO users (id, email, full_name, password_hash, role, reset_failed_attempts, reset_locked_until, created_at) VALUES (?, ?, ?, ?, ?, 0, NULL, ?)'
    ).run(userId, email, fullName, passwordHash, 'student', nowIso);

    const insertQuestion = db.prepare(
      'INSERT INTO user_security_questions (id, user_id, slot_index, question_key, answer_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const q of hashedQuestions) {
      insertQuestion.run(q.id, userId, q.slotIndex, q.questionKey, q.answerHash, nowIso);
    }

    db.prepare(
      'INSERT INTO student_profiles (id, user_id, full_name, updated_at) VALUES (?, ?, ?, ?)'
    ).run(profileId, userId, fullName, nowIso);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Registration transaction failed:', err);
    res.status(500).json({ error: 'Unable to complete registration. Please try again.' });
    return;
  }

  const token = createSession(userId);

  res.status(201).json({
    token,
    user: {
      id: userId,
      email,
      full_name: fullName,
      role: 'student',
      created_at: nowIso,
    },
  });
});

app.post('/api/auth/login', (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db
    .prepare('SELECT id, email, full_name, password_hash, role, created_at FROM users WHERE email = ?')
    .get(email) as
    | {
        id: string;
        email: string;
        full_name: string;
        password_hash: string;
        role: 'student' | 'developer';
        created_at: string;
      }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = createSession(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at,
    },
  });
});

app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (token) revokeSession(token);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/forgot-password/questions', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkResetRateLimit(`forgot_q:${ip}`, 15, 15 * 60 * 1000)) {
    res.status(429).json({ error: 'Too many password recovery lookups. Please wait a few minutes.' });
    return;
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please enter a valid registered email address.' });
    return;
  }

  const user = db
    .prepare('SELECT id, reset_locked_until FROM users WHERE email = ?')
    .get(email) as { id: string; reset_locked_until: string | null } | undefined;

  if (!user) {
    res.status(404).json({ error: 'No account found with that email address.' });
    return;
  }

  if (user.reset_locked_until && new Date(user.reset_locked_until).getTime() > Date.now()) {
    res.status(429).json({
      error: 'Too many incorrect security answers. Password reset is temporarily locked for 15 minutes.',
    });
    return;
  }

  const questions = db
    .prepare(
      `SELECT slot_index, question_key
       FROM user_security_questions
       WHERE user_id = ?
       ORDER BY slot_index ASC`
    )
    .all(user.id) as Array<{ slot_index: number; question_key: SecurityQuestionKey }>;

  if (questions.length !== 3) {
    res.status(400).json({
      error: 'This account does not have personal security questions configured.',
    });
    return;
  }

  res.json({ questions });
});

app.post('/api/auth/reset-password', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkResetRateLimit(`reset:${ip}`, 15, 15 * 60 * 1000)) {
    res.status(429).json({ error: 'Too many password reset attempts. Please try again later.' });
    return;
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const newPassword = typeof req.body?.new_password === 'string' ? req.body.new_password : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please enter a valid registered email address.' });
    return;
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    res.status(400).json({ error: 'New password must be between 8 and 128 characters long.' });
    return;
  }

  const submittedCheck = parseSubmittedSecurityQuestions(req.body?.answers);
  if (!submittedCheck.ok) {
    res.status(400).json({ error: 'Please answer all 3 personal security questions.' });
    return;
  }

  const user = db
    .prepare('SELECT id, reset_failed_attempts, reset_locked_until FROM users WHERE email = ?')
    .get(email) as
    | { id: string; reset_failed_attempts: number; reset_locked_until: string | null }
    | undefined;

  if (!user) {
    res.status(400).json({ error: 'One or more security question answers are incorrect.' });
    return;
  }

  if (user.reset_locked_until && new Date(user.reset_locked_until).getTime() > Date.now()) {
    res.status(429).json({
      error: 'Too many incorrect security answers. Password reset is temporarily locked for 15 minutes.',
    });
    return;
  }

  const storedRows = db
    .prepare(
      `SELECT question_key, answer_hash
       FROM user_security_questions
       WHERE user_id = ?
       ORDER BY slot_index ASC`
    )
    .all(user.id) as Array<{ question_key: string; answer_hash: string }>;

  if (storedRows.length !== 3) {
    res.status(400).json({ error: 'Security questions are not configured for this account.' });
    return;
  }

  const answerMap = new Map(
    submittedCheck.items.map((item) => [item.question_key, item.normalized_answer])
  );

  // Verify all 3 answers without early short-circuiting so verification stays uniform.
  let allMatch = true;
  for (const row of storedRows) {
    const provided = answerMap.get(row.question_key as SecurityQuestionKey);
    if (!provided || !verifyPassword(provided, row.answer_hash)) {
      allMatch = false;
    }
  }

  if (!allMatch) {
    const priorFailures =
      user.reset_locked_until && new Date(user.reset_locked_until).getTime() <= Date.now()
        ? 0
        : Number(user.reset_failed_attempts || 0);
    const nextFailures = priorFailures + 1;
    const lockedUntil =
      nextFailures >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    db.prepare(
      'UPDATE users SET reset_failed_attempts = ?, reset_locked_until = ? WHERE id = ?'
    ).run(nextFailures, lockedUntil, user.id);

    res.status(400).json({
      error:
        nextFailures >= 5
          ? 'Too many incorrect security answers. Password reset is temporarily locked for 15 minutes.'
          : 'One or more security question answers are incorrect.',
    });
    return;
  }

  const newHash = hashPassword(newPassword);

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      'UPDATE users SET password_hash = ?, reset_failed_attempts = 0, reset_locked_until = NULL WHERE id = ?'
    ).run(newHash, user.id);
    revokeAllUserSessions(user.id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Password reset commit error:', err);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
    return;
  }

  res.json({
    ok: true,
    message: 'Your password has been updated. Please sign in with your new password.',
  });
});

// ---------- Student Profile ----------
app.get('/api/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const profile = getOrCreateProfile(req.user!.id, req.user!.full_name);
  res.json({ profile });
});

app.put('/api/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  getOrCreateProfile(userId, req.user!.full_name);

  const b = req.body ?? {};
  const previousPercentage =
    b.previous_percentage === '' || b.previous_percentage === null || b.previous_percentage === undefined
      ? null
      : Number(b.previous_percentage);
  const annualIncome =
    b.annual_family_income === '' || b.annual_family_income === null || b.annual_family_income === undefined
      ? null
      : Number(b.annual_family_income);

  if (previousPercentage !== null && (Number.isNaN(previousPercentage) || previousPercentage < 0 || previousPercentage > 100)) {
    res.status(400).json({ error: 'Previous percentage must be between 0 and 100.' });
    return;
  }
  if (annualIncome !== null && (Number.isNaN(annualIncome) || annualIncome < 0)) {
    res.status(400).json({ error: 'Annual family income must be a non-negative number in INR.' });
    return;
  }

  const profilePicUrl =
    typeof b.profile_pic_url === 'string'
      ? b.profile_pic_url.trim()
      : getOrCreateProfile(userId).profile_pic_url;

  if (!isValidProfilePicUrl(profilePicUrl)) {
    res.status(400).json({
      error: 'Profile picture must be a valid PNG/JPEG/WEBP/GIF image (max 500 KB) or HTTPS URL.',
    });
    return;
  }

  const nowIso = new Date().toISOString();
  db.prepare(
    `UPDATE student_profiles SET
      full_name = ?, state = ?, district = ?, category = ?, gender = ?,
      education_level = ?, course = ?, institution_name = ?, institution_type = ?,
      academic_year = ?, previous_percentage = ?, annual_family_income = ?,
      disability_status = ?, minority_status = ?, first_generation = ?,
      hosteller_or_dayscholar = ?, profile_pic_url = ?, updated_at = ?
     WHERE user_id = ?`
  ).run(
    String(b.full_name ?? req.user!.full_name).trim(),
    String(b.state ?? '').trim(),
    String(b.district ?? '').trim(),
    String(b.category ?? '').trim(),
    String(b.gender ?? '').trim(),
    String(b.education_level ?? '').trim(),
    String(b.course ?? '').trim(),
    String(b.institution_name ?? '').trim(),
    String(b.institution_type ?? '').trim(),
    String(b.academic_year ?? '2026-27').trim(),
    previousPercentage,
    annualIncome,
    String(b.disability_status ?? 'None').trim(),
    String(b.minority_status ?? 'None').trim(),
    b.first_generation ? 1 : 0,
    String(b.hosteller_or_dayscholar ?? '').trim(),
    profilePicUrl,
    nowIso,
    userId
  );

  const updated = getOrCreateProfile(userId);
  res.json({ profile: updated });
});

// ---------- Agent 1 + Agent 2 Research Orchestration ----------
function checkUserActiveTaskOrCooldown(userId: string): { status: number; error: string } | null {
  const activeTask = db
    .prepare(
      "SELECT id FROM research_tasks WHERE user_id = ? AND status IN ('PENDING', 'RUNNING') LIMIT 1"
    )
    .get(userId) as { id: string } | undefined;

  if (activeTask) {
    return {
      status: 409,
      error: `A two-agent research task (${activeTask.id.slice(0, 8)}) is already running. Please wait for it to finish or inspect it in Agent Activity.`,
    };
  }

  const quota = getQuotaStatusSnapshot();
  if (quota.quota_status !== 'OK' && quota.quota_cooldown_until) {
    const waitSec = Math.max(
      1,
      Math.ceil((new Date(quota.quota_cooldown_until).getTime() - Date.now()) / 1000)
    );
    return {
      status: 429,
      error:
        quota.last_quota_error ||
        `Gemini API quota cooldown active on model "${GEMINI_MODEL}". Wait ${waitSec}s before retrying or configure a billing-enabled GEMINI_API_KEY in Settings > Secrets.`,
    };
  }
  return null;
}

app.post('/api/research/start', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!isGeminiConfigured()) {
    res.status(503).json({
      error:
        'GEMINI_API_KEY is not configured. Please add a valid billing-enabled Gemini API key in Settings > Secrets so Agent 1 can execute live official portal research.',
    });
    return;
  }

  const guard = checkUserActiveTaskOrCooldown(req.user!.id);
  if (guard) {
    res.status(guard.status).json({ error: guard.error });
    return;
  }

  const queryText = typeof req.body?.query_text === 'string' ? req.body.query_text.trim() : '';
  const stateFilter = typeof req.body?.state_filter === 'string' ? req.body.state_filter.trim() : '';
  const categoryFilter = typeof req.body?.category_filter === 'string' ? req.body.category_filter.trim() : '';
  const educationFilter = typeof req.body?.education_filter === 'string' ? req.body.education_filter.trim() : '';
  const forceRefresh = req.body?.force_refresh === true;
  const rawLang = req.body?.language;
  const language: 'en' | 'kn' | 'hi' = rawLang === 'kn' || rawLang === 'hi' ? rawLang : 'en';

  if (!queryText && !stateFilter && !educationFilter) {
    res.status(400).json({ error: 'Provide a search topic or select at least one filter.' });
    return;
  }

  const profile = getOrCreateProfile(req.user!.id, req.user!.full_name);
  const taskId = launchTwoAgentResearchTask({
    userId: req.user!.id,
    queryText: queryText || 'Active central and state government scholarships',
    stateFilter,
    categoryFilter,
    educationFilter,
    profile,
    mode: 'live_research',
    language,
    forceRefresh,
  });

  res.status(202).json({ task_id: taskId, status: 'PENDING' });
});

app.post('/api/research/developer-test', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!isGeminiConfigured()) {
    res.status(503).json({
      error:
        'GEMINI_API_KEY is not configured. Developer Mode also invokes real Gemini Agent 1 and Agent 2 reasoning.',
    });
    return;
  }

  const guard = checkUserActiveTaskOrCooldown(req.user!.id);
  if (guard) {
    res.status(guard.status).json({ error: guard.error });
    return;
  }

  const scenarioName =
    typeof req.body?.scenario_name === 'string' ? req.body.scenario_name.trim() : 'Custom Developer Scenario';
  const customPrompt = typeof req.body?.custom_prompt === 'string' ? req.body.custom_prompt.trim() : '';
  const overrideProfile = req.body?.test_profile ?? {};
  const forceRefresh = req.body?.force_refresh === true;

  const baseProfile = getOrCreateProfile(req.user!.id, req.user!.full_name);
  const mergedProfile: StudentProfile = {
    ...baseProfile,
    state: typeof overrideProfile.state === 'string' ? overrideProfile.state : baseProfile.state,
    category: typeof overrideProfile.category === 'string' ? overrideProfile.category : baseProfile.category,
    education_level:
      typeof overrideProfile.education_level === 'string'
        ? overrideProfile.education_level
        : baseProfile.education_level,
    course: typeof overrideProfile.course === 'string' ? overrideProfile.course : baseProfile.course,
    annual_family_income:
      overrideProfile.annual_family_income !== undefined && overrideProfile.annual_family_income !== ''
        ? Number(overrideProfile.annual_family_income)
        : baseProfile.annual_family_income,
    previous_percentage:
      overrideProfile.previous_percentage !== undefined && overrideProfile.previous_percentage !== ''
        ? Number(overrideProfile.previous_percentage)
        : baseProfile.previous_percentage,
    gender: typeof overrideProfile.gender === 'string' ? overrideProfile.gender : baseProfile.gender,
  };

  const rawLang = req.body?.language;
  const language: 'en' | 'kn' | 'hi' = rawLang === 'kn' || rawLang === 'hi' ? rawLang : 'en';

  const taskId = launchTwoAgentResearchTask({
    userId: req.user!.id,
    queryText: `[DEV SANDBOX] ${scenarioName}`,
    stateFilter: mergedProfile.state,
    categoryFilter: mergedProfile.category,
    educationFilter: mergedProfile.education_level,
    profile: mergedProfile,
    mode: 'developer_test',
    language,
    forceRefresh,
    developerTestPayload: {
      scenarioName,
      customPrompt:
        customPrompt ||
        `Research official government scholarships for ${mergedProfile.education_level || 'Undergraduate'} ${mergedProfile.category || 'OBC'} student in ${mergedProfile.state || 'Karnataka'} studying ${mergedProfile.course || 'Engineering'}.`,
    },
  });

  res.status(202).json({ task_id: taskId, status: 'PENDING', mode: 'developer_test' });
});

// ---------- Tasks & A2A Messages ----------
app.get('/api/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM research_tasks WHERE user_id = ? ORDER BY started_at DESC LIMIT 30')
    .all(req.user!.id);
  res.json({ tasks: rows });
});

app.get('/api/tasks/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const task = db
    .prepare('SELECT * FROM research_tasks WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user!.id);
  if (!task) {
    res.status(404).json({ error: 'Research task not found.' });
    return;
  }

  const messages = db
    .prepare('SELECT * FROM agent_messages WHERE task_id = ? ORDER BY created_at ASC')
    .all(req.params.id)
    .map((m) => {
      const row = m as Record<string, unknown>;
      return {
        ...row,
        payload: JSON.parse(String(row.payload_json || '{}')),
      };
    });

  res.json({ task, messages });
});

app.post('/api/tasks/:id/retry', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!isGeminiConfigured()) {
    res.status(503).json({
      error:
        'GEMINI_API_KEY is not configured. Add a valid billing-enabled Gemini API key in Settings > Secrets before retrying.',
    });
    return;
  }

  const guard = checkUserActiveTaskOrCooldown(req.user!.id);
  if (guard) {
    res.status(guard.status).json({ error: guard.error });
    return;
  }

  const forceRefresh = req.body?.force_refresh === true;
  const profile = getOrCreateProfile(req.user!.id, req.user!.full_name);
  const outcome = retryTwoAgentResearchTask({
    taskId: req.params.id,
    userId: req.user!.id,
    profile,
    forceRefresh,
  });

  if (!outcome.ok) {
    res.status(outcome.status).json({ error: outcome.error });
    return;
  }

  res.status(202).json({
    ok: true,
    task_id: req.params.id,
    status: 'PENDING',
    resumed_from_agent2: outcome.resumedFromAgent2,
  });
});

// ---------- Scholarships & Filters ----------
app.get('/api/scholarships', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const includeTest = req.query.include_test === 'true';

  const rows = db
    .prepare(
      `SELECT
        s.*,
        ec.min_education_level, ec.allowed_states_json, ec.allowed_categories_json,
        ec.max_family_income_inr, ec.income_limit_note, ec.min_percentage,
        ec.allowed_courses_json, ec.gender_requirement, ec.disability_requirement,
        ec.minority_requirement, ec.institution_requirement, ec.other_conditions_json,
        ec.required_documents_json, ec.rules_verified,
        er.id AS report_id, er.outcome, er.rule_checks_json, er.missing_fields_json,
        er.explanation_summary, er.evidence_urls_json, er.evaluated_at,
        ap.id AS plan_id, ap.steps_json, ap.document_checklist_json, ap.deadline_date,
        ap.human_approved_portal_open, ap.approved_at, ap.application_stage, ap.application_number, ap.notes,
        CASE WHEN sv.id IS NOT NULL THEN 1 ELSE 0 END AS is_saved
       FROM scholarships s
       LEFT JOIN eligibility_criteria ec ON ec.scholarship_id = s.id
       LEFT JOIN eligibility_reports er ON er.scholarship_id = s.id AND er.user_id = s.user_id
       LEFT JOIN application_plans ap ON ap.scholarship_id = s.id AND ap.user_id = s.user_id
       LEFT JOIN saved_schemes sv ON sv.scholarship_id = s.id AND sv.user_id = s.user_id
       WHERE s.user_id = ? ${includeTest ? '' : 'AND s.is_test_data = 0'}
       ORDER BY s.created_at DESC`
    )
    .all(userId) as Array<Record<string, unknown>>;

  const stateFilter = typeof req.query.state === 'string' ? req.query.state.trim().toLowerCase() : '';
  const categoryFilter = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';
  const eduFilter = typeof req.query.education_level === 'string' ? req.query.education_level.trim().toLowerCase() : '';
  const courseFilter = typeof req.query.course === 'string' ? req.query.course.trim().toLowerCase() : '';
  const outcomeFilter = typeof req.query.outcome === 'string' ? req.query.outcome.trim() : '';
  const stageFilter = typeof req.query.application_status === 'string' ? req.query.application_status.trim() : '';
  const incomeEligibleOnly = req.query.income_eligible === 'true';

  const profile = getOrCreateProfile(userId);

  const enriched = rows
    .map((r) => {
      const allowedStates = JSON.parse(String(r.allowed_states_json || '[]')) as string[];
      const allowedCategories = JSON.parse(String(r.allowed_categories_json || '[]')) as string[];
      const allowedCourses = JSON.parse(String(r.allowed_courses_json || '[]')) as string[];
      const sources = db
        .prepare('SELECT * FROM official_sources WHERE scholarship_id = ?')
        .all(String(r.id));

      return {
        id: String(r.id),
        task_id: String(r.task_id),
        official_name: String(r.official_name),
        provider_ministry: String(r.provider_ministry),
        portal_name: String(r.portal_name),
        scheme_type: String(r.scheme_type),
        description: String(r.description),
        benefits_summary: String(r.benefits_summary),
        benefit_amount_inr: String(r.benefit_amount_inr),
        opening_date: String(r.opening_date),
        application_deadline: String(r.application_deadline),
        academic_year: String(r.academic_year),
        official_portal_url: String(r.official_portal_url),
        source_url: String(r.source_url),
        verification_status: String(r.verification_status),
        outdated_flag: Boolean(r.outdated_flag),
        outdated_reason: String(r.outdated_reason || ''),
        last_verified_at: String(r.last_verified_at),
        is_test_data: Boolean(r.is_test_data),
        created_at: String(r.created_at),
        is_saved: Boolean(r.is_saved),
        criteria: {
          min_education_level: String(r.min_education_level || 'Not verified'),
          allowed_states: allowedStates,
          allowed_categories: allowedCategories,
          max_family_income_inr: typeof r.max_family_income_inr === 'number' ? r.max_family_income_inr : null,
          income_limit_note: String(r.income_limit_note || ''),
          min_percentage: typeof r.min_percentage === 'number' ? r.min_percentage : null,
          allowed_courses: allowedCourses,
          gender_requirement: String(r.gender_requirement || 'All'),
          disability_requirement: String(r.disability_requirement || 'Any'),
          minority_requirement: String(r.minority_requirement || 'Any'),
          institution_requirement: String(r.institution_requirement || ''),
          other_conditions: JSON.parse(String(r.other_conditions_json || '[]')),
          required_documents: JSON.parse(String(r.required_documents_json || '[]')),
          rules_verified: Boolean(r.rules_verified),
        },
        eligibility_report: r.report_id
          ? {
              id: String(r.report_id),
              outcome: String(r.outcome),
              rule_checks: JSON.parse(String(r.rule_checks_json || '[]')),
              missing_fields: JSON.parse(String(r.missing_fields_json || '[]')),
              explanation_summary: String(r.explanation_summary || ''),
              evidence_urls: JSON.parse(String(r.evidence_urls_json || '[]')),
              evaluated_at: String(r.evaluated_at),
            }
          : null,
        application_plan: r.plan_id
          ? {
              id: String(r.plan_id),
              steps: JSON.parse(String(r.steps_json || '[]')),
              document_checklist: JSON.parse(String(r.document_checklist_json || '[]')),
              deadline_date: String(r.deadline_date || 'Not verified'),
              human_approved_portal_open: Boolean(r.human_approved_portal_open),
              approved_at: r.approved_at ? String(r.approved_at) : null,
              application_stage: String(r.application_stage || 'Plan Ready (Not Submitted)'),
              application_number: String(r.application_number || ''),
              notes: String(r.notes || ''),
            }
          : null,
        sources,
      };
    })
    .filter((item) => {
      if (stateFilter) {
        const states = item.criteria.allowed_states.map((s) => s.toLowerCase());
        const matchesState =
          states.some((s) => s.includes('all') || s.includes(stateFilter)) ||
          item.official_name.toLowerCase().includes(stateFilter);
        if (!matchesState) return false;
      }
      if (categoryFilter) {
        const cats = item.criteria.allowed_categories.map((c) => c.toLowerCase());
        const matchesCat = cats.some((c) => c.includes('all') || c.includes(categoryFilter));
        if (!matchesCat) return false;
      }
      if (eduFilter) {
        if (!item.criteria.min_education_level.toLowerCase().includes(eduFilter)) return false;
      }
      if (courseFilter) {
        const courses = item.criteria.allowed_courses.map((c) => c.toLowerCase());
        const matchesCourse = courses.some((c) => c.includes('all') || c.includes(courseFilter));
        if (!matchesCourse) return false;
      }
      if (outcomeFilter && item.eligibility_report?.outcome !== outcomeFilter) return false;
      if (stageFilter && item.application_plan?.application_stage !== stageFilter) return false;
      if (incomeEligibleOnly && profile.annual_family_income !== null) {
        if (
          item.criteria.max_family_income_inr !== null &&
          profile.annual_family_income > item.criteria.max_family_income_inr
        ) {
          return false;
        }
      }
      return true;
    });

  res.json({ scholarships: enriched });
});

app.post('/api/scholarships/:id/recheck', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const scholarshipId = req.params.id;
  const schRow = db
    .prepare('SELECT * FROM scholarships WHERE id = ? AND user_id = ?')
    .get(scholarshipId, userId) as Record<string, unknown> | undefined;
  const critRow = db
    .prepare('SELECT * FROM eligibility_criteria WHERE scholarship_id = ?')
    .get(scholarshipId) as Record<string, unknown> | undefined;

  if (!schRow || !critRow) {
    res.status(404).json({ error: 'Scholarship record not found.' });
    return;
  }

  const profile = getOrCreateProfile(userId);
  const schObj: Omit<ScholarshipRecord, 'id' | 'task_id' | 'created_at'> = {
    official_name: String(schRow.official_name),
    provider_ministry: String(schRow.provider_ministry),
    portal_name: String(schRow.portal_name),
    scheme_type: schRow.scheme_type as ScholarshipRecord['scheme_type'],
    description: String(schRow.description),
    benefits_summary: String(schRow.benefits_summary),
    benefit_amount_inr: String(schRow.benefit_amount_inr),
    opening_date: String(schRow.opening_date),
    application_deadline: String(schRow.application_deadline),
    academic_year: String(schRow.academic_year),
    official_portal_url: String(schRow.official_portal_url),
    source_url: String(schRow.source_url),
    verification_status: schRow.verification_status as ScholarshipRecord['verification_status'],
    outdated_flag: Boolean(schRow.outdated_flag),
    outdated_reason: String(schRow.outdated_reason || ''),
    last_verified_at: String(schRow.last_verified_at),
    is_test_data: Boolean(schRow.is_test_data),
  };

  const critObj: Omit<EligibilityCriterion, 'id' | 'scholarship_id'> = {
    min_education_level: String(critRow.min_education_level),
    allowed_states: JSON.parse(String(critRow.allowed_states_json || '[]')),
    allowed_categories: JSON.parse(String(critRow.allowed_categories_json || '[]')),
    max_family_income_inr:
      typeof critRow.max_family_income_inr === 'number' ? critRow.max_family_income_inr : null,
    income_limit_note: String(critRow.income_limit_note || ''),
    min_percentage: typeof critRow.min_percentage === 'number' ? critRow.min_percentage : null,
    allowed_courses: JSON.parse(String(critRow.allowed_courses_json || '[]')),
    gender_requirement: String(critRow.gender_requirement || 'All'),
    disability_requirement: String(critRow.disability_requirement || 'Any'),
    minority_requirement: String(critRow.minority_requirement || 'Any'),
    institution_requirement: String(critRow.institution_requirement || ''),
    other_conditions: JSON.parse(String(critRow.other_conditions_json || '[]')),
    required_documents: JSON.parse(String(critRow.required_documents_json || '[]')),
    rules_verified: Boolean(critRow.rules_verified),
  };

  const evalResult = evaluateEligibilityDeterministic(profile, schObj, critObj);
  const summary = evalResult.rule_checks
    .map((c) => `${c.condition}: ${c.status} (${c.reason})`)
    .join(' ');
  const nowIso = new Date().toISOString();

  db.prepare(
    `UPDATE eligibility_reports
     SET outcome = ?, rule_checks_json = ?, missing_fields_json = ?, explanation_summary = ?, evaluated_at = ?
     WHERE scholarship_id = ? AND user_id = ?`
  ).run(
    evalResult.outcome,
    JSON.stringify(evalResult.rule_checks),
    JSON.stringify(evalResult.missing_fields),
    summary,
    nowIso,
    scholarshipId,
    userId
  );

  res.json({
    outcome: evalResult.outcome,
    rule_checks: evalResult.rule_checks,
    missing_fields: evalResult.missing_fields,
    explanation_summary: summary,
    evaluated_at: nowIso,
  });
});

// ---------- Saved Schemes ----------
app.post('/api/saved/:scholarshipId', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const scholarshipId = req.params.scholarshipId;
  const exists = db
    .prepare('SELECT id FROM scholarships WHERE id = ? AND user_id = ?')
    .get(scholarshipId, userId);
  if (!exists) {
    res.status(404).json({ error: 'Scholarship not found.' });
    return;
  }
  db.prepare(
    `INSERT OR IGNORE INTO saved_schemes (id, user_id, scholarship_id, created_at) VALUES (?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId, scholarshipId, new Date().toISOString());
  res.json({ saved: true });
});

app.delete('/api/saved/:scholarshipId', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare('DELETE FROM saved_schemes WHERE user_id = ? AND scholarship_id = ?').run(
    req.user!.id,
    req.params.scholarshipId
  );
  res.json({ saved: false });
});

// ---------- Application Plan Checklists & Explicit Human Approval ----------
app.patch('/api/plans/:planId/checklist', requireAuth, (req: AuthenticatedRequest, res) => {
  const plan = db
    .prepare('SELECT * FROM application_plans WHERE id = ? AND user_id = ?')
    .get(req.params.planId, req.user!.id) as Record<string, unknown> | undefined;
  if (!plan) {
    res.status(404).json({ error: 'Application plan not found.' });
    return;
  }

  const steps: ApplicationStep[] = Array.isArray(req.body?.steps)
    ? req.body.steps
    : JSON.parse(String(plan.steps_json || '[]'));
  const checklist: DocumentChecklistItem[] = Array.isArray(req.body?.document_checklist)
    ? req.body.document_checklist
    : JSON.parse(String(plan.document_checklist_json || '[]'));
  const notes = typeof req.body?.notes === 'string' ? req.body.notes : String(plan.notes || '');
  const applicationNumber =
    typeof req.body?.application_number === 'string'
      ? req.body.application_number.trim().slice(0, 120)
      : String(plan.application_number || '');

  const nowIso = new Date().toISOString();
  db.prepare(
    `UPDATE application_plans
     SET steps_json = ?, document_checklist_json = ?, application_number = ?, notes = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    JSON.stringify(steps),
    JSON.stringify(checklist),
    applicationNumber,
    notes,
    nowIso,
    req.params.planId,
    req.user!.id
  );

  res.json({ ok: true, updated_at: nowIso, application_number: applicationNumber });
});

app.patch('/api/plans/:planId/stage', requireAuth, (req: AuthenticatedRequest, res) => {
  const plan = db
    .prepare('SELECT * FROM application_plans WHERE id = ? AND user_id = ?')
    .get(req.params.planId, req.user!.id) as Record<string, unknown> | undefined;
  if (!plan) {
    res.status(404).json({ error: 'Application plan not found.' });
    return;
  }

  const requestedStage = String(req.body?.application_stage || '') as ApplicationStage;
  const humanApproved = req.body?.human_approved === true;
  const applicationNumber =
    typeof req.body?.application_number === 'string'
      ? req.body.application_number.trim().slice(0, 120)
      : String(plan.application_number || '');

  const validStages: ApplicationStage[] = [
    'Discovered',
    'Plan Ready (Not Submitted)',
    'Documents Gathering',
    'Portal Approved by Student',
    'Self-Submitted by Student',
  ];

  if (!validStages.includes(requestedStage)) {
    res.status(400).json({ error: 'Invalid application stage.' });
    return;
  }

  // Enforce explicit human approval before external portal opening or marking manual submission
  if (
    (requestedStage === 'Portal Approved by Student' ||
      requestedStage === 'Self-Submitted by Student') &&
    !humanApproved &&
    !plan.human_approved_portal_open
  ) {
    res.status(400).json({
      error:
        'Explicit human approval is required before opening an external government portal or confirming manual submission.',
    });
    return;
  }

  const nowIso = new Date().toISOString();
  const approvedFlag = plan.human_approved_portal_open || humanApproved ? 1 : 0;
  const approvedAt = plan.approved_at ? String(plan.approved_at) : humanApproved ? nowIso : null;

  db.prepare(
    `UPDATE application_plans
     SET application_stage = ?, application_number = ?, human_approved_portal_open = ?, approved_at = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    requestedStage,
    applicationNumber,
    approvedFlag,
    approvedAt,
    nowIso,
    req.params.planId,
    req.user!.id
  );

  res.json({
    ok: true,
    application_stage: requestedStage,
    application_number: applicationNumber,
    human_approved_portal_open: Boolean(approvedFlag),
    approved_at: approvedAt,
  });
});

// ---------- Real Database-Backed Dashboard Summary ----------
app.get('/api/dashboard/summary', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  const totalSchemes = (
    db
      .prepare('SELECT COUNT(*) AS cnt FROM scholarships WHERE user_id = ? AND is_test_data = 0')
      .get(userId) as { cnt: number }
  ).cnt;

  const outcomes = db
    .prepare(
      `SELECT er.outcome, COUNT(*) AS cnt
       FROM eligibility_reports er
       JOIN scholarships s ON s.id = er.scholarship_id
       WHERE er.user_id = ? AND s.is_test_data = 0
       GROUP BY er.outcome`
    )
    .all(userId) as Array<{ outcome: string; cnt: number }>;

  const stages = db
    .prepare(
      `SELECT ap.application_stage, COUNT(*) AS cnt
       FROM application_plans ap
       JOIN scholarships s ON s.id = ap.scholarship_id
       WHERE ap.user_id = ? AND s.is_test_data = 0
       GROUP BY ap.application_stage`
    )
    .all(userId) as Array<{ application_stage: string; cnt: number }>;

  const savedCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM saved_schemes sv
         JOIN scholarships s ON s.id = sv.scholarship_id
         WHERE sv.user_id = ? AND s.is_test_data = 0`
      )
      .get(userId) as { cnt: number }
  ).cnt;

  const tasksCount = (
    db
      .prepare("SELECT COUNT(*) AS cnt FROM research_tasks WHERE user_id = ? AND mode = 'live_research'")
      .get(userId) as { cnt: number }
  ).cnt;

  const activeTasksCount = (
    db
      .prepare(
        "SELECT COUNT(*) AS cnt FROM research_tasks WHERE user_id = ? AND status IN ('PENDING', 'RUNNING')"
      )
      .get(userId) as { cnt: number }
  ).cnt;

  const outcomeMap: Record<string, number> = {
    'Likely Eligible': 0,
    'Needs More Information': 0,
    'Not Eligible': 0,
  };
  for (const row of outcomes) outcomeMap[row.outcome] = row.cnt;

  res.json({
    total_discovered_schemes: totalSchemes,
    likely_eligible_count: outcomeMap['Likely Eligible'],
    needs_info_count: outcomeMap['Needs More Information'],
    not_eligible_count: outcomeMap['Not Eligible'],
    saved_schemes_count: savedCount,
    research_runs_count: tasksCount,
    active_tasks_count: activeTasksCount,
    stages,
  });
});

// ---------- Frontend Serving (Vite Dev / Production Dist) ----------
async function startServer() {
  const port = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ScholarAI server running at http://0.0.0.0:${port}`);
  });
}

startServer();
