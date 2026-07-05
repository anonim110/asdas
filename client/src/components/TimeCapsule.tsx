import { useEffect, useState } from 'react';
import { Hourglass, Lock, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { t, useLocale } from '../lib/i18n';
import type { Post } from '../types';

// Sealed time-capsule body shown in place of a post's content until its
// unlockAt moment. Runs a live countdown; when it hits zero the capsule
// plays an opening animation and refetches the (now unsealed) post.
export function TimeCapsule({ post, onUnsealed }: { post: Post; onUnsealed: (fresh: Post) => void }) {
  useLocale((s) => s.locale);
  const unlockAt = new Date(post.unlockAt!).getTime();
  const [remaining, setRemaining] = useState(() => unlockAt - Date.now());
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setRemaining(unlockAt - Date.now()), 500);
    return () => clearInterval(timer);
  }, [unlockAt]);

  // Countdown finished: burst open, then fetch the unsealed post (small
  // delay so the server clock is definitely past unlockAt).
  useEffect(() => {
    if (remaining > 0 || opening) return;
    setOpening(true);
    let cancelled = false;
    let attempt = 0;
    async function open() {
      attempt += 1;
      try {
        const { data } = await api.get<{ post: Post }>(`/posts/${post.id}`);
        if (cancelled) return;
        if (data.post.locked && attempt < 5) {
          setTimeout(open, 1500);
          return;
        }
        onUnsealed(data.post);
      } catch {
        if (!cancelled && attempt < 5) setTimeout(open, 2000);
      }
    }
    const kick = setTimeout(open, 1200);
    return () => {
      cancelled = true;
      clearTimeout(kick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0]);

  const openDate = new Date(unlockAt).toLocaleString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`capsule-shimmer relative mt-2 overflow-hidden rounded-2xl border border-violet-300/50 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-cyan-400/15 p-5 text-center dark:border-violet-400/25 ${
        opening ? 'capsule-open' : ''
      }`}
    >
      <div className="capsule-float mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/40">
        {opening ? <Sparkles size={26} /> : <Lock size={24} />}
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-violet-700 dark:text-violet-300">
        <Hourglass size={14} /> {t('capsuleTitle')}
      </p>

      {opening ? (
        <p className="mt-1 animate-pulse text-lg font-extrabold">{t('capsuleOpening')}</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight" aria-live="off">
            {formatRemaining(remaining)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('capsuleOpensAt')} {openDate}
          </p>
        </>
      )}
    </div>
  );
}

// "12д 5ч 03м 12с" — compact per-locale countdown; drops leading zero units.
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}${t('uDay')}`);
  if (d > 0 || h > 0) parts.push(`${h}${t('uHour')}`);
  parts.push(`${m}${t('uMin')}`);
  parts.push(`${s}${t('uSec')}`);
  return parts.join(' ');
}
