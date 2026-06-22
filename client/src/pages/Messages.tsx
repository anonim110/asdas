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
import type { Conversation } from '../types';

export function Messages() {
  const { id } = useParams();
  const me = useAuth((s) => s.user);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await api.get<{ conversations: Conversation[] }>('/conversations')).data.conversations,
    // Always pull a fresh list when opening Messages so newly created or
    // newly received conversations show up immediately.
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const fromList = conversations?.find((c) => c.id === id);

  // Fallback: if the requested conversation isn't in the list cache yet (just
  // created, or arrived in realtime), fetch it directly so the chat still opens.
  const { data: single } = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => (await api.get<{ conversation: Conversation }>(`/conversations/${id}`)).data.conversation,
    enabled: !!id && !fromList,
  });

  const active = fromList ?? single;

  // Ask the server who in this list is currently online.
  useEffect(() => {
    if (conversations?.length) {
      usePresence.getState().request(conversations.map((c) => c.other.id));
    }
  }, [conversations]);

  return (
    <div className="grid h-[100dvh] grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      {/* Conversation list — hidden on mobile when a chat is open */}
      <div
        className={`overflow-y-auto border-r border-gray-200 pb-20 dark:border-gray-800 sm:pb-0 ${
          id ? 'hidden md:block' : ''
        }`}
      >
        <PageHeader title="Messages" />
        {isLoading ? (
          <Spinner />
        ) : !conversations?.length ? (
          <p className="p-8 text-center text-gray-500">No conversations yet. Visit a profile to start one.</p>
        ) : (
          conversations.map((c) => (
            <Link
              key={c.id}
              to={`/messages/${c.id}`}
              className={`flex gap-3 px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-950 ${
                c.id === id ? 'bg-gray-100 dark:bg-gray-900' : ''
              }`}
            >
              <Avatar user={c.other} linkable={false} showPresence />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate font-bold">{c.other.displayName}</p>
                  {c.lastMessage && (
                    <span className="text-xs text-gray-500">{relativeTime(c.lastMessage.createdAt)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-gray-500">
                    {c.lastMessage
                      ? `${c.lastMessage.senderId === me?.id ? 'You: ' : ''}${
                          c.lastMessage.content ?? (c.lastMessage.imageUrl ? '📷 Photo' : '')
                        }`
                      : 'No messages yet'}
                  </p>
                  {c.unread > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Chat panel */}
      <div className={id ? '' : 'hidden md:block'}>
        {active ? (
          <ChatPanel conversation={active} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
            {id ? <Spinner /> : 'Select a conversation to start chatting.'}
          </div>
        )}
      </div>
    </div>
  );
}
