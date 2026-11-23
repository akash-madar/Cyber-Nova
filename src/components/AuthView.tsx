import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Lock,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { api } from '../api';
import { TRANSLATIONS, type AppLanguage } from '../i18n';
import type { SecurityQuestionItem, SecurityQuestionKey, User } from '../types';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher, type AppTheme } from './ThemeSwitcher';

const ALL_SECURITY_QUESTIONS: SecurityQuestionKey[] = [
  'birth_city',
  'first_school',
  'childhood_nickname',
  'mother_name',
  'favorite_teacher',
  'favorite_pet_or_book',
];

interface AuthViewProps {
  initialMode: 'login' | 'register';
  language: AppLanguage;
  theme: AppTheme;
  onChangeLanguage: (lang: AppLanguage) => void;
  onChangeTheme: (theme: AppTheme) => void;
  onBack: () => void;
  onSuccess: (token: string, user: User) => void;
}

export function AuthView({
  initialMode,
  language,
  theme,
  onChangeLanguage,
  onChangeTheme,
  onBack,
  onSuccess,
}: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [forgotStep, setForgotStep] = useState<'email' | 'answer'>('email');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  // Registration 3 personal security questions & answers
  const [regQuestions, setRegQuestions] = useState<
    [
      { question_key: SecurityQuestionKey; answer: string },
      { question_key: SecurityQuestionKey; answer: string },
      { question_key: SecurityQuestionKey; answer: string },
    ]
  >([
    { question_key: 'birth_city', answer: '' },
    { question_key: 'first_school', answer: '' },
    { question_key: 'mother_name', answer: '' },
  ]);

  // Forgot-password loaded questions & user answers
  const [loadedQuestions, setLoadedQuestions] = useState<SecurityQuestionItem[]>([]);
  const [resetAnswers, setResetAnswers] = useState<Record<string, string>>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const t = TRANSLATIONS[language];

  function updateRegQuestionKey(slotIdx: 0 | 1 | 2, key: SecurityQuestionKey) {
    setRegQuestions((prev) => {
      const next = [...prev] as typeof prev;
      next[slotIdx] = { ...next[slotIdx], question_key: key };
      return next;
    });
  }

  function updateRegAnswer(slotIdx: 0 | 1 | 2, answer: string) {
    setRegQuestions((prev) => {
      const next = [...prev] as typeof prev;
      next[slotIdx] = { ...next[slotIdx], answer };
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'register' && fullName.trim().length < 2) {
      setError('Enter your full name (minimum 2 characters).');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (mode === 'register') {
      const keys = regQuestions.map((q) => q.question_key);
      if (new Set(keys).size !== 3) {
        setError('Please select 3 different personal security questions.');
        return;
      }
      for (let i = 0; i < regQuestions.length; i += 1) {
        const normalized = regQuestions[i].answer.trim().replace(/\s+/g, ' ');
        if (normalized.length < 2) {
          setError(`Please enter an answer (at least 2 characters) for Security Question ${i + 1}.`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const res =
        mode === 'register'
          ? await api.register({
              email: email.trim(),
              full_name: fullName.trim(),
              password,
              security_questions: regQuestions.map((q) => ({
                question_key: q.question_key,
                answer: q.answer.trim(),
              })),
            })
          : await api.login({
              email: email.trim(),
              password,
            });
      onSuccess(res.token, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLookupSecurityQuestions(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.getResetSecurityQuestions({ email: email.trim() });
      setLoadedQuestions(res.questions);
      const blankMap: Record<string, string> = {};
      for (const q of res.questions) {
        blankMap[q.question_key] = '';
      }
      setResetAnswers(blankMap);
      setForgotStep('answer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load security questions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (loadedQuestions.length !== 3) {
      setError('Please load your 3 personal security questions first.');
      return;
    }
    for (const q of loadedQuestions) {
      const ans = (resetAnswers[q.question_key] || '').trim();
      if (ans.length < 2) {
        setError('Please answer all 3 personal security questions.');
        return;
      }
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        email: email.trim(),
        answers: loadedQuestions.map((q) => ({
          question_key: q.question_key,
          answer: (resetAnswers[q.question_key] || '').trim(),
        })),
        new_password: newPassword,
      });
      setLoadedQuestions([]);
      setResetAnswers({});
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      setForgotStep('email');
      setMode('login');
      setStatusMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  }

  const slotLabels = [t.question1Label, t.question2Label, t.question3Label] as const;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center px-4 py-12 transition-colors">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.backHome}
          </button>
          <div className="flex items-center gap-2">
            <ThemeSwitcher theme={theme} language={language} onChange={onChangeTheme} compact />
            <LanguageSwitcher language={language} onChange={onChangeLanguage} compact />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              {mode === 'register'
                ? t.authRegisterTitle
                : mode === 'forgot'
                ? t.forgotPasswordTitle
                : t.authLoginTitle}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
              {mode === 'register'
                ? t.authRegisterSub
                : mode === 'forgot'
                ? t.forgotPasswordSub
                : t.authLoginSub}
            </p>
          </div>

          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setStatusMessage(null);
                }}
                className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.registerTab}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setStatusMessage(null);
                }}
                className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.signInTab}
              </button>
            </div>
          )}

          {statusMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          {mode === 'forgot' ? (
            forgotStep === 'email' ? (
              <form onSubmit={handleLookupSecurityQuestions} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    {t.emailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@university.edu.in"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-800 dark:bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-blue-900 dark:hover:bg-blue-500 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {loading ? t.loadingQuestionsBtn : t.continueResetBtn}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setStatusMessage(null);
                  }}
                  className="w-full text-center text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1 cursor-pointer"
                >
                  {t.backToSignIn}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                  <span className="truncate font-mono">{email.trim()}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('email');
                      setLoadedQuestions([]);
                      setResetAnswers({});
                      setError(null);
                      setStatusMessage(null);
                    }}
                    className="text-blue-800 dark:text-blue-400 font-medium hover:underline shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4">
                  {loadedQuestions.map((q, idx) => (
                    <div key={q.question_key}>
                      <label className="flex items-start gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 mb-1.5">
                        <HelpCircle className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                        <span>
                          {idx + 1}. {t.securityQuestionLabels[q.question_key]}
                        </span>
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        value={resetAnswers[q.question_key] || ''}
                        onChange={(e) =>
                          setResetAnswers((prev) => ({
                            ...prev,
                            [q.question_key]: e.target.value,
                          }))
                        }
                        placeholder={t.answerPlaceholder}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    {t.newPasswordLabel}
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      maxLength={128}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t.passwordHint}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    {t.confirmPasswordLabel}
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      maxLength={128}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t.passwordHint}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-800 dark:bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-blue-900 dark:hover:bg-blue-500 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {loading ? t.pleaseWait : t.resetPasswordBtn}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotStep('email');
                    setMode('login');
                    setError(null);
                    setStatusMessage(null);
                  }}
                  className="w-full text-center text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1 cursor-pointer"
                >
                  {t.backToSignIn}
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    {t.fullNameLabel}
                  </label>
                  <div className="relative">
                    <UserIcon className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ananya Rao"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  {t.emailLabel}
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu.in"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t.passwordLabel}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setForgotStep('email');
                        setError(null);
                        setStatusMessage(null);
                      }}
                      className="text-xs font-medium text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {t.forgotPasswordLink}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordHint}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-800 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h2 className="text-xs font-semibold text-slate-900 dark:text-white">
                        {t.securityQuestionsTitle}
                      </h2>
                      <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                        {t.securityQuestionsSub}
                      </p>
                    </div>
                  </div>

                  {([0, 1, 2] as const).map((slotIdx) => {
                    const currentKey = regQuestions[slotIdx].question_key;
                    const otherSelected = new Set(
                      regQuestions
                        .filter((_, idx) => idx !== slotIdx)
                        .map((item) => item.question_key)
                    );
                    return (
                      <div key={slotIdx} className="space-y-1.5 pt-1">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
                          {slotLabels[slotIdx]}
                        </label>
                        <select
                          value={currentKey}
                          onChange={(e) =>
                            updateRegQuestionKey(slotIdx, e.target.value as SecurityQuestionKey)
                          }
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
                        >
                          {ALL_SECURITY_QUESTIONS.map((qKey) => (
                            <option
                              key={qKey}
                              value={qKey}
                              disabled={otherSelected.has(qKey)}
                            >
                              {t.securityQuestionLabels[qKey]}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={150}
                          value={regQuestions[slotIdx].answer}
                          onChange={(e) => updateRegAnswer(slotIdx, e.target.value)}
                          placeholder={t.answerPlaceholder}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-800/15"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-800 dark:bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-blue-900 dark:hover:bg-blue-500 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {loading
                  ? t.pleaseWait
                  : mode === 'register'
                  ? t.createAndEnter
                  : t.signInBtn}
              </button>
            </form>
          )}

          <p className="mt-5 text-xs text-slate-500 dark:text-slate-400 text-center">
            {t.authSecurityNote}
          </p>
        </div>
      </div>
    </div>
  );
}
