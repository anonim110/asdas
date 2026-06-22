import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';
import { useAuth } from '../store/auth';
import type { UserSummary } from '../types';

export function UserListItem({ user }: { user: UserSummary }) {
  const me = useAuth((s) => s.user);
  return (
    <Link
      to={`/${user.username}`}
      className="flex items-start gap-3 px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-950"
    >
      <Avatar user={user} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-bold">{user.displayName}</p>
            <p className="truncate text-sm text-gray-500">@{user.username}</p>
          </div>
          {me?.username !== user.username && (
            <FollowButton username={user.username} initialFollowing={!!user.isFollowing} small />
          )}
        </div>
        {user.bio && <p className="mt-1 line-clamp-2 text-sm">{user.bio}</p>}
      </div>
    </Link>
  );
}
