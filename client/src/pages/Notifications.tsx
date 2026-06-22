import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Heart, Repeat2, UserPlus, AtSign, MessageCircle, Quote } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtime } from '../store/realtime';
import { useIntersection } from '../hooks/useIntersection';
import { relativeTime } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { Spinner } from '../components/Spinner';
import type { Notification, NotificationType } from '../types';

const ICONS: Record<NotificationType, { icon: typeof Heart; color: string }> = {
  LIKE: { icon: Heart, color: 'text-pink-600' },
  REPOST: { icon: Repeat2, color: 'text-green-500' },
  QUOTE: { icon: Quote, color: 'text-green-500' },
  FOLLOW: { icon: UserPlus, color: 'text-brand' },
  MENTION: { icon: AtSign, color: 'text-brand' },
  REPLY: { icon: MessageCircle, color: 'text-brand' },
};

const VERB: Record<NotificationType, string> = {
  LIKE: 'liked your post',
  REPOST: 'reposted your post',
  QUOTE: 'quoted your post',
  FOLLOW: 'followed you',
  MENTION: 'mentioned you',
  REPLY: 'replied to your post',
};

export function Notifications() {
  const setNotifUnread = useRealtime((s) => s.setNotifUnread);

  const query = useInfiniteQuery({
    queryKey: ['notifications'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<{ items: Notification[]; nextCursor: string | null }>('/notifications', {
        params: { cursor: pageParam },
      });
      return data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  // Mark everything read when the page is opened.
  useEffect(() => {
    api.post('/notifications/read').then(() => setNotifUnread(0)).catch(() => {});
  }, [setNotifUnread]);

  const sentinel = useIntersection(
    () => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage(),
    query.hasNextPage,
  );

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      <PageHeader title="Notifications" />
      {query.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="p-8 text-center text-gray-500">Nothing to see here yet.</p>
      ) : (
        <>
          {items.map((n) => {
            const { icon: Icon, color } = ICONS[n.type];
            const href = n.type === 'FOLLOW' ? `/${n.actor.username}` : n.post ? `/post/${n.post.id}` : '#';
            return (
              <Link
                key={n.id}
                to={href}
                className={`flex gap-3 px-4 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-950 ${
                  n.read ? '' : 'bg-brand/5'
                } card`}
              >
                <Icon className={`mt-1 shrink-0 ${color}`} size={22} />
                <div className="min-w-0">
                  <Avatar user={n.actor} size="sm" />
                  <p className="mt-1">
                    <span className="font-bold">{n.actor.displayName}</span>{' '}
                    <span className="text-gray-500">@{n.actor.username}</span> {VERB[n.type]}
                    <span className="ml-1 text-sm text-gray-500">· {relativeTime(n.createdAt)}</span>
                  </p>
                  {n.post?.content && <p className="mt-1 line-clamp-2 text-gray-500">{n.post.content}</p>}
                </div>
              </Link>
            );
          })}
          <div ref={sentinel} />
          {query.isFetchingNextPage && <Spinner />}
        </>
      )}
    </div>
  );
}
