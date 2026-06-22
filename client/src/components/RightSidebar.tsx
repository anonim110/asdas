import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import { compactNumber } from '../lib/format';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';
import type { Trend, UserSummary } from '../types';

export function RightSidebar() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: async () => (await api.get<{ trends: Trend[] }>('/trends')).data.trends,
    staleTime: 60_000,
  });

  const { data: suggestions } = useQuery({
    queryKey: ['suggestions'],
    queryFn: async () => (await api.get<{ users: UserSummary[] }>('/users/suggestions')).data.users,
    staleTime: 60_000,
  });

  return (
    <aside className="sticky top-0 hidden h-screen w-[350px] shrink-0 space-y-4 overflow-y-auto px-6 py-3 lg:block">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        className="sticky top-0 z-10 bg-white py-1 dark:bg-black"
      >
        <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2.5 transition focus-within:ring-2 focus-within:ring-brand/40 dark:bg-gray-900">
          <Search size={18} className="text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent outline-none"
          />
        </div>
      </form>

      {!!suggestions?.length && (
        <div className="overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-900/60">
          <h2 className="px-4 py-3 text-xl font-extrabold">Who to follow</h2>
          {suggestions.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-100 dark:hover:bg-gray-800">
              <Avatar user={u} size="sm" />
              <Link to={`/${u.username}`} className="min-w-0 flex-1">
                <p className="truncate font-bold leading-tight">{u.displayName}</p>
                <p className="truncate text-sm text-gray-500">@{u.username}</p>
              </Link>
              <FollowButton username={u.username} initialFollowing={!!u.isFollowing} small />
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-900/60">
        <h2 className="px-4 py-3 text-xl font-extrabold">Trends for you</h2>
        {!trends?.length && <p className="px-4 pb-4 text-sm text-gray-500">No trends yet — start posting with #hashtags.</p>}
        {trends?.map((t) => (
          <Link
            key={t.tag}
            to={`/hashtag/${t.tag}`}
            className="block px-4 py-3 transition hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <p className="text-xs text-gray-500">Trending</p>
            <p className="font-bold">#{t.tag}</p>
            <p className="text-xs text-gray-500">{compactNumber(t.count)} posts</p>
          </Link>
        ))}
      </div>

      <p className="px-4 text-xs text-gray-500">Murmur · where the world thinks out loud.</p>
    </aside>
  );
}
