import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import { compactNumber } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { Feed } from '../components/Feed';
import type { Post, Trend } from '../types';

export function Explore() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: async () => (await api.get<{ trends: Trend[] }>('/trends')).data.trends,
  });

  return (
    <div>
      <PageHeader title="Explore">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
          }}
          className="px-4 pb-3"
        >
          <div className="search-field">
            <Search size={18} className="text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Murmur"
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
            />
          </div>
        </form>
      </PageHeader>

      {!!trends?.length && (
        <div className="card">
          <h2 className="px-4 pb-1 pt-3 text-xl font-extrabold">Trends</h2>
          {trends.map((t) => (
            <Link
              key={t.tag}
              to={`/hashtag/${t.tag}`}
              className="block px-4 py-3 transition duration-200 hover:bg-rose-50 dark:hover:bg-white/[0.04]"
            >
              <p className="font-bold">#{t.tag}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{compactNumber(t.count)} posts</p>
            </Link>
          ))}
        </div>
      )}

      <Feed
        queryKey={['feed', 'explore', 'page']}
        initialPageParam={0}
        fetchPage={async (pageParam) => {
          const { data } = await api.get<{ items: Post[]; nextPage: number | null }>('/feed/explore', {
            params: { page: pageParam ?? 0 },
          });
          return { items: data.items, next: data.nextPage };
        }}
      />
    </div>
  );
}
