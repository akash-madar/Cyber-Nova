import { Globe } from 'lucide-react';
import { LANGUAGE_OPTIONS, type AppLanguage } from '../i18n';

interface LanguageSwitcherProps {
  language: AppLanguage;
  onChange: (lang: AppLanguage) => void;
  compact?: boolean;
}

export function LanguageSwitcher({ language, onChange, compact = false }: LanguageSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Language selection"
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1"
    >
      {!compact && (
        <Globe className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 ml-1.5 mr-0.5 shrink-0" />
      )}
      {LANGUAGE_OPTIONS.map((opt) => {
        const active = language === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => onChange(opt.code)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              active
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            {opt.nativeLabel}
          </button>
        );
      })}
    </div>
  );
}
