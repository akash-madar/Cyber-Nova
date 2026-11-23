import { useEffect, useState } from 'react';
import { api } from './api';
import { AuthView } from './components/AuthView';
import { LandingPage } from './components/LandingPage';
import type { AppTheme } from './components/ThemeSwitcher';
import { Workspace } from './components/Workspace';
import type { AppLanguage } from './i18n';
import type { SystemStatus, User } from './types';

function getInitialTheme(): AppTheme {
  try {
    const saved = window.localStorage.getItem('scholarai_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore storage access issues
  }
  return 'light';
}

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);
  const [view, setView] = useState<'landing' | 'auth' | 'workspace'>('landing');
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    gemini_configured: true,
    database_engine: 'SQLite',
    python_stack_available: true,
    agent_count: 2,
    agents: [],
  });

  const refreshSystemStatus = () => {
    api
      .getSystemStatus()
      .then(setSystemStatus)
      .catch(() => {});
  };

  useEffect(() => {
    refreshSystemStatus();
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem('scholarai_theme', theme);
    } catch {
      // ignore storage access issues
    }
  }, [theme]);

  function handleGetStarted(mode: 'register' | 'login') {
    setAuthMode(mode);
    setView('auth');
  }

  function handleAuthSuccess(newToken: string, loggedInUser: User) {
    setToken(newToken);
    setUser(loggedInUser);
    setView('workspace');
  }

  async function handleLogout() {
    if (token) {
      await api.logout(token).catch(() => {});
    }
    setToken(null);
    setUser(null);
    setView('landing');
  }

  if (view === 'auth') {
    return (
      <AuthView
        initialMode={authMode}
        language={language}
        theme={theme}
        onChangeLanguage={setLanguage}
        onChangeTheme={setTheme}
        onBack={() => setView('landing')}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  if (view === 'workspace' && token && user) {
    return (
      <Workspace
        token={token}
        user={user}
        systemStatus={systemStatus}
        onRefreshSystemStatus={refreshSystemStatus}
        language={language}
        theme={theme}
        onChangeLanguage={setLanguage}
        onChangeTheme={setTheme}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <LandingPage
      language={language}
      theme={theme}
      onChangeLanguage={setLanguage}
      onChangeTheme={setTheme}
      onGetStarted={handleGetStarted}
    />
  );
}
