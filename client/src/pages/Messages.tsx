import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import { usePresence } from '../store/presence';
import { relativeTime } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { Spinner } from '../components/Spinner';
import { ChatPanel } from './ChatPanel';
import { UserName } from '../components/UserName';
import type { Conversation } from '../types';

export function Messages() {
  const { id } = useParams();
  const me = useAuth((s) => s.user);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await api.get<{ conversations: Conversation[] }>('/conversations')).data.conversations,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const fromList = conversations?.find((c) => c.id === id);
  const { data: single } = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => (await api.get<{ conversation: Conversation }>(`/conversations/${id}`)).data.conversation,
    enabled: !!id && !fromList,
  });

  const active = fromList ?? single;

  useEffect(() => {
    if (conversations?.length) {
      usePresence.getState().request(conversations.map((c) => c.other.id));
    }
  }, [conversations]);

  return (
    <div className="grid h-[100dvh] grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div
        className={`overflow-y-auto border-r border-slate-200/80 pb-20 dark:border-white/10 sm:pb-0 ${
          id ? 'hidden md:block' : ''
        }`}
      >
        <PageHeader title="Messages" />
        {isLoading ? (
          <Spinner />
        ) : !conversations?.length ? (
          <p className="p-8 text-center text-slate-500 dark:text-slate-400">
            No conversations yet. Visit a profile to start one.
          </p>
        ) : (
          conversations.map((c) => (
            <Link
              key={c.id}
              to={`/messages/${c.id}`}
              className={`flex gap-3 px-4 py-3 transition duration-200 hover:bg-rose-50 dark:hover:bg-white/[0.04] ${
                c.id === id ? 'bg-rose-50 dark:bg-white/[0.07]' : ''
              }`}
            >
              <Avatar user={c.other} linkable={false} showPresence />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <UserName user={c.other} className="max-w-full" compact />
                  {c.lastMessage && (
                    <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {relativeTime(c.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {c.lastMessage
                      ? `${c.lastMessage.senderId === me?.id ? 'You: ' : ''}${
                          c.lastMessage.content ?? (c.lastMessage.imageUrl ? 'Photo' : '')
                        }`
                      : 'No messages yet'}
                  </p>
                  {c.unread > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent ring-2 ring-white dark:ring-[#07080f]" />}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className={id ? '' : 'hidden md:block'}>
        {active ? (
          <ChatPanel conversation={active} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
            {id ? <Spinner /> : 'Select a conversation to start chatting.'}
          </div>
        )}
      </div>
    </div>
  );
}
