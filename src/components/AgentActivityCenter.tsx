import { useState } from 'react';
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { TRANSLATIONS, type AppLanguage } from '../i18n';
import type { AgentMessage, ResearchTask, SystemStatus } from '../types';

interface AgentActivityCenterProps {
  tasks: ResearchTask[];
  selectedTask: ResearchTask | null;
  messages: AgentMessage[];
  language: AppLanguage;
  systemStatus: SystemStatus;
  retryingTaskId: string | null;
  retryError?: string | null;
  onSelectTask: (taskId: string) => void;
  onRefresh: () => void;
  onRetryTask: (taskId: string, forceRefresh?: boolean) => Promise<void>;
}

export function AgentActivityCenter({
  tasks,
  selectedTask,
  messages,
  language,
  systemStatus,
  retryingTaskId,
  retryError,
  onSelectTask,
  onRefresh,
  onRetryTask,
}: AgentActivityCenterProps) {
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null);
  const [bypassCacheOnRetry, setBypassCacheOnRetry] = useState(false);
  const t = TRANSLATIONS[language];

  const hasActiveTask = tasks.some((tk) => tk.status === 'PENDING' || tk.status === 'RUNNING');
  const isSelectedQuotaOrKeyError = Boolean(
    selectedTask?.error_message &&
      /429|RESOURCE_EXHAUSTED|quota|billing|API_KEY|PERMISSION_DENIED/i.test(
        selectedTask.error_message
      )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {t.agentCenterTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.agentCenterSub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {systemStatus.gemini_model && (
            <span className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
              {t.activeModelLabel}: {systemStatus.gemini_model}
              {systemStatus.gemini_key_hint ? ` · Key ${systemStatus.gemini_key_hint}` : ''}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t.refreshTasksBtn}
          </button>
        </div>
      </div>

      {retryError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-xs text-red-800 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{retryError}</p>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <ArrowRightLeft className="h-8 w-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.noTasksTitle}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Launch a Live Discovery search or run a Developer Sandbox test to observe Agent 1 and
            Agent 2 exchanging structured research and eligibility bundles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Task List */}
          <div className="lg:col-span-4 space-y-2.5">
            {tasks.map((task) => {
              const isSelected = selectedTask?.id === task.id;
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelectTask(task.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-blue-800 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-slate-500 dark:text-slate-400 truncate">
                      {task.id.slice(0, 8)}
                    </span>
                    <span
                      className={`font-semibold ${
                        task.status === 'COMPLETED'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : task.status === 'FAILED'
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-blue-800 dark:text-blue-400'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                    {task.query_text}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {task.current_stage}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    <span>{task.mode === 'developer_test' ? 'DEV TEST' : 'LIVE'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(task.started_at).toLocaleTimeString()}</span>
                    {task.retry_count > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Retry #{task.retry_count}</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Task Inspector */}
          <div className="lg:col-span-8">
            {selectedTask ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      TASK ID: {selectedTask.id}
                    </p>
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-1">
                      {selectedTask.query_text}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {selectedTask.current_stage}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                      <p>Retries: {selectedTask.retry_count}</p>
                      <p className="mt-0.5">
                        Started: {new Date(selectedTask.started_at).toLocaleString()}
                      </p>
                    </div>
                    {selectedTask.status === 'FAILED' && (
                      <button
                        type="button"
                        disabled={
                          retryingTaskId === selectedTask.id ||
                          hasActiveTask ||
                          !systemStatus.gemini_configured
                        }
                        onClick={() => onRetryTask(selectedTask.id, bypassCacheOnRetry)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                      >
                        {retryingTaskId === selectedTask.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {retryingTaskId === selectedTask.id ? t.retryingTaskBtn : t.retryTaskBtn}
                      </button>
                    )}
                  </div>
                </div>

                {/* Two-Agent Pipeline Stepper */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-900 dark:text-white">
                        Agent 1 — Research Agent
                      </span>
                      <span
                        className={`font-mono ${
                          selectedTask.agent1_status === 'FAILED'
                            ? 'text-red-700 dark:text-red-400'
                            : selectedTask.agent1_status === 'DONE'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-blue-800 dark:text-blue-400'
                        }`}
                      >
                        {selectedTask.agent1_status}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                      Executes live Google Search Grounding on official portals and verifies source
                      reachability.
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-900 dark:text-white">
                        Agent 2 — Eligibility &amp; Planner
                      </span>
                      <span
                        className={`font-mono ${
                          selectedTask.agent2_status === 'FAILED'
                            ? 'text-red-700 dark:text-red-400'
                            : selectedTask.agent2_status === 'DONE'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : selectedTask.agent2_status === 'IDLE'
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {selectedTask.agent2_status}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {selectedTask.status === 'FAILED' && selectedTask.agent2_status === 'IDLE'
                        ? t.agent2SkippedNote
                        : 'Runs deterministic rule checks against student profile and generates checklist plans.'}
                    </p>
                  </div>
                </div>

                {selectedTask.error_message && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-xs text-red-800 dark:text-red-300 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">Task Error Log</p>
                        <p className="mt-1 leading-relaxed break-words">
                          {selectedTask.error_message}
                        </p>
                        {isSelectedQuotaOrKeyError && (
                          <p className="mt-2 text-red-900 dark:text-red-200 font-medium">
                            {t.quotaBillingInstructions}
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedTask.status === 'FAILED' && (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-red-200/80 dark:border-red-900/50 pt-3">
                        <label className="inline-flex items-center gap-2 text-xs text-red-900 dark:text-red-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bypassCacheOnRetry}
                            onChange={(e) => setBypassCacheOnRetry(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-red-300 dark:border-red-700 text-blue-800"
                          />
                          {t.forceRefreshResearch}
                        </label>
                        <button
                          type="button"
                          disabled={
                            retryingTaskId === selectedTask.id ||
                            hasActiveTask ||
                            !systemStatus.gemini_configured
                          }
                          onClick={() => onRetryTask(selectedTask.id, bypassCacheOnRetry)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                        >
                          {retryingTaskId === selectedTask.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          {retryingTaskId === selectedTask.id
                            ? t.retryingTaskBtn
                            : t.retryTaskBtn}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Structured A2A Message Log */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                    Agent-to-Agent (A2A) JSON Message Bus ({messages.length})
                  </h4>
                  {messages.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-4">
                      {selectedTask.status === 'RUNNING' || selectedTask.status === 'PENDING' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-blue-800 dark:text-blue-400" />
                          Waiting for agent message log...
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4" />
                          No A2A messages recorded.
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {messages.map((msg) => {
                        const isExpanded = expandedMsgId === msg.id;
                        return (
                          <div
                            key={msg.id}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedMsgId(isExpanded ? null : msg.id)
                              }
                              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                                )}
                                <span className="font-mono font-semibold text-slate-900 dark:text-white truncate">
                                  {msg.message_type}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 truncate">
                                  {msg.sender_agent} &rarr; {msg.receiver_agent}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                                <span
                                  className={
                                    msg.status === 'ERROR'
                                      ? 'text-red-700 dark:text-red-400'
                                      : 'text-emerald-700 dark:text-emerald-400'
                                  }
                                >
                                  {msg.status === 'PROCESSED' || msg.status === 'DELIVERED' ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                                  ) : null}
                                  {msg.status}
                                </span>
                                <span className="text-slate-400 tabular-nums">
                                  {new Date(msg.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-950 p-4 overflow-x-auto">
                                <pre className="font-mono text-[11px] leading-relaxed text-slate-200">
                                  {JSON.stringify(msg.payload, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Select a task from the left to inspect its A2A communication trace.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

