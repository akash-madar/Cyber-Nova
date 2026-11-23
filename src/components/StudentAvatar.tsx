import { useEffect, useState } from 'react';

interface StudentAvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
}

function isRenderableAvatarSrc(src?: string): boolean {
  if (!src) return false;
  if (src.startsWith('data:image/png;base64,')) return true;
  if (src.startsWith('data:image/jpeg;base64,')) return true;
  if (src.startsWith('data:image/jpg;base64,')) return true;
  if (src.startsWith('data:image/webp;base64,')) return true;
  if (src.startsWith('data:image/gif;base64,')) return true;
  try {
    const parsed = new URL(src);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function StudentAvatar({ name, src, size = 'sm' }: StudentAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'S';

  const dimClass =
    size === 'lg'
      ? 'h-20 w-20 text-xl'
      : size === 'md'
      ? 'h-10 w-10 text-sm'
      : 'h-8 w-8 text-xs';

  const canRenderImg = !failed && isRenderableAvatarSrc(src);

  if (canRenderImg) {
    return (
      <img
        src={src}
        alt={`${name || 'Student'} profile photo`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${dimClass} rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800`}
      />
    );
  }

  return (
    <div
      aria-label={`${name || 'Student'} initials`}
      className={`${dimClass} rounded-full bg-blue-800 dark:bg-blue-700 text-white font-display font-semibold flex items-center justify-center shrink-0 select-none border border-blue-900/10 dark:border-blue-500/30`}
    >
      {initials}
    </div>
  );
}
