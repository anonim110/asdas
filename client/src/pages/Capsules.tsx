import { useQuery } from '@tanstack/react-query';
import { Hourglass } from 'lucide-react';
import { api } from '../lib/api';
import { useT } from '../lib/i18n';
import { PageHeader } from '../components/PageHeader';
import { PostCard } from '../components/PostCard';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import type { Post } from '../types';

// Time-capsule hub: the viewer's own capsules (sealed ones counting down,
// opened ones below) plus sealed capsules by others they bookmarked.
// PostCard already renders sealed posts as live-countdown capsules.
export function Capsules() {
  const t = useT();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['capsules'],
    queryFn: async () => (await api.get<{ mine: Post[]; watching: Post[] }>('/posts/capsules')).data,
  });

  const sealedMine = (data?.mine ?? []).filter((p) => p.locked);
  const openedMine = (data?.mine ?? []).filter((p) => !p.locked);
  const watching = data?.watching ?? [];
  const empty = sealedMine.length === 0 && openedMine.length === 0 && watching.length === 0;

  return (
    <div>
      <PageHeader title={t('navCapsules')} />
      {isLoading ? (
        <Spinner />
      ) : empty ? (
        <EmptyState icon={Hourglass} title={t('capsulesEmpty')} subtitle={t('capsulesEmptySub')} />
      ) : (
        <>
          {sealedMine.length > 0 && (
            <Section label={t('capsulesPending')}>
              {sealedMine.map((p, i) => (
                <PostCard key={p.id} post={p} index={i} onDeleted={() => refetch()} />
              ))}
            </Section>
          )}
          {watching.length > 0 && (
            <Section label={t('capsulesWatching')}>
              {watching.map((p, i) => (
                <PostCard key={p.id} post={p} index={i} />
              ))}
            </Section>
          )}
          {openedMine.length > 0 && (
            <Section label={t('capsulesOpenedSection')}>
              {openedMine.map((p, i) => (
                <PostCard key={p.id} post={p} index={i} onDeleted={() => refetch()} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-2">
      <h2 className="mx-4 mb-2 mt-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Hourglass size={14} /> {label}
      </h2>
      {children}
    </section>
  );
}
