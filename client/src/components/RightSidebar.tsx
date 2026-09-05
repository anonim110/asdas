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
import { useT } from '../lib/i18n';

export function RightSidebar() {
  const t = useT();
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
    <aside className="sticky top-0 hidden h-screen w-[350px] shrink-0 overflow-y-auto bg-[#eeeae0] px-6 py-5 lg:block dark:bg-[#0d0d0b]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        className="sticky top-0 z-10 bg-[#eeeae0] pb-5 dark:bg-[#0d0d0b]"
      >
        <div className="search-field">
          <Search size={17} className="text-stone-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('navSearch')}
            className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-stone-500"
          />
        </div>
      </form>

      {!!suggestions?.length && (
        <section className="border-t-2 border-stone-950 py-4 dark:border-stone-100">
          <h2 className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-stone-500">
            {t('whoToFollow')}
          </h2>
          <div>
            {suggestions.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 border-b border-stone-300 py-3 last:border-b-0 dark:border-white/10"
              >
                <Avatar user={user} size="sm" />
                <Link to={`/${user.username}`} className="min-w-0 flex-1">
                  <UserName user={user} className="max-w-full leading-tight" compact />
                  <p className="truncate text-xs font-semibold text-stone-500">@{user.username}</p>
                </Link>
                <FollowButton username={user.username} initialFollowing={!!user.isFollowing} small />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 border-t-2 border-stone-950 py-4 dark:border-stone-100">
        <h2 className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-stone-500">
          {t('trendsForYou')}
        </h2>

        {!trends?.length && (
          <p className="border-b border-stone-300 pb-4 text-sm leading-5 text-stone-500 dark:border-white/10">
            No trends yet. Posts with hashtags will appear here.
          </p>
        )}

        {trends?.map((trend, index) => (
          <Link
            key={trend.tag}
            to={`/hashtag/${trend.tag}`}
            className="grid grid-cols-[2rem_1fr_auto] items-start gap-2 border-b border-stone-300 py-3 transition-colors hover:text-brand dark:border-white/10"
          >
            <span className="pt-0.5 text-xs font-black tabular-nums text-stone-400">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-black">#{trend.tag}</span>
              <span className="block text-xs font-semibold text-stone-500">Trending</span>
            </span>
            <span className="pt-0.5 text-xs font-semibold tabular-nums text-stone-500">
              {compactNumber(trend.count)}
            </span>
          </Link>
        ))}
      </section>

      <p className="mt-7 border-t border-stone-300 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500 dark:border-white/10">
        Murmur · thoughts in public
      </p>
    </aside>
  );
}
