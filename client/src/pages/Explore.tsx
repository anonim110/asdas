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
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 dark:bg-gray-900">
            <Search size={18} className="text-gray-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Chirp"
              className="w-full bg-transparent outline-none"
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
              className="block px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-950"
            >
              <p className="font-bold">#{t.tag}</p>
              <p className="text-xs text-gray-500">{compactNumber(t.count)} posts</p>
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
