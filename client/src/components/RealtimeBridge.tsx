import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { connectSocket, getSocket } from '../lib/socket';
import { playMessageSound } from '../lib/sound';
import { useAuth } from '../store/auth';
import { useRealtime } from '../store/realtime';
import { usePresence } from '../store/presence';
import type { Conversation, Message } from '../types';

// Mounted once for authenticated users. Wires Socket.io events to the global
// unread badges and the React Query cache, and seeds the initial counts.
export function RealtimeBridge() {
  const queryClient = useQueryClient();
  const me = useAuth((s) => s.user);
  const { setNotifUnread, setDmUnread } = useRealtime();

  useEffect(() => {
    let cancelled = false;

    // Seed initial unread counts from the API.
    (async () => {
      try {
        const [{ data: n }, { data: c }] = await Promise.all([
          api.get<{ unread: number }>('/notifications/unread-count'),
          api.get<{ conversations: Conversation[] }>('/conversations'),
        ]);
        if (cancelled) return;
        setNotifUnread(n.unread);
        setDmUnread(c.conversations.reduce((sum, conv) => sum + conv.unread, 0));
      } catch {
        // ignore — counts default to 0
      }
    })();

    const socket = connectSocket();

    const onNotifCount = (p: { unread: number }) => setNotifUnread(p.unread);
    const onNotifNew = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
    const onDmNew = (p: { conversationId: string; message: Message }) => {
      if (p.message.senderId !== me?.id) {
        playMessageSound();
      }

      // Refresh conversation list, update visible chats immediately, and recompute the badge.
      api
        .get<{ conversations: Conversation[] }>('/conversations')
        .then(({ data }) => {
          queryClient.setQueryData(['conversations'], data.conversations);
          setDmUnread(data.conversations.reduce((s, c) => s + c.unread, 0));
        })
        .catch(() => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        });
    };
    const onDmRead = (p: { conversationId: string; readerId: string }) => {
      queryClient.setQueryData<Conversation[]>(['conversations'], (current) =>
        current?.map((c) => {
          if (c.id !== p.conversationId || !c.lastMessage || c.lastMessage.senderId !== me?.id) {
            return c;
          }
          return { ...c, lastMessage: { ...c.lastMessage, readAt: new Date().toISOString() } };
        }),
      );
      api
        .get<{ conversations: Conversation[] }>('/conversations')
        .then(({ data }) => setDmUnread(data.conversations.reduce((s, c) => s + c.unread, 0)))
        .catch(() => {});
    };

    const onPresenceUpdate = (p: { userId: string; online: boolean; lastSeenAt?: string }) =>
      usePresence.getState().setOnline(p.userId, p.online, p.lastSeenAt);
    const onPresenceState = (p: { online: string[] }) =>
      usePresence.getState().setOnlineList(p.online);

    socket.on('notification:count', onNotifCount);
    socket.on('notification:new', onNotifNew);
    socket.on('dm:new', onDmNew);
    socket.on('dm:read', onDmRead);
    socket.on('presence:update', onPresenceUpdate);
    socket.on('presence:state', onPresenceState);

    return () => {
      cancelled = true;
      const s = getSocket();
      s?.off('notification:count', onNotifCount);
      s?.off('notification:new', onNotifNew);
      s?.off('dm:new', onDmNew);
      s?.off('dm:read', onDmRead);
      s?.off('presence:update', onPresenceUpdate);
      s?.off('presence:state', onPresenceState);
    };
  }, [me?.id, queryClient, setNotifUnread, setDmUnread]);

  return null;
}
