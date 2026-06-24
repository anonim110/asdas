import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import { compactNumber } from '../lib/format';
import { Avatar } from './Avatar';
import { FollowButton } from './FollowButton';
import { UserName } from './UserName';
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
    <aside className="sticky top-0 hidden h-screen w-[360px] shrink-0 space-y-4 overflow-y-auto px-6 py-4 lg:block">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        className="sticky top-0 z-10 pb-2"
      >
        <div className="search-field">
          <Search size={18} className="text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
          />
        </div>
      </form>

      {!!suggestions?.length && (
        <div className="panel overflow-hidden">
          <h2 className="px-4 py-3 text-xl font-extrabold">Who to follow</h2>
          {suggestions.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 transition duration-200 hover:bg-rose-50 dark:hover:bg-white/[0.06]">
              <Avatar user={u} size="sm" />
              <Link to={`/${u.username}`} className="min-w-0 flex-1">
                <UserName user={u} className="max-w-full leading-tight" compact />
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">@{u.username}</p>
              </Link>
              <FollowButton username={u.username} initialFollowing={!!u.isFollowing} small />
            </div>
          ))}
        </div>
      )}

      <div className="panel overflow-hidden">
        <h2 className="px-4 py-3 text-xl font-extrabold">Trends for you</h2>
        {!trends?.length && (
          <p className="px-4 pb-4 text-sm text-slate-500 dark:text-slate-400">
            No trends yet - start posting with #hashtags.
          </p>
        )}
        {trends?.map((t) => (
          <Link
            key={t.tag}
            to={`/hashtag/${t.tag}`}
            className="block px-4 py-3 transition duration-200 hover:bg-rose-50 dark:hover:bg-white/[0.06]"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Trending</p>
            <p className="font-bold">#{t.tag}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{compactNumber(t.count)} posts</p>
          </Link>
        ))}
      </div>

      <p className="px-4 text-xs font-medium text-slate-500 dark:text-slate-400">
        Murmur - where the world thinks out loud.
      </p>
    </aside>
  );
}
