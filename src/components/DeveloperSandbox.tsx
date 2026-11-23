import { useState, type FormEvent } from 'react';
import { AlertTriangle, FlaskConical, Play, Terminal } from 'lucide-react';
import { api } from '../api';
import { TRANSLATIONS, type AppLanguage } from '../i18n';
import type { StudentProfile } from '../types';

interface DeveloperSandboxProps {
  token: string;
  profile: StudentProfile;
  geminiConfigured: boolean;
  language: AppLanguage;
  onTaskStarted: (taskId: string) => void;
}

const PRESET_SCENARIOS = [
  {
    name: 'Karnataka OBC Engineering Student (SSP & NSP)',
    prompt:
      'Find official Karnataka SSP Post-Matric and Central NSP AICTE scholarships for an OBC Undergraduate B.E. Engineering student in Karnataka.',
    profile: {
      state: 'Karnataka',
      category: 'OBC',
      education_level: 'Undergraduate (UG)',
      course: 'B.E. Computer Science',
      annual_family_income: 180000,
      previous_percentage: 82,
      gender: 'Female',
    },
  },
  {
    name: 'SC Post-Matric Central Sector Check',
    prompt:
      'Research Post Matric Scholarship for SC Students on scholarships.gov.in including income ceiling and required documents.',
    profile: {
      state: 'Maharashtra',
      category: 'SC',
      education_level: 'Undergraduate (UG)',
      course: 'B.Sc Physics',
      annual_family_income: 240000,
      previous_percentage: 74,
      gender: 'Male',
    },
  },
  {
    name: 'Incomplete Profile Boundary Check (Missing Income)',
    prompt:
      'Search National Means-cum-Merit Scholarship or NSP Central Sector Scheme of Scholarship for College and University Students.',
    profile: {
      state: 'Delhi',
      category: 'General',
      education_level: 'Undergraduate (UG)',
      course: 'B.Com',
      annual_family_income: null,
      previous_percentage: 85,
      gender: 'Female',
    },
  },
];

export function DeveloperSandbox({
  token,
  profile,
  geminiConfigured,
  language,
  onTaskStarted,
}: DeveloperSandboxProps) {
  const t = TRANSLATIONS[language];
  const [scenarioName, setScenarioName] = useState(PRESET_SCENARIOS[0].name);
  const [customPrompt, setCustomPrompt] = useState(PRESET_SCENARIOS[0].prompt);
  const [stateVal, setStateVal] = useState(PRESET_SCENARIOS[0].profile.state);
  const [categoryVal, setCategoryVal] = useState(PRESET_SCENARIOS[0].profile.category);
  const [eduVal, setEduVal] = useState(PRESET_SCENARIOS[0].profile.education_level);
  const [courseVal, setCourseVal] = useState(PRESET_SCENARIOS[0].profile.course);
  const [incomeVal, setIncomeVal] = useState<string>(
    String(PRESET_SCENARIOS[0].profile.annual_family_income ?? '')
  );
  const [pctVal, setPctVal] = useState<string>(
    String(PRESET_SCENARIOS[0].profile.previous_percentage ?? '')
  );
  const [genderVal, setGenderVal] = useState(PRESET_SCENARIOS[0].profile.gender);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadPreset(idx: number) {
    const p = PRESET_SCENARIOS[idx];
    setScenarioName(p.name);
    setCustomPrompt(p.prompt);
    setStateVal(p.profile.state);
    setCategoryVal(p.profile.category);
    setEduVal(p.profile.education_level);
    setCourseVal(p.profile.course);
    setIncomeVal(p.profile.annual_family_income !== null ? String(p.profile.annual_family_income) : '');
    setPctVal(p.profile.previous_percentage !== null ? String(p.profile.previous_percentage) : '');
    setGenderVal(p.profile.gender);
  }

  async function handleRun(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.runDeveloperTest(token, {
        scenario_name: scenarioName,
        custom_prompt: customPrompt,
        language,
        test_profile: {
          ...profile,
          state: stateVal,
          category: categoryVal,
          education_level: eduVal,
          course: courseVal,
          annual_family_income: incomeVal.trim() === '' ? null : Number(incomeVal),
          previous_percentage: pctVal.trim() === '' ? null : Number(pctVal),
          gender: genderVal,
        },
      });
      onTaskStarted(res.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start developer test run.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none';
  const labelCls = 'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          {t.devSandboxTitle}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.devSandboxSub}</p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
        <div>
          <p className="font-semibold">TEST SANDBOX ISOLATION NOTICE</p>
          <p className="text-xs mt-0.5">
            Every record created here is tagged <code className="font-mono">is_test_data = true</code>{' '}
            and clearly labelled in the Discovery list only when &ldquo;Include Developer Test
            Records&rdquo; is toggled on.
          </p>
        </div>
      </div>

      {!geminiConfigured && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300">
          GEMINI_API_KEY is not configured in environment secrets. Set it before running Agent 1 &amp;
          Agent 2 tests.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
            Load Hackathon Test Preset:
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_SCENARIOS.map((preset, idx) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => loadPreset(idx)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleRun}
          className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Test Scenario Label</label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Test State</label>
              <input
                type="text"
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Test Category</label>
              <input
                type="text"
                value={categoryVal}
                onChange={(e) => setCategoryVal(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Test Education Level</label>
              <input
                type="text"
                value={eduVal}
                onChange={(e) => setEduVal(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Test Course</label>
              <input
                type="text"
                value={courseVal}
                onChange={(e) => setCourseVal(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                Test Annual Income (INR, leave blank to test Missing Info)
              </label>
              <input
                type="number"
                value={incomeVal}
                onChange={(e) => setIncomeVal(e.target.value)}
                placeholder="Blank = Missing"
                className={`${inputCls} tabular-nums`}
              />
            </div>
            <div>
              <label className={labelCls}>Test Previous %</label>
              <input
                type="number"
                value={pctVal}
                onChange={(e) => setPctVal(e.target.value)}
                className={`${inputCls} tabular-nums`}
              />
            </div>
            <div>
              <label className={labelCls}>Test Gender</label>
              <input
                type="text"
                value={genderVal}
                onChange={(e) => setGenderVal(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Agent 1 Grounded Test Prompt</label>
            <textarea
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !geminiConfigured}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
          >
            <FlaskConical className="h-4 w-4" />
            <Play className="h-3.5 w-3.5" />
            {loading ? t.pleaseWait : t.runSandboxBtn}
          </button>
        </form>
      </div>

      {/* Local Python (FastAPI + Streamlit + MySQL) Reference Panel */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="h-4 w-4 text-blue-800 dark:text-blue-400" />
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Local Windows VS Code Python Stack (FastAPI + Streamlit + MySQL)
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          The complete Python architecture requested for local Windows &amp; MySQL deployment is
          bundled in the{' '}
          <code className="font-mono text-slate-900 dark:text-slate-100">/python_app</code>{' '}
          directory alongside this live web preview:
        </p>
        <div className="mt-3 rounded-lg bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-200 overflow-x-auto space-y-1">
          <p>cd python_app</p>
          <p>python -m venv .venv &amp;&amp; .venv\Scripts\activate</p>
          <p>pip install -r requirements.txt</p>
          <p>python database\init_db.py</p>
          <p>uvicorn backend.main:app --reload --port 8000</p>
          <p>streamlit run frontend/app.py</p>
        </div>
      </div>
    </div>
  );
}
