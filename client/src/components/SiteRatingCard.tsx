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

// "Rate the site" card (Settings): a 1-10 slider with a big animated face
// above the thumb. Low scores make it cry (animated tears), high scores make
// it beam and bounce. The rating is stored per-user on the server.
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

  // Pre-fill the slider with the user's previous rating (once).
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

  // Horizontal position of the face, matching the slider thumb centre. The
  // 28px thumb travels inside the track, so the percentage is corrected by
  // half the thumb width at each end.
  const pct = ((score - 1) / 9) * 100;

  return (
    <section className="card overflow-hidden p-4">
      <h2 className="mb-1 text-lg font-bold">{tr('rateSiteTitle')}</h2>
      <p className="mb-2 text-sm text-gray-500">{tr('rateSiteDesc')}</p>

      {/* The face rides along above the slider thumb. */}
      <div className="relative mx-1 h-24">
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
        {saved && (
          <span className="rating-thanks text-sm font-bold text-green-600 dark:text-green-400">
            {tr('rateSiteThanks')} 🎉
          </span>
        )}
      </div>
    </section>
  );
}

// SVG smiley whose expression morphs with the score: crying (animated tears)
// at the bottom of the scale, beaming with sparkles at the top. The mouth
// curve and eye style are interpolated/staged from the 1-10 value.
function EmojiFace({ score }: { score: number }) {
  const sob = score <= 3; // crying: closed eyes + falling tears
  const sad = score > 3 && score <= 4;
  const meh = score > 4 && score <= 6;
  const happy = score >= 7;
  const joy = score >= 9; // beaming: filled grin, sparkles, bounce

  // Mouth curvature: -1 (deep frown) … +1 (wide smile).
  const t = (score - 5.5) / 4.5;
  const endY = 63 - t * 6;
  const ctrlY = 63 + t * 16;
  const mouth = `M31 ${endY} Q48 ${ctrlY} 65 ${endY}`;

  return (
    <svg
      width="84"
      height="84"
      viewBox="0 0 96 96"
      className={sob ? 'face-sob' : joy ? 'face-joy' : undefined}
      aria-hidden
    >
      <defs>
        <radialGradient id="faceGrad" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#ffe680" />
          <stop offset="100%" stopColor="#fbbf24" />
        </radialGradient>
      </defs>

      {/* Sparkles around a delighted face */}
      {joy && (
        <g fill="#facc15" stroke="#f59e0b" strokeWidth="1">
          <path className="sparkle" d="M12 22 L14.5 28 L21 30 L14.5 32 L12 38 L9.5 32 L3 30 L9.5 28 Z" />
          <path className="sparkle" style={{ animationDelay: '0.45s' }} d="M84 14 L86 19 L91 21 L86 23 L84 28 L82 23 L77 21 L82 19 Z" />
          <path className="sparkle" style={{ animationDelay: '0.9s' }} d="M88 52 L89.5 56 L93.5 57.5 L89.5 59 L88 63 L86.5 59 L82.5 57.5 L86.5 56 Z" />
        </g>
      )}

      <circle cx="48" cy="50" r="42" fill="url(#faceGrad)" stroke="#f59e0b" strokeWidth="2.5" />

      {/* Eyes: happy arcs / neutral dots / sad-closed arcs (staged by score) */}
      <g
        stroke="#78350f"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        style={{ transition: 'opacity 0.2s ease' }}
      >
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
            {/* Sad brows */}
            <path d="M25 27 L38 32" strokeWidth="4" />
            <path d="M71 27 L58 32" strokeWidth="4" />
            {sob ? (
              <>
                {/* Eyes squeezed shut */}
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

      {/* Tears while crying */}
      {sob && (
        <g fill="#38bdf8">
          <path className="tear" d="M32 48 C29 53 29 56 32 58 C35 56 35 53 32 48 Z" />
          <path className="tear" style={{ animationDelay: '0.55s' }} d="M64 48 C61 53 61 56 64 58 C67 56 67 53 64 48 Z" />
        </g>
      )}

      {/* Blush on a happy face */}
      {happy && (
        <g fill="#fb7185" opacity="0.45">
          <ellipse cx="22" cy="52" rx="6" ry="4" />
          <ellipse cx="74" cy="52" rx="6" ry="4" />
        </g>
      )}

      {/* Mouth: filled grin at the top of the scale, curved line otherwise */}
      {joy ? (
        <path d="M28 58 Q48 84 68 58 Q48 68 28 58 Z" fill="#78350f" />
      ) : (
        <path d={mouth} stroke="#78350f" strokeWidth="5" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}
