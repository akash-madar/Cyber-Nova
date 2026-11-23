import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  FileCheck2,
  Globe,
  ShieldCheck,
} from 'lucide-react';
import { TRANSLATIONS, type AppLanguage } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher, type AppTheme } from './ThemeSwitcher';

interface LandingPageProps {
  language: AppLanguage;
  theme: AppTheme;
  onChangeLanguage: (lang: AppLanguage) => void;
  onChangeTheme: (theme: AppTheme) => void;
  onGetStarted: (mode: 'register' | 'login') => void;
}

export function LandingPage({
  language,
  theme,
  onChangeLanguage,
  onChangeTheme,
  onGetStarted,
}: LandingPageProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [atriumImgFailed, setAtriumImgFailed] = useState(false);
  const t = TRANSLATIONS[language];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            ScholarAI
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#how-it-works"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {t.navHowItWorks}
            </a>
            <a
              href="#two-agents"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {t.navTwoAgents}
            </a>
            <a
              href="#portals"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {t.navPortals}
            </a>
            <a
              href="#safeguards"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {t.navSafeguards}
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onGetStarted('register')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-800 dark:bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.getStarted}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="mx-auto max-w-7xl px-6 pt-10 pb-10 lg:pt-14 lg:pb-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-400">{t.heroKicker}</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <ThemeSwitcher theme={theme} language={language} onChange={onChangeTheme} />
            <LanguageSwitcher language={language} onChange={onChangeLanguage} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <h1
              className="font-display font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15] mb-5"
              style={{
                fontSize: 'clamp(2.1rem, 3.6vw, 3.2rem)',
                textWrap: 'balance',
              }}
            >
              {t.heroTitle}
            </h1>
            <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300 max-w-xl mb-8">
              {t.heroSubtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onGetStarted('register')}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-800 dark:bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-900 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.getStarted}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onGetStarted('login')}
                className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.signInWorkspace}
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-900">
              {!heroImgFailed ? (
                <img
                  src="/src/assets/images/hero_campus_library_1795410212961.jpg"
                  alt="Indian university students researching scholarships in a sunlit campus library"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-blue-900 p-8 text-white">
                  <BookOpen className="h-10 w-10 mb-3 text-amber-400" />
                  <p className="font-display text-lg font-semibold text-center">
                    ScholarAI – Your Future, Funded
                  </p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-6 text-white">
                <p className="text-xs font-medium text-amber-300">{t.heroCaptionTitle}</p>
                <p className="mt-1 text-sm text-slate-100">{t.heroCaptionBody}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4-column System Specification Strip */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-6 rounded-xl">
          <div>
            <p className="font-mono text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">
              02
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t.statAgentsTitle}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.statAgentsDesc}
            </p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">
              03
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t.statOutcomesTitle}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.statOutcomesDesc}
            </p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">
              100%
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t.statApprovalTitle}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.statApprovalDesc}
            </p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">
              11
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t.statTablesTitle}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.statTablesDesc}
            </p>
          </div>
        </div>
      </section>

      {/* Two-Agent Architecture Section */}
      <section id="two-agents" className="mx-auto max-w-7xl px-6 py-12">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.twoAgentsHeading}
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            {t.twoAgentsSubheading}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs font-semibold text-blue-800 dark:text-blue-400">
                {t.agent1Label}
              </span>
              <Globe className="h-5 w-5 text-blue-800 dark:text-blue-400" />
            </div>
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {t.agent1Title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t.agent1Body}
            </p>
            <ul className="mt-5 space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-5 text-sm text-slate-700 dark:text-slate-300">
              {t.agent1Bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                {t.agent2Label}
              </span>
              <FileCheck2 className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {t.agent2Title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t.agent2Body}
            </p>
            <ul className="mt-5 space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-5 text-sm text-slate-700 dark:text-slate-300">
              {t.agent2Bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Workflow & Portals Section */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="lg:col-span-5 h-64 lg:h-full min-h-[280px] bg-slate-200 dark:bg-slate-800">
            {!atriumImgFailed ? (
              <img
                src="/src/assets/images/civic_institute_atrium_1795410212207.jpg"
                alt="Modern Indian public academic institute atrium"
                referrerPolicy="no-referrer"
                onError={() => setAtriumImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-800 text-white">
                <Database className="h-10 w-10 text-blue-400" />
              </div>
            )}
          </div>
          <div id="portals" className="lg:col-span-7 p-8 lg:p-10">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              {t.portalsHeading}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.portalsSubheading}
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <p className="font-semibold text-slate-900 dark:text-white">
                  National Scholarship Portal (NSP)
                </p>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
                  scholarships.gov.in
                </p>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Karnataka State Scholarship Portal
                </p>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ssp.postmatric.karnataka.gov.in
                </p>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Central Ministries &amp; AICTE / UGC
                </p>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
                  aicte-india.org · ugc.gov.in
                </p>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <p className="font-semibold text-slate-900 dark:text-white">
                  National Scheme Directory
                </p>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
                  myscheme.gov.in · state portals
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safeguards Section */}
      <section id="safeguards" className="mx-auto max-w-7xl px-6 py-10 pb-16">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-900 p-8 lg:p-10 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-amber-300 text-sm font-medium mb-2">
                <ShieldCheck className="h-4 w-4" />
                {t.safeguardsBadge}
              </div>
              <h2 className="font-display text-2xl font-bold">{t.safeguardsHeading}</h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{t.safeguardsBody}</p>
            </div>
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => onGetStarted('register')}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.createStudentAccount}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-6 py-6 text-xs text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            ScholarAI – Your Future, Funded
          </p>
          <p>{t.footerDisclaimer}</p>
        </div>
      </footer>
    </div>
  );
}
