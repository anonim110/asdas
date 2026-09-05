import { useState } from 'react';
import { useT } from '../lib/i18n';
import { api } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { PostComposer } from '../components/PostComposer';
import { Feed } from '../components/Feed';
import type { Post } from '../types';

type Tab = 'foryou' | 'following';

export function Home() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('foryou');

  return (
    <div>
      <PageHeader title={t('navHome')}>
        <div className="flex gap-6 px-4">
          <TabButton active={tab === 'foryou'} onClick={() => setTab('foryou')} label={t('forYou')} />
          <TabButton active={tab === 'following'} onClick={() => setTab('following')} label={t('followingTab')} />
        </div>
      </PageHeader>

      <section className="border-b border-stone-300 bg-[#f7f4ec] px-4 py-4 dark:border-white/10 dark:bg-[#151512]">
        <PostComposer />
      </section>

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
          emptyText={t('emptyExplore')}
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
          emptyText={t('emptyHome')}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative py-3 text-sm font-extrabold uppercase tracking-[0.08em] transition-colors ${
        active
          ? 'text-stone-950 dark:text-stone-50'
          : 'text-stone-500 hover:text-stone-900 dark:text-stone-500 dark:hover:text-stone-200'
      }`}
    >
      {label}
      {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" />}
    </button>
  );
}
