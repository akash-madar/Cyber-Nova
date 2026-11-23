import { Moon, Sun } from 'lucide-react';
import { TRANSLATIONS, type AppLanguage } from '../i18n';

export type AppTheme = 'light' | 'dark';

interface ThemeSwitcherProps {
  theme: AppTheme;
  language: AppLanguage;
  onChange: (theme: AppTheme) => void;
  compact?: boolean;
}

export function ThemeSwitcher({
  theme,
  language,
  onChange,
  compact = false,
}: ThemeSwitcherProps) {
  const t = TRANSLATIONS[language];

  return (
    <div
      role="group"
      aria-label={t.themeLabel}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1"
    >
      <button
        type="button"
        onClick={() => onChange('light')}
        aria-pressed={theme === 'light'}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
        }`}
      >
        <Sun className="h-3.5 w-3.5 shrink-0" />
        {!compact && <span>{t.themeLight}</span>}
      </button>
      <button
        type="button"
        onClick={() => onChange('dark')}
        aria-pressed={theme === 'dark'}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          theme === 'dark'
            ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
        }`}
      >
        <Moon className="h-3.5 w-3.5 shrink-0" />
        {!compact && <span>{t.themeDark}</span>}
      </button>
    </div>
  );
}
