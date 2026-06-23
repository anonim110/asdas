import { Link } from 'react-router-dom';
import { usePresence } from '../store/presence';
import type { UserSummary } from '../types';

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-32 w-32 border-4 border-white dark:border-black',
};

const dotSizes = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
  xl: 'h-6 w-6',
};

interface Props {
  user: Pick<UserSummary, 'username' | 'displayName' | 'avatarUrl'> & { id?: string };
  size?: keyof typeof sizes;
  linkable?: boolean;
  showPresence?: boolean;
}

export function Avatar({ user, size = 'md', linkable = true, showPresence }: Props) {
  const online = usePresence((s) => (user.id ? s.online[user.id] : false));
  const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase();
  const avatar = user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={user.displayName}
      loading="lazy"
      decoding="async"
      className={`${sizes[size]} rounded-full bg-slate-200 object-cover ring-2 ring-white dark:bg-slate-800 dark:ring-[#07080f]`}
    />
  ) : (
    <div
      aria-label={user.displayName}
      className={`${sizes[size]} flex select-none items-center justify-center rounded-full bg-gradient-to-br from-brand via-brand-soft to-accent font-bold text-white ring-2 ring-white dark:ring-[#07080f]`}
    >
      {initial}
    </div>
  );

  const content = (
    <div className="relative shrink-0">
      {avatar}
      {showPresence && online && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2 border-white bg-green-500 dark:border-black`}
          title="Online"
        />
      )}
    </div>
  );

  if (!linkable) return content;
  return (
    <Link to={`/${user.username}`} onClick={(e) => e.stopPropagation()} className="shrink-0">
      {content}
    </Link>
  );
}
