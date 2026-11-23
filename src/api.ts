import type {
  AgentMessage,
  ApplicationStage,
  ApplicationStep,
  DashboardSummary,
  DocumentChecklistItem,
  EnrichedScholarship,
  ResearchTask,
  SecurityQuestionAnswer,
  SecurityQuestionItem,
  StudentProfile,
  SystemStatus,
  User,
} from './types';

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  getSystemStatus: () => request<SystemStatus>('/api/system/status'),

  register: (body: {
    email: string;
    full_name: string;
    password: string;
    security_questions: SecurityQuestionAnswer[];
  }) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: (token: string) =>
    request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }, token),

  getResetSecurityQuestions: (body: { email: string }) =>
    request<{ questions: SecurityQuestionItem[] }>('/api/auth/forgot-password/questions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  resetPassword: (body: {
    email: string;
    answers: SecurityQuestionAnswer[];
    new_password: string;
  }) =>
    request<{ ok: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getProfile: (token: string) =>
    request<{ profile: StudentProfile }>('/api/profile', {}, token),

  updateProfile: (token: string, profile: Partial<StudentProfile>) =>
    request<{ profile: StudentProfile }>(
      '/api/profile',
      { method: 'PUT', body: JSON.stringify(profile) },
      token
    ),

  startResearch: (
    token: string,
    body: {
      query_text: string;
      state_filter: string;
      category_filter: string;
      education_filter: string;
      language?: 'en' | 'kn' | 'hi';
      force_refresh?: boolean;
    }
  ) =>
    request<{ task_id: string; status: string }>(
      '/api/research/start',
      { method: 'POST', body: JSON.stringify(body) },
      token
    ),

  runDeveloperTest: (
    token: string,
    body: {
      scenario_name: string;
      custom_prompt: string;
      test_profile: Partial<StudentProfile>;
      language?: 'en' | 'kn' | 'hi';
      force_refresh?: boolean;
    }
  ) =>
    request<{ task_id: string; status: string; mode: string }>(
      '/api/research/developer-test',
      { method: 'POST', body: JSON.stringify(body) },
      token
    ),

  getTasks: (token: string) =>
    request<{ tasks: ResearchTask[] }>('/api/tasks', {}, token),

  getTaskDetail: (token: string, taskId: string) =>
    request<{ task: ResearchTask; messages: AgentMessage[] }>(
      `/api/tasks/${encodeURIComponent(taskId)}`,
      {},
      token
    ),

  retryTask: (token: string, taskId: string, forceRefresh = false) =>
    request<{
      ok: boolean;
      task_id: string;
      status: string;
      resumed_from_agent2: boolean;
    }>(
      `/api/tasks/${encodeURIComponent(taskId)}/retry`,
      { method: 'POST', body: JSON.stringify({ force_refresh: forceRefresh }) },
      token
    ),

  getScholarships: (
    token: string,
    params: Record<string, string | boolean | undefined> = {}
  ) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '' && v !== false) {
        sp.set(k, String(v));
      }
    }
    const qs = sp.toString();
    return request<{ scholarships: EnrichedScholarship[] }>(
      `/api/scholarships${qs ? `?${qs}` : ''}`,
      {},
      token
    );
  },

  recheckScholarship: (token: string, scholarshipId: string) =>
    request<{
      outcome: string;
      rule_checks: unknown[];
      missing_fields: string[];
      explanation_summary: string;
    }>(`/api/scholarships/${encodeURIComponent(scholarshipId)}/recheck`, { method: 'POST' }, token),

  saveScholarship: (token: string, scholarshipId: string) =>
    request<{ saved: boolean }>(
      `/api/saved/${encodeURIComponent(scholarshipId)}`,
      { method: 'POST' },
      token
    ),

  unsaveScholarship: (token: string, scholarshipId: string) =>
    request<{ saved: boolean }>(
      `/api/saved/${encodeURIComponent(scholarshipId)}`,
      { method: 'DELETE' },
      token
    ),

  updatePlanChecklist: (
    token: string,
    planId: string,
    body: {
      steps?: ApplicationStep[];
      document_checklist?: DocumentChecklistItem[];
      notes?: string;
      application_number?: string;
    }
  ) =>
    request<{ ok: boolean; updated_at: string; application_number?: string }>(
      `/api/plans/${encodeURIComponent(planId)}/checklist`,
      { method: 'PATCH', body: JSON.stringify(body) },
      token
    ),

  updatePlanStage: (
    token: string,
    planId: string,
    body: {
      application_stage: ApplicationStage;
      human_approved?: boolean;
      application_number?: string;
    }
  ) =>
    request<{
      ok: boolean;
      application_stage: ApplicationStage;
      human_approved_portal_open: boolean;
      approved_at: string | null;
      application_number?: string;
    }>(
      `/api/plans/${encodeURIComponent(planId)}/stage`,
      { method: 'PATCH', body: JSON.stringify(body) },
      token
    ),

  getDashboardSummary: (token: string) =>
    request<DashboardSummary>('/api/dashboard/summary', {}, token),
};
