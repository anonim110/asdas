import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useT } from '../lib/i18n';
import type { Post } from '../types';

// Renders a "shared post" DM card. The message content only carries a
// postId (see lib/messageCards.ts) — the author name/handle/excerpt shown
// here are always fetched live from the server, never taken from the
// message itself, since message content is attacker-controlled and an
// embedded author name could otherwise be forged to impersonate anyone.
export function SharedPostCard({ postId, mine, onOpen }: { postId: string; mine: boolean; onOpen: () => void }) {
  const t = useT();
  const { data: post, isLoading } = useQuery({
    queryKey: ['shared-post-preview', postId],
    queryFn: async () => (await api.get<{ post: Post }>(`/posts/${postId}`)).data.post,
    retry: false,
  });

  if (isLoading) {
    return <div className="h-16 w-56 max-w-full animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />;
  }
  if (!post) {
    return <p className="px-2 py-1.5 text-sm italic text-slate-500 dark:text-slate-400">{t('postUnavailable')}</p>;
  }

  return (
    <button type="button" onClick={onOpen} className="block w-56 max-w-full px-2 py-1.5 text-left transition active:scale-[0.98]">
      <p className={`mb-1 text-xs font-semibold ${mine ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'}`}>
        {t('sharedAPost')}
      </p>
      <span
        className={`block rounded-xl border p-2.5 ${
          mine ? 'border-white/25 bg-white/10' : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.05]'
        }`}
      >
        <span className="block truncate text-sm font-bold">
          {post.author.displayName}{' '}
          <span className={mine ? 'font-medium text-white/70' : 'font-medium text-slate-500 dark:text-slate-400'}>
            @{post.author.username}
          </span>
        </span>
        {post.content && <span className="mt-0.5 line-clamp-3 block text-sm leading-5">{post.content}</span>}
      </span>
    </button>
  );
}
