import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Star } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useT } from '../lib/i18n';

type RatingSummary = {
  mine: { score: number; comment: string | null; updatedAt: string } | null;
  average: number | null;
  count: number;
};

// "Rate the site" card (Settings): a 1-10 slider with a face above the
// thumb that morphs from sad to happy. Stored per-user on the server.
export function SiteRatingCard() {
  const tr = useT();
  const queryClient = useQueryClient();

  const [score, setScore] = useState(8);
  const [comment, setComment] = useState('');
  const [seeded, setSeeded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { data } = useQuery({
    queryKey: ['site-rating'],
    queryFn: async () => (await api.get<RatingSummary>('/feedback/site-rating')).data,
  });

  useEffect(() => {
    if (!seeded && data?.mine) {
      setScore(data.mine.score);
      setComment(data.mine.comment ?? '');
      setSeeded(true);
    }
  }, [data, seeded]);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const { data: summary } = await api.post<RatingSummary>('/feedback/site-rating', {
        score,
        comment: comment.trim() || undefined,
      });
      queryClient.setQueryData(['site-rating'], summary);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(errorMessage(err, 'Could not save your rating'));
    } finally {
      setBusy(false);
    }
  }

  const moodKey =
    score <= 2
      ? ('rateMood1' as const)
      : score <= 4
        ? ('rateMood2' as const)
        : score <= 6
          ? ('rateMood3' as const)
          : score <= 8
            ? ('rateMood4' as const)
            : ('rateMood5' as const);

  // Horizontal position of the face, matching the slider thumb centre (28px thumb).
  const pct = ((score - 1) / 9) * 100;

  return (
    <section className="card overflow-hidden p-4">
      <h2 className="mb-1 text-lg font-bold">{tr('rateSiteTitle')}</h2>
      <p className="mb-2 text-sm text-gray-500">{tr('rateSiteDesc')}</p>

      <div className="relative mx-1 h-20">
        <div
          className="absolute bottom-0"
          style={{ left: `calc(${pct}% + ${(0.5 - pct / 100) * 28}px)`, transform: 'translateX(-50%)' }}
        >
          <EmojiFace score={score} />
        </div>
      </div>

      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={score}
        onChange={(e) => setScore(Number(e.target.value))}
        className="rating-slider"
        aria-label={tr('rateSiteTitle')}
      />

      <div className="mt-2 flex items-baseline justify-between">
        <p className="text-sm font-bold" aria-live="polite">
          {score}/10 · {tr(moodKey)}
        </p>
        {data?.average != null && data.count > 0 && (
          <p className="flex items-center gap-1 text-xs text-gray-500">
            <Star size={12} className="text-amber-400" fill="currentColor" />
            {tr('rateSiteAvg')}: {data.average}/10 · {data.count}
          </p>
        )}
      </div>

      <textarea
        className="input mt-3 resize-none"
        rows={2}
        maxLength={500}
        placeholder={tr('rateSiteCommentPh')}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-3 flex items-center gap-3">
        <button onClick={submit} disabled={busy} className="btn-primary">
          {busy && <Loader2 size={16} className="animate-spin" />}
          {busy ? tr('rateSiteSaving') : tr('rateSiteSubmit')}
        </button>
        {saved && <span className="text-sm font-bold text-green-600 dark:text-green-400">{tr('rateSiteThanks')}</span>}
      </div>
    </section>
  );
}

// SVG smiley whose expression (mouth curve + eyes) follows the score.
function EmojiFace({ score }: { score: number }) {
  const sob = score <= 3;
  const sad = score > 3 && score <= 4;
  const meh = score > 4 && score <= 6;
  const happy = score >= 7;

  // Mouth curvature: -1 (deep frown) … +1 (wide smile).
  const t = (score - 5.5) / 4.5;
  const endY = 63 - t * 6;
  const ctrlY = 63 + t * 16;
  const mouth = `M31 ${endY} Q48 ${ctrlY} 65 ${endY}`;

  return (
    <svg width="72" height="72" viewBox="0 0 96 96" aria-hidden>
      <circle cx="48" cy="50" r="42" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2.5" />

      <g stroke="#78350f" strokeWidth="5" strokeLinecap="round" fill="none">
        {happy && (
          <>
            <path d="M25 41 Q32 32 39 41" />
            <path d="M57 41 Q64 32 71 41" />
          </>
        )}
        {meh && (
          <g fill="#78350f" stroke="none">
            <circle cx="32" cy="39" r="4.5" />
            <circle cx="64" cy="39" r="4.5" />
          </g>
        )}
        {(sad || sob) && (
          <>
            <path d="M25 27 L38 32" strokeWidth="4" />
            <path d="M71 27 L58 32" strokeWidth="4" />
            {sob ? (
              <>
                <path d="M25 40 Q32 47 39 40" />
                <path d="M57 40 Q64 47 71 40" />
              </>
            ) : (
              <g fill="#78350f" stroke="none">
                <circle cx="32" cy="41" r="4.5" />
                <circle cx="64" cy="41" r="4.5" />
              </g>
            )}
          </>
        )}
      </g>

      {sob && (
        <g fill="#38bdf8">
          <path d="M32 48 C29 53 29 56 32 58 C35 56 35 53 32 48 Z" />
          <path d="M64 48 C61 53 61 56 64 58 C67 56 67 53 64 48 Z" />
        </g>
      )}

      <path d={mouth} stroke="#78350f" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
