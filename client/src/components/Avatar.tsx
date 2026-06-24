import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePresence } from '../store/presence';
import { getAvatarTheme, getUsernameInitial } from '../lib/avatar';
import type { UserSummary } from '../types';

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-28 w-28 border-4 border-white sm:h-32 sm:w-32 dark:border-black',
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
  const [imageFailed, setImageFailed] = useState(false);
  const initial = getUsernameInitial(user.username);
  const theme = getAvatarTheme(user.username);

  useEffect(() => setImageFailed(false), [user.avatarUrl]);

  const avatar = user.avatarUrl && !imageFailed ? (
    <img
      src={user.avatarUrl}
      alt={user.displayName}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setImageFailed(true)}
      className={`${sizes[size]} animate-avatar-reveal rounded-full bg-slate-200 object-cover ring-2 ring-white shadow-sm dark:bg-slate-800 dark:ring-[#07080f]`}
    />
  ) : (
    <div
      role="img"
      aria-label={`${user.displayName} avatar`}
      title={`@${user.username}`}
      className={`${sizes[size]} flex select-none items-center justify-center rounded-full bg-gradient-to-br ${theme.avatar} font-black text-white shadow-sm ring-2 ring-white [text-shadow:0_1px_2px_rgb(0_0_0/0.25)] dark:ring-[#07080f]`}
    >
      {initial}
    </div>
  );

  const content = (
    <div className="relative shrink-0">
      {avatar}
      {showPresence && online && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2 border-white bg-emerald-500 shadow-sm dark:border-black`}
          title="Online"
          aria-label="Online"
        />
      )}
    </div>
  );

  if (!linkable) return content;
  return (
    <Link
      to={`/${user.username}`}
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 rounded-full transition duration-200 hover:brightness-105 active:scale-95"
    >
      {content}
    </Link>
  );
}
