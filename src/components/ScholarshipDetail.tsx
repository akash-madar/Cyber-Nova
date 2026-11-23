import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  Hash,
  HelpCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '../api';
import { translateOutcome, TRANSLATIONS, type AppLanguage } from '../i18n';
import type {
  ApplicationStage,
  ApplicationStep,
  DocumentChecklistItem,
  EnrichedScholarship,
} from '../types';

interface ScholarshipDetailProps {
  token: string;
  scholarship: EnrichedScholarship;
  language: AppLanguage;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

const STAGES: ApplicationStage[] = [
  'Discovered',
  'Plan Ready (Not Submitted)',
  'Documents Gathering',
  'Portal Approved by Student',
  'Self-Submitted by Student',
];

export function ScholarshipDetail({
  token,
  scholarship,
  language,
  onClose,
  onRefresh,
}: ScholarshipDetailProps) {
  const t = TRANSLATIONS[language];
  const [busy, setBusy] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalConfirmedCheck, setApprovalConfirmedCheck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(scholarship.application_plan?.notes || '');
  const [applicationNumber, setApplicationNumber] = useState(
    scholarship.application_plan?.application_number || ''
  );
  const [appNumberSaved, setAppNumberSaved] = useState(false);

  const report = scholarship.eligibility_report;
  const plan = scholarship.application_plan;

  useEffect(() => {
    setNotes(scholarship.application_plan?.notes || '');
    setApplicationNumber(scholarship.application_plan?.application_number || '');
    setAppNumberSaved(false);
  }, [scholarship.id, scholarship.application_plan?.notes, scholarship.application_plan?.application_number]);

  const portalHref =
    scholarship.official_portal_url && scholarship.official_portal_url !== 'Not verified'
      ? scholarship.official_portal_url
      : scholarship.source_url && scholarship.source_url !== 'Not verified'
      ? scholarship.source_url
      : null;

  const isSafeExternalUrl = (url: string | null): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  };

  async function toggleSave() {
    setBusy(true);
    setError(null);
    try {
      if (scholarship.is_saved) {
        await api.unsaveScholarship(token, scholarship.id);
      } else {
        await api.saveScholarship(token, scholarship.id);
      }
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update saved state.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRecheck() {
    setBusy(true);
    setError(null);
    try {
      await api.recheckScholarship(token, scholarship.id);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recheck rules.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleStep(index: number) {
    if (!plan) return;
    const nextSteps: ApplicationStep[] = plan.steps.map((s, i) =>
      i === index ? { ...s, completed: !s.completed } : s
    );
    setBusy(true);
    setError(null);
    try {
      await api.updatePlanChecklist(token, plan.id, { steps: nextSteps });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update step.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleDoc(index: number) {
    if (!plan) return;
    const nextDocs: DocumentChecklistItem[] = plan.document_checklist.map((d, i) =>
      i === index ? { ...d, ready: !d.ready } : d
    );
    setBusy(true);
    setError(null);
    try {
      await api.updatePlanChecklist(token, plan.id, { document_checklist: nextDocs });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document.');
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      await api.updatePlanChecklist(token, plan.id, { notes });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notes.');
    } finally {
      setBusy(false);
    }
  }

  async function saveApplicationNumber() {
    if (!plan) return;
    setBusy(true);
    setError(null);
    setAppNumberSaved(false);
    try {
      await api.updatePlanChecklist(token, plan.id, {
        application_number: applicationNumber.trim(),
      });
      setAppNumberSaved(true);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save application number.');
    } finally {
      setBusy(false);
    }
  }

  async function handleStageChange(nextStage: ApplicationStage) {
    if (!plan) return;
    if (
      (nextStage === 'Portal Approved by Student' || nextStage === 'Self-Submitted by Student') &&
      !plan.human_approved_portal_open
    ) {
      setApprovalDialogOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.updatePlanStage(token, plan.id, { application_stage: nextStage });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stage update failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleHumanApprovalSubmit() {
    if (!plan || !approvalConfirmedCheck) return;
    setBusy(true);
    setError(null);
    try {
      await api.updatePlanStage(token, plan.id, {
        application_stage: 'Portal Approved by Student',
        human_approved: true,
      });
      setApprovalDialogOpen(false);
      setApprovalConfirmedCheck(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record human approval.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 dark:bg-slate-950/75 backdrop-blur-xs">
      <div className="relative h-full w-full max-w-4xl overflow-y-auto bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800">
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{scholarship.scheme_type}</span>
              <span aria-hidden="true">·</span>
              <span>{scholarship.portal_name}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Cycle: {scholarship.academic_year}</span>
              {scholarship.is_test_data && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    DEVELOPER SANDBOX TEST RECORD
                  </span>
                </>
              )}
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
              {scholarship.official_name}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleSave}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              {scholarship.is_saved ? (
                <>
                  <BookmarkCheck className="h-4 w-4 text-blue-800 dark:text-blue-400" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" />
                  Save
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close detail view"
              className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          {scholarship.is_test_data && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 p-4 text-sm text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
              <div>
                <p className="font-semibold">Developer Mode Test Output</p>
                <p className="text-xs mt-0.5">
                  This record was generated inside Developer Mode to verify Agent 1 and Agent 2
                  pipeline behavior. Do not treat test outputs as official government notifications.
                </p>
              </div>
            </div>
          )}

          {scholarship.outdated_flag && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 p-4 text-sm text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
              <div>
                <p className="font-semibold">Potentially Outdated Academic Cycle</p>
                <p className="text-xs mt-0.5">
                  {scholarship.outdated_reason ||
                    'Retrieved source references an earlier cycle deadline. Check the official portal for current-year reopening dates.'}
                </p>
              </div>
            </div>
          )}

          {/* Overview Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Benefit / Amount</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {scholarship.benefit_amount_inr}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Opening Date</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {scholarship.opening_date}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Application Deadline</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {scholarship.application_deadline}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Source Verification</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {scholarship.verification_status}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              {t.schemeOverviewTitle}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {scholarship.description}
            </p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {t.benefitsLabel}:{' '}
              </span>
              {scholarship.benefits_summary}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Administering Ministry / Department: {scholarship.provider_ministry} ·{' '}
              {t.lastVerifiedLabel}:{' '}
              <span className="font-mono tabular-nums">
                {new Date(scholarship.last_verified_at).toLocaleString()}
              </span>
            </p>
          </div>

          {/* Agent 2 Deterministic Eligibility Report */}
          {report && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    {t.agent2BreakdownTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Evaluated against structured official conditions and your saved profile.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                      report.outcome === 'Likely Eligible'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : report.outcome === 'Not Eligible'
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {report.outcome === 'Likely Eligible' && <CheckCircle2 className="h-4 w-4" />}
                    {report.outcome === 'Not Eligible' && <XCircle className="h-4 w-4" />}
                    {report.outcome === 'Needs More Information' && (
                      <HelpCircle className="h-4 w-4" />
                    )}
                    {translateOutcome(report.outcome, t)}
                  </span>
                  <button
                    type="button"
                    onClick={handleRecheck}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t.recheckRulesBtn}
                  </button>
                </div>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                {report.explanation_summary}
              </p>

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Condition</th>
                      <th className="py-2.5 px-3 font-semibold">Official Rule</th>
                      <th className="py-2.5 px-3 font-semibold">Your Profile</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {report.rule_checks.map((chk, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {chk.condition}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 tabular-nums">
                          {chk.official_rule}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 tabular-nums">
                          {chk.student_value}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold whitespace-nowrap">
                          <span
                            className={
                              chk.status === 'PASS'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : chk.status === 'FAIL'
                                ? 'text-red-700 dark:text-red-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }
                          >
                            {chk.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {chk.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Personalized Application Plan & Human Approval Gate */}
          {plan && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    {t.appPlanTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ScholarAI prepares your plan only—it never auto-submits applications.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Progress Stage:
                  </label>
                  <select
                    value={plan.application_stage}
                    onChange={(e) => handleStageChange(e.target.value as ApplicationStage)}
                    disabled={busy}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
                  >
                    {STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Application Number / Tracking ID Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor={`detail-app-num-${plan.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <Hash className="h-3.5 w-3.5 text-blue-800 dark:text-blue-400" />
                    {t.applicationNumberLabel}
                  </label>
                  {plan.application_number ? (
                    <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {appNumberSaved ? `${t.appNumberSavedBadge}: ` : ''}
                      {plan.application_number}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t.notEnteredLabel}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id={`detail-app-num-${plan.id}`}
                    type="text"
                    value={applicationNumber}
                    onChange={(e) => {
                      setApplicationNumber(e.target.value);
                      setAppNumberSaved(false);
                    }}
                    maxLength={120}
                    placeholder={t.applicationNumberPlaceholder}
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={saveApplicationNumber}
                    disabled={busy}
                    className="rounded-lg bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 py-2 text-xs font-semibold text-white whitespace-nowrap disabled:opacity-50 cursor-pointer"
                  >
                    {t.saveAppNumberBtn}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    {t.actionPlanHeading}
                  </h4>
                  <div className="space-y-2.5">
                    {plan.steps.map((step, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={step.completed}
                          onChange={() => toggleStep(i)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-800"
                        />
                        <div className="text-xs">
                          <p
                            className={`font-semibold ${
                              step.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {step.step_number}. {step.title}
                          </p>
                          <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    {t.docChecklistHeading}
                  </h4>
                  <div className="space-y-2.5">
                    {plan.document_checklist.map((doc, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={doc.ready}
                          onChange={() => toggleDoc(i)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-800"
                        />
                        <div className="text-xs">
                          <p
                            className={`font-semibold ${
                              doc.ready
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {doc.name}
                          </p>
                          <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                            {doc.mandatory ? 'Mandatory' : 'Conditional'} · {doc.purpose}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Personal Application Notes (Institution Nodal Officer, Bank Seeded Status, Follow-ups)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Record document follow-up notes or nodal officer remarks..."
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={saveNotes}
                    disabled={busy}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </div>

              {/* Explicit Human Approval Gate for External Portal */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {plan.human_approved_portal_open ? (
                      <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {plan.human_approved_portal_open
                          ? t.humanApprovalRecordedTitle
                          : t.humanApprovalRequiredTitle}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {plan.human_approved_portal_open && plan.approved_at
                          ? `Approved by you on ${new Date(plan.approved_at).toLocaleString()}. Proceed to the official government portal to submit manually.`
                          : 'Review your eligibility checks, documents, and deadline above before proceeding to the external government portal.'}
                      </p>
                    </div>
                  </div>

                  {plan.human_approved_portal_open ? (
                    isSafeExternalUrl(portalHref) ? (
                      <a
                        href={portalHref!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white whitespace-nowrap shrink-0"
                      >
                        {t.openOfficialPortalBtn}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        Portal URL: Not verified
                      </span>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => setApprovalDialogOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-600 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {t.reviewApproveBtn}
                    </button>
                  )}
                </div>

                {approvalDialogOpen && (
                  <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Human Confirmation Gate
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      ScholarAI is an advisory discovery and planning system. It has NOT submitted
                      any application on your behalf. Confirm below to unlock the official portal
                      link and record your approval.
                    </p>
                    <label className="mt-3 flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={approvalConfirmedCheck}
                        onChange={(e) => setApprovalConfirmedCheck(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-800"
                      />
                      <span>
                        I have reviewed the eligibility rules, deadlines, and document checklist,
                        and I want to proceed to the official government portal manually.
                      </span>
                    </label>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!approvalConfirmedCheck || busy}
                        onClick={handleHumanApprovalSubmit}
                        className="rounded-lg bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                      >
                        {t.confirmUnlockBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setApprovalDialogOpen(false);
                          setApprovalConfirmedCheck(false);
                        }}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Official Source Evidence Panel */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
              {t.sourceEvidenceTitle}
            </h3>
            {scholarship.sources.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No verified external source links recorded for this item.
              </p>
            ) : (
              <div className="space-y-3">
                {scholarship.sources.map((src) => (
                  <div
                    key={src.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-4 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {src.source_title}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {src.domain_authority}
                        {src.http_reachable === 1 && ' · Reachable'}
                        {src.http_reachable === 0 && ' · Portal check unreachable/timeout'}
                      </span>
                    </div>
                    {src.excerpt && (
                      <p className="mt-1.5 text-slate-600 dark:text-slate-400">{src.excerpt}</p>
                    )}
                    {isSafeExternalUrl(src.source_url) && (
                      <a
                        href={src.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 font-mono text-blue-800 dark:text-blue-400 hover:underline break-all"
                      >
                        {src.source_url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
