import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  Compass,
  ExternalLink,
  FlaskConical,
  Hash,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Pencil,
  RotateCcw,
  Search,
  User as UserIcon,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '../api';
import { translateOutcome, TRANSLATIONS, type AppLanguage } from '../i18n';
import type {
  AgentMessage,
  DashboardSummary,
  EnrichedScholarship,
  ResearchTask,
  StudentProfile,
  SystemStatus,
  User,
} from '../types';
import { AgentActivityCenter } from './AgentActivityCenter';
import { DeveloperSandbox } from './DeveloperSandbox';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ScholarshipDetail } from './ScholarshipDetail';
import { StudentAvatar } from './StudentAvatar';
import { StudentProfileForm } from './StudentProfileForm';
import { ThemeSwitcher, type AppTheme } from './ThemeSwitcher';

type TabKey =
  | 'dashboard'
  | 'discovery'
  | 'saved'
  | 'agents'
  | 'profile'
  | 'developer';

interface WorkspaceProps {
  token: string;
  user: User;
  systemStatus: SystemStatus;
  onRefreshSystemStatus?: () => void;
  language: AppLanguage;
  theme: AppTheme;
  onChangeLanguage: (lang: AppLanguage) => void;
  onChangeTheme: (theme: AppTheme) => void;
  onLogout: () => void;
}

export function Workspace({
  token,
  user,
  systemStatus,
  onRefreshSystemStatus,
  language,
  theme,
  onChangeLanguage,
  onChangeTheme,
  onLogout,
}: WorkspaceProps) {
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [scholarships, setScholarships] = useState<EnrichedScholarship[]>([]);
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ResearchTask | null>(null);
  const [taskMessages, setTaskMessages] = useState<AgentMessage[]>([]);
  const [activeScholarshipId, setActiveScholarshipId] = useState<string | null>(null);

  // Live Research Launch Form
  const [queryText, setQueryText] = useState('');
  const [launchState, setLaunchState] = useState('');
  const [launchCategory, setLaunchCategory] = useState('');
  const [launchEdu, setLaunchEdu] = useState('');
  const [forceRefresh, setForceRefresh] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  // Discovery Filters
  const [filterState, setFilterState] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterEdu, setFilterEdu] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterIncomeEligible, setFilterIncomeEligible] = useState(false);
  const [filterOutcome, setFilterOutcome] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [includeTest, setIncludeTest] = useState(false);

  // Inline Application Number Editor per Scholarship Plan
  const [editingAppPlanId, setEditingAppPlanId] = useState<string | null>(null);
  const [appNumberDraft, setAppNumberDraft] = useState('');
  const [savingAppNumber, setSavingAppNumber] = useState(false);
  const [appNumberError, setAppNumberError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [profRes, sumRes, schRes, taskRes] = await Promise.all([
      api.getProfile(token),
      api.getDashboardSummary(token),
      api.getScholarships(token, {
        state: filterState,
        category: filterCategory,
        education_level: filterEdu,
        course: filterCourse,
        income_eligible: filterIncomeEligible,
        outcome: filterOutcome,
        application_status: filterStage,
        include_test: includeTest,
      }),
      api.getTasks(token),
    ]);
    setProfile(profRes.profile);
    setSummary(sumRes);
    setScholarships(schRes.scholarships);
    setTasks(taskRes.tasks);

    if (taskRes.tasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(taskRes.tasks[0].id);
    }
    onRefreshSystemStatus?.();
  }, [
    token,
    filterState,
    filterCategory,
    filterEdu,
    filterCourse,
    filterIncomeEligible,
    filterOutcome,
    filterStage,
    includeTest,
    selectedTaskId,
    onRefreshSystemStatus,
  ]);

  useEffect(() => {
    loadAll().catch(() => {});
  }, [loadAll]);

  const loadTaskDetail = useCallback(
    async (taskId: string) => {
      const detail = await api.getTaskDetail(token, taskId);
      setSelectedTask(detail.task);
      setTaskMessages(detail.messages);
    },
    [token]
  );

  useEffect(() => {
    if (selectedTaskId) {
      loadTaskDetail(selectedTaskId).catch(() => {});
    }
  }, [selectedTaskId, loadTaskDetail]);

  const hasActiveTask = tasks.some((tk) => tk.status === 'PENDING' || tk.status === 'RUNNING');
  useEffect(() => {
    if (!hasActiveTask) return;
    const timer = setInterval(() => {
      loadAll().catch(() => {});
      if (selectedTaskId) {
        loadTaskDetail(selectedTaskId).catch(() => {});
      }
    }, 1200);
    return () => clearInterval(timer);
  }, [hasActiveTask, loadAll, selectedTaskId, loadTaskDetail]);

  async function handleLaunchResearch(e: FormEvent) {
    e.preventDefault();
    setLaunchError(null);
    setRetryError(null);
    setLaunching(true);
    try {
      const res = await api.startResearch(token, {
        query_text: queryText,
        state_filter: launchState || profile?.state || '',
        category_filter: launchCategory || profile?.category || '',
        education_filter: launchEdu || profile?.education_level || '',
        language,
        force_refresh: forceRefresh,
      });
      setSelectedTaskId(res.task_id);
      await loadAll();
      await loadTaskDetail(res.task_id);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : 'Failed to start research task.');
    } finally {
      setLaunching(false);
    }
  }

  async function handleRetryTask(taskId: string, bypassCache = false) {
    setRetryError(null);
    setLaunchError(null);
    setRetryingTaskId(taskId);
    try {
      await api.retryTask(token, taskId, bypassCache);
      setSelectedTaskId(taskId);
      await loadAll();
      await loadTaskDetail(taskId);
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Unable to retry failed task.');
    } finally {
      setRetryingTaskId(null);
    }
  }

  function openAppNumberEditor(planId: string, currentValue: string) {
    setEditingAppPlanId(planId);
    setAppNumberDraft(currentValue);
    setAppNumberError(null);
  }

  async function saveInlineAppNumber(planId: string) {
    setSavingAppNumber(true);
    setAppNumberError(null);
    try {
      await api.updatePlanChecklist(token, planId, {
        application_number: appNumberDraft.trim(),
      });
      setEditingAppPlanId(null);
      await loadAll();
    } catch (err) {
      setAppNumberError(
        err instanceof Error ? err.message : 'Could not save application number.'
      );
    } finally {
      setSavingAppNumber(false);
    }
  }

  const activeScholarship =
    scholarships.find((s) => s.id === activeScholarshipId) || null;

  const savedOrPlanned = scholarships.filter(
    (s) =>
      s.is_saved ||
      (s.application_plan &&
        (s.application_plan.application_stage !== 'Plan Ready (Not Submitted)' ||
          Boolean(s.application_plan.application_number) ||
          s.application_plan.document_checklist.some((d) => d.ready) ||
          s.application_plan.steps.some((st) => st.completed)))
  );

  const navItems: Array<{ key: TabKey; label: string; icon: typeof LayoutDashboard }> = [
    { key: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { key: 'discovery', label: t.navDiscovery, icon: Compass },
    { key: 'saved', label: t.navSaved, icon: Bookmark },
    { key: 'agents', label: t.navAgents, icon: Activity },
    { key: 'profile', label: t.navProfile, icon: UserIcon },
    { key: 'developer', label: t.navDeveloper, icon: FlaskConical },
  ];

  const runningTask = tasks.find((tk) => tk.status === 'PENDING' || tk.status === 'RUNNING');
  const latestTask = tasks[0] || null;
  const displayName = profile?.full_name || user.full_name;

  function renderInlineApplicationNumber(s: EnrichedScholarship) {
    const plan = s.application_plan;
    if (!plan) return null;
    const isEditing = editingAppPlanId === plan.id;

    return (
      <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3.5 py-2.5 text-xs">
        {isEditing ? (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label
                htmlFor={`card-app-num-${plan.id}`}
                className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 shrink-0"
              >
                <Hash className="h-3.5 w-3.5 text-blue-800 dark:text-blue-400" />
                {t.applicationNumberLabel}:
              </label>
              <input
                id={`card-app-num-${plan.id}`}
                type="text"
                value={appNumberDraft}
                onChange={(e) => setAppNumberDraft(e.target.value)}
                maxLength={120}
                placeholder={t.applicationNumberPlaceholder}
                className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={savingAppNumber}
                  onClick={() => saveInlineAppNumber(plan.id)}
                  className="rounded-md bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  {t.saveAppNumberBtn}
                </button>
                <button
                  type="button"
                  disabled={savingAppNumber}
                  onClick={() => {
                    setEditingAppPlanId(null);
                    setAppNumberError(null);
                  }}
                  aria-label="Cancel editing application number"
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {appNumberError && (
              <p className="text-[11px] text-red-700 dark:text-red-400">{appNumberError}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <Hash className="h-3.5 w-3.5 text-blue-800 dark:text-blue-400 shrink-0" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                {t.applicationNumberLabel}:
              </span>
              {plan.application_number ? (
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums break-all">
                  {plan.application_number}
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">{t.notEnteredLabel}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => openAppNumberEditor(plan.id, plan.application_number || '')}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0 cursor-pointer"
            >
              <Pencil className="h-3 w-3" />
              {plan.application_number ? 'Edit' : 'Add'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center gap-3">
          <StudentAvatar name={displayName} src={profile?.profile_pic_url} size="md" />
          <div className="min-w-0">
            <p className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              ScholarAI
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {displayName}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? 'text-blue-800 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              {t.themeLabel}
            </p>
            <ThemeSwitcher theme={theme} language={language} onChange={onChangeTheme} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              {t.languageLabel}
            </p>
            <LanguageSwitcher language={language} onChange={onChangeLanguage} compact />
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            {t.signOut}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <StudentAvatar name={displayName} src={profile?.profile_pic_url} size="sm" />
                <span className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                  ScholarAI
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation drawer"
                className="p-1.5 text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.key);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-3">
              <ThemeSwitcher theme={theme} language={language} onChange={onChangeTheme} />
              <LanguageSwitcher language={language} onChange={onChangeLanguage} compact />
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {t.signOut}
              </button>
            </div>
          </div>
          <div
            className="flex-1 bg-slate-950/40 dark:bg-slate-950/70"
            onClick={() => setMobileNavOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate">
              ScholarAI <span aria-hidden="true">/</span>{' '}
              <span className="text-slate-900 dark:text-slate-100 font-semibold">
                {navItems.find((n) => n.key === activeTab)?.label}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden md:block">
              <ThemeSwitcher theme={theme} language={language} onChange={onChangeTheme} compact />
            </div>
            <div className="hidden sm:block">
              <LanguageSwitcher language={language} onChange={onChangeLanguage} />
            </div>
            {runningTask && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTaskId(runningTask.id);
                  setActiveTab('agents');
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 text-xs font-medium text-blue-900 dark:text-blue-300 cursor-pointer"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="hidden md:inline truncate max-w-[180px]">
                  {runningTask.current_stage}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('discovery')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              {t.discoverSchemesBtn}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              title={displayName}
              aria-label={`Open student profile (${displayName})`}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 cursor-pointer"
            >
              <StudentAvatar name={displayName} src={profile?.profile_pic_url} size="sm" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {!systemStatus.gemini_configured && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 p-4 text-sm text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
              <div>
                <p className="font-semibold">Gemini API Key Required for Live Agent Research</p>
                <p className="text-xs mt-1">
                  Add a valid billing-enabled <code className="font-mono">GEMINI_API_KEY</code> in{' '}
                  <strong>Settings &gt; Secrets</strong> so Agent 1 can execute live Google Search
                  Grounding and Agent 2 can generate application plans. ScholarAI never masks a
                  missing key with fake scholarship data.
                </p>
              </div>
            </div>
          )}

          {systemStatus.gemini_configured &&
            systemStatus.quota_status &&
            systemStatus.quota_status !== 'OK' && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-900 dark:text-red-200">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-700 dark:text-red-400" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{t.quotaAlertTitle}</p>
                    {systemStatus.gemini_model && (
                      <span className="font-mono text-[11px] rounded border border-red-300 dark:border-red-800 px-2 py-0.5">
                        {t.activeModelLabel}: {systemStatus.gemini_model}
                        {systemStatus.gemini_key_hint ? ` · ${systemStatus.gemini_key_hint}` : ''}
                      </span>
                    )}
                  </div>
                  {systemStatus.last_quota_error && (
                    <p className="text-xs leading-relaxed">{systemStatus.last_quota_error}</p>
                  )}
                  <p className="text-xs font-medium">{t.quotaBillingInstructions}</p>
                </div>
              </div>
            )}

          {latestTask &&
            latestTask.status === 'FAILED' &&
            activeTab !== 'agents' && (
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 p-4 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-red-700 dark:text-red-400">
                      Latest Research Task Failed
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      ID: {latestTask.id.slice(0, 8)}
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      Agent 1: {latestTask.agent1_status} · Agent 2: {latestTask.agent2_status}
                    </span>
                  </div>
                  {latestTask.error_message && (
                    <p className="mt-1 text-slate-700 dark:text-slate-300 line-clamp-2">
                      {latestTask.error_message}
                    </p>
                  )}
                  {retryError && (
                    <p className="mt-1 text-red-700 dark:text-red-400">{retryError}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTaskId(latestTask.id);
                      setActiveTab('agents');
                    }}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    {t.viewActivityLogsBtn}
                  </button>
                  <button
                    type="button"
                    disabled={
                      retryingTaskId === latestTask.id ||
                      hasActiveTask ||
                      !systemStatus.gemini_configured
                    }
                    onClick={() => handleRetryTask(latestTask.id, false)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 px-3.5 py-1.5 font-semibold text-white disabled:opacity-50 cursor-pointer"
                  >
                    {retryingTaskId === latestTask.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    {retryingTaskId === latestTask.id ? t.retryingTaskBtn : t.retryTaskBtn}
                  </button>
                </div>
              </div>
            )}

          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && summary && (
            <div className="space-y-8">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  {t.dashTitle}
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.dashSub}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t.metricRetrieved}
                  </p>
                  <p className="mt-2 font-mono text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                    {summary.total_discovered_schemes}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Runs: {summary.research_runs_count}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t.metricLikelyEligible}
                  </p>
                  <p className="mt-2 font-mono text-3xl font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {summary.likely_eligible_count}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t.metricAllMatched}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t.metricNeedsInfo}
                  </p>
                  <p className="mt-2 font-mono text-3xl font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                    {summary.needs_info_count}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t.metricMissingFields}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t.metricSaved}
                  </p>
                  <p className="mt-2 font-mono text-3xl font-semibold text-blue-800 dark:text-blue-400 tabular-nums">
                    {summary.saved_schemes_count}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t.metricWithChecklists}
                  </p>
                </div>
              </div>

              {summary.total_discovered_schemes === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
                  <Compass className="h-9 w-9 text-blue-800 dark:text-blue-400 mx-auto mb-3" />
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    {t.emptyDashTitle}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                    {t.emptyDashBody}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      {t.completeProfileBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('discovery')}
                      className="rounded-lg bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
                    >
                      {t.launchDiscoveryBtn}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      {t.outcomeDistTitle}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-5">
                      {t.outcomeDistSub}
                    </p>
                    <div className="space-y-4">
                      {[
                        {
                          label: t.outcomeLikelyEligible,
                          count: summary.likely_eligible_count,
                          color: 'bg-emerald-600',
                        },
                        {
                          label: t.outcomeNeedsInfo,
                          count: summary.needs_info_count,
                          color: 'bg-amber-500',
                        },
                        {
                          label: t.outcomeNotEligible,
                          count: summary.not_eligible_count,
                          color: 'bg-red-600',
                        },
                      ].map((bar) => {
                        const pct =
                          summary.total_discovered_schemes > 0
                            ? Math.round((bar.count / summary.total_discovered_schemes) * 100)
                            : 0;
                        return (
                          <div key={bar.label}>
                            <div className="flex justify-between text-xs font-medium mb-1.5">
                              <span className="text-slate-800 dark:text-slate-200">{bar.label}</span>
                              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                                {bar.count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${bar.color}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        {t.deadlineTrackerTitle}
                      </h2>
                      <CalendarClock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {scholarships
                        .filter((s) => !s.is_test_data)
                        .slice(0, 5)
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setActiveScholarshipId(s.id)}
                            className="w-full py-3 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {s.official_name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {s.portal_name} ·{' '}
                                {translateOutcome(s.eligibility_report?.outcome || '', t)}
                                {s.application_plan?.application_number
                                  ? ` · #${s.application_plan.application_number}`
                                  : ''}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                                {s.application_deadline}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {s.application_plan?.application_stage}
                              </p>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LIVE DISCOVERY VIEW */}
          {activeTab === 'discovery' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  {t.discoveryTitle}
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.discoverySub}</p>
              </div>

              <form
                onSubmit={handleLaunchResearch}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
              >
                {launchError && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-300">
                    {launchError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      {t.searchQueryLabel}
                    </label>
                    <input
                      type="text"
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      placeholder={t.searchQueryPlaceholder}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      {t.targetStateLabel}
                    </label>
                    <input
                      type="text"
                      value={launchState}
                      onChange={(e) => setLaunchState(e.target.value)}
                      placeholder={profile?.state || 'Karnataka'}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      {t.categoryLabel}
                    </label>
                    <input
                      type="text"
                      value={launchCategory}
                      onChange={(e) => setLaunchCategory(e.target.value)}
                      placeholder={profile?.category || 'OBC / SC'}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="lg:col-span-3 flex items-end">
                    <button
                      type="submit"
                      disabled={launching || hasActiveTask || !systemStatus.gemini_configured}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
                    >
                      {launching || hasActiveTask ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      {t.runAgentsBtn}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-600 dark:text-slate-400">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceRefresh}
                      onChange={(e) => setForceRefresh(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 text-blue-800"
                    />
                    {t.forceRefreshResearch}
                  </label>
                  {systemStatus.gemini_model && (
                    <span className="font-mono text-[11px]">
                      {t.activeModelLabel}: {systemStatus.gemini_model}
                    </span>
                  )}
                </div>
              </form>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <input
                    type="text"
                    value={filterState}
                    onChange={(e) => setFilterState(e.target.value)}
                    placeholder={t.filterStatePlaceholder}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    placeholder={t.filterCategoryPlaceholder}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={filterEdu}
                    onChange={(e) => setFilterEdu(e.target.value)}
                    placeholder={t.filterEduPlaceholder}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={filterCourse}
                    onChange={(e) => setFilterCourse(e.target.value)}
                    placeholder={t.filterCoursePlaceholder}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
                  />
                  <select
                    value={filterOutcome}
                    onChange={(e) => setFilterOutcome(e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">{t.allOutcomesOption}</option>
                    <option value="Likely Eligible">{t.outcomeLikelyEligible}</option>
                    <option value="Needs More Information">{t.outcomeNeedsInfo}</option>
                    <option value="Not Eligible">{t.outcomeNotEligible}</option>
                  </select>
                  <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">{t.allStagesOption}</option>
                    <option value="Plan Ready (Not Submitted)">Plan Ready (Not Submitted)</option>
                    <option value="Documents Gathering">Documents Gathering</option>
                    <option value="Portal Approved by Student">Portal Approved by Student</option>
                    <option value="Self-Submitted by Student">Self-Submitted by Student</option>
                  </select>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-6 text-xs text-slate-700 dark:text-slate-300">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterIncomeEligible}
                      onChange={(e) => setFilterIncomeEligible(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 text-blue-800"
                    />
                    {t.withinIncomeCheck}
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTest}
                      onChange={(e) => setIncludeTest(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 text-blue-800"
                    />
                    {t.includeTestCheck}
                  </label>
                </div>
              </div>

              {scholarships.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t.noSchemesFound}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {scholarships.map((s) => {
                    const outcome = s.eligibility_report?.outcome || 'Needs More Information';
                    return (
                      <div
                        key={s.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span>{s.scheme_type}</span>
                              <span aria-hidden="true">·</span>
                              <span>{s.provider_ministry}</span>
                              <span aria-hidden="true">·</span>
                              <span>{s.portal_name}</span>
                              {s.is_test_data && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                                    TEST SANDBOX RECORD
                                  </span>
                                </>
                              )}
                            </div>

                            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-1">
                              {s.official_name}
                            </h3>
                            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                              {s.description}
                            </p>

                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
                              <div>
                                <p className="text-slate-500 dark:text-slate-400">
                                  {t.benefitsLabel}
                                </p>
                                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                                  {s.benefit_amount_inr}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500 dark:text-slate-400">
                                  {t.deadlineLabel}
                                </p>
                                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                                  {s.application_deadline}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500 dark:text-slate-400">
                                  {t.incomeLimitLabel}
                                </p>
                                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                                  {s.criteria.max_family_income_inr !== null
                                    ? `<= INR ${s.criteria.max_family_income_inr.toLocaleString('en-IN')}`
                                    : s.criteria.income_limit_note || 'Not verified'}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500 dark:text-slate-400">
                                  {t.lastVerifiedLabel}
                                </p>
                                <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5 tabular-nums">
                                  {new Date(s.last_verified_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {renderInlineApplicationNumber(s)}
                          </div>

                          <div className="flex flex-col items-start lg:items-end justify-between gap-3 shrink-0">
                            <span
                              className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                                outcome === 'Likely Eligible'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : outcome === 'Not Eligible'
                                  ? 'text-red-700 dark:text-red-400'
                                  : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {outcome === 'Likely Eligible' && (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              {outcome === 'Not Eligible' && <XCircle className="h-4 w-4" />}
                              {outcome === 'Needs More Information' && (
                                <HelpCircle className="h-4 w-4" />
                              )}
                              {translateOutcome(outcome, t)}
                            </span>

                            <div className="flex items-center gap-2">
                              {s.source_url && s.source_url !== 'Not verified' && (
                                <a
                                  href={s.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                  {t.sourceBtn}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => setActiveScholarshipId(s.id)}
                                className="rounded-lg bg-slate-900 dark:bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-600 cursor-pointer"
                              >
                                {t.inspectPlanBtn}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SAVED & APPLICATION PLANS VIEW */}
          {activeTab === 'saved' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  {t.savedTitle}
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.savedSub}</p>
              </div>

              {savedOrPlanned.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t.noSavedBody}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {savedOrPlanned.map((s) => {
                    const docs = s.application_plan?.document_checklist || [];
                    const readyDocs = docs.filter((d) => d.ready).length;
                    const steps = s.application_plan?.steps || [];
                    const doneSteps = steps.filter((st) => st.completed).length;

                    return (
                      <div
                        key={s.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between gap-4"
                      >
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {s.portal_name} · {s.application_plan?.application_stage}
                          </p>
                          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mt-1">
                            {s.official_name}
                          </h3>
                          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">
                                {t.deadlineLabel}
                              </p>
                              <p className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                                {s.application_deadline}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">
                                {t.documentsLabel}
                              </p>
                              <p className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                                {readyDocs}/{docs.length}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">
                                {t.actionStepsLabel}
                              </p>
                              <p className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                                {doneSteps}/{steps.length}
                              </p>
                            </div>
                          </div>

                          {renderInlineApplicationNumber(s)}
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {s.application_plan?.human_approved_portal_open
                              ? t.portalApprovedNote
                              : t.awaitingReviewNote}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveScholarshipId(s.id)}
                            className="rounded-lg bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                          >
                            {t.openChecklistBtn}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* AGENT ACTIVITY CENTER */}
          {activeTab === 'agents' && (
            <AgentActivityCenter
              tasks={tasks}
              selectedTask={selectedTask}
              messages={taskMessages}
              language={language}
              systemStatus={systemStatus}
              retryingTaskId={retryingTaskId}
              retryError={retryError}
              onSelectTask={(id) => setSelectedTaskId(id)}
              onRefresh={() => {
                loadAll().catch(() => {});
                if (selectedTaskId) loadTaskDetail(selectedTaskId).catch(() => {});
              }}
              onRetryTask={handleRetryTask}
            />
          )}

          {/* STUDENT PROFILE */}
          {activeTab === 'profile' && profile && (
            <StudentProfileForm
              token={token}
              profile={profile}
              language={language}
              onUpdated={(updated) => {
                setProfile(updated);
                loadAll().catch(() => {});
              }}
            />
          )}

          {/* DEVELOPER MODE */}
          {activeTab === 'developer' && profile && (
            <DeveloperSandbox
              token={token}
              profile={profile}
              geminiConfigured={systemStatus.gemini_configured}
              language={language}
              onTaskStarted={(taskId) => {
                setSelectedTaskId(taskId);
                setIncludeTest(true);
                setActiveTab('agents');
                loadAll().catch(() => {});
              }}
            />
          )}
        </main>
      </div>

      {activeScholarship && (
        <ScholarshipDetail
          token={token}
          scholarship={activeScholarship}
          language={language}
          onClose={() => setActiveScholarshipId(null)}
          onRefresh={loadAll}
        />
      )}
    </div>
  );
}
