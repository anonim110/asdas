import { Gamepad2 } from 'lucide-react';

// Small gamer-styled "playing now" chip, shown next to a user wherever they
// appear (profile, chat header, feed). Renders nothing when no status is set.
export function GameStatus({
  status,
  className = '',
}: {
  status?: string | null;
  className?: string;
}) {
  if (!status) return null;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300 ${className}`}
      title={`Playing ${status}`}
    >
      <Gamepad2 size={12} className="shrink-0" />
      <span className="truncate">{status}</span>
    </span>
  );
}
