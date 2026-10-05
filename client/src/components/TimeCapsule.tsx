import { useEffect, useState } from 'react';
import { Hourglass, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { t, useLocale } from '../lib/i18n';
import type { Post } from '../types';

// Sealed time-capsule body shown in place of a post's content until its
// unlockAt moment. Polls a countdown; once it hits zero, refetches the post.
export function TimeCapsule({ post, onUnsealed }: { post: Post; onUnsealed: (fresh: Post) => void }) {
  useLocale((s) => s.locale);
  const unlockAt = new Date(post.unlockAt!).getTime();
  const [remaining, setRemaining] = useState(() => unlockAt - Date.now());
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setRemaining(unlockAt - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [unlockAt]);

  useEffect(() => {
    if (remaining > 0 || opening) return;
    setOpening(true);
    let cancelled = false;
    let attempt = 0;
    // Single mutable slot for "whichever timeout is currently pending" —
    // the cleanup below always clears the latest one, so nothing is ever
    // left to fire after unmount. Retries with backoff (capped at 8s)
    // instead of giving up: the opening worker polls every 30s, so a
    // capsule can briefly still read as locked right after its countdown
    // hits zero — giving up would leave the card stuck on "opening" forever.
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function open() {
      attempt += 1;
      try {
        const { data } = await api.get<{ post: Post }>(`/posts/${post.id}`);
        if (cancelled) return;
        if (data.post.locked) {
          timer = setTimeout(open, Math.min(2000 + attempt * 500, 8000));
          return;
        }
        onUnsealed(data.post);
      } catch {
        if (!cancelled) timer = setTimeout(open, Math.min(2000 + attempt * 500, 8000));
      }
    }
    // Small initial delay so the server clock is definitely past unlockAt.
    timer = setTimeout(open, 1200);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
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
    <div className="mt-2 rounded-2xl border border-violet-300/50 bg-violet-50/60 p-5 text-center dark:border-violet-400/25 dark:bg-violet-500/5">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 text-white">
        <Lock size={20} />
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-violet-700 dark:text-violet-300">
        <Hourglass size={14} /> {t('capsuleTitle')}
      </p>

      {opening ? (
        <p className="mt-1 text-lg font-extrabold">{t('capsuleOpening')}</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight">{formatRemaining(remaining)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('capsuleOpensAt')} {openDate}
          </p>
        </>
      )}
    </div>
  );
}

// "12d 5h 03m 12s" — drops leading zero units.
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
