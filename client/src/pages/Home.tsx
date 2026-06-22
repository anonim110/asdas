import { useState } from 'react';
import { api } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { PostComposer } from '../components/PostComposer';
import { Feed } from '../components/Feed';
import type { Post } from '../types';

type Tab = 'foryou' | 'following';

export function Home() {
  const [tab, setTab] = useState<Tab>('foryou');

  return (
    <div>
      <PageHeader title="Home">
        <div className="flex">
          <TabButton active={tab === 'foryou'} onClick={() => setTab('foryou')} label="For you" />
          <TabButton active={tab === 'following'} onClick={() => setTab('following')} label="Following" />
        </div>
      </PageHeader>

      <div className="card px-4 py-3">
        <PostComposer />
      </div>

      {tab === 'foryou' ? (
        <Feed
          key="foryou"
          queryKey={['feed', 'explore']}
          initialPageParam={0}
          subscribeRealtime
          fetchPage={async (pageParam) => {
            const { data } = await api.get<{ items: Post[]; nextPage: number | null }>('/feed/explore', {
              params: { page: pageParam ?? 0 },
            });
            return { items: data.items, next: data.nextPage };
          }}
          emptyText="No posts yet. Follow people or be the first to post!"
        />
      ) : (
        <Feed
          key="following"
          queryKey={['feed', 'home']}
          subscribeRealtime
          fetchPage={async (pageParam) => {
            const { data } = await api.get<{ items: Post[]; nextCursor: string | null }>('/feed/home', {
              params: { cursor: pageParam },
            });
            return { items: data.items, next: data.nextCursor };
          }}
          emptyText="Posts from people you follow will show up here."
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="relative flex-1 py-4 text-center font-bold transition hover:bg-gray-100 dark:hover:bg-gray-900"
    >
      <span className={active ? '' : 'text-gray-500'}>{label}</span>
      {active && <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-brand" />}
    </button>
  );
}
