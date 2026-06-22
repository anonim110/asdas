import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, ImagePlus, Smile, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../store/auth';
import { useRealtime } from '../store/realtime';
import { usePresence } from '../store/presence';
import { Avatar } from '../components/Avatar';
import { EmojiPicker } from '../components/EmojiPicker';
import { Lightbox } from '../components/Lightbox';
import { relativeTime } from '../lib/format';
import type { Conversation, Media, Message } from '../types';

export function ChatPanel({ conversation }: { conversation: Conversation }) {
  const queryClient = useQueryClient();
  const me = useAuth((s) => s.user);
  const setDmUnread = useRealtime((s) => s.setDmUnread);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Presence of the other participant.
  const online = usePresence((s) => s.online[conversation.other.id]);
  const lastSeen = usePresence((s) => s.lastSeen[conversation.other.id]) ?? conversation.other.lastSeenAt;
  useEffect(() => {
    usePresence.getState().request([conversation.other.id]);
  }, [conversation.other.id]);

  function appendMessage(message: Message) {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
  }

  function refreshConversationPreview(message: Message) {
    queryClient.setQueryData<Conversation[]>(['conversations'], (current) => {
      const existing = current?.find((c) => c.id === conversation.id) ?? conversation;
      const updated: Conversation = {
        ...existing,
        lastMessage: {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          createdAt: message.createdAt,
          readAt: message.readAt,
        },
        unread: 0,
        updatedAt: message.createdAt,
      };
      return [updated, ...(current ?? []).filter((c) => c.id !== conversation.id)];
    });
  }

  function clearUnreadForActiveConversation() {
    let total: number | null = null;
    queryClient.setQueryData<Conversation[]>(['conversations'], (current) => {
      if (!current) return current;
      const next = current.map((c) => (c.id === conversation.id ? { ...c, unread: 0 } : c));
      total = next.reduce((sum, c) => sum + c.unread, 0);
      return next;
    });
    if (total !== null) setDmUnread(total);
  }

  useEffect(() => {
    let active = true;
    api
      .get<{ items: Message[]; nextCursor: string | null }>(`/conversations/${conversation.id}/messages`)
      .then(({ data }) => {
        if (!active) return;
        setMessages([...data.items].reverse());
        setNextCursor(data.nextCursor);
        clearUnreadForActiveConversation();
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
      });

    getSocket()?.emit('dm:read', { conversationId: conversation.id });
    api.post(`/conversations/${conversation.id}/read`).catch(() => {});

    return () => {
      active = false;
    };
  }, [conversation.id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNew = (p: { conversationId: string; message: Message }) => {
      if (p.conversationId !== conversation.id) return;
      appendMessage(p.message);
      refreshConversationPreview(p.message);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
      if (p.message.senderId !== me?.id) {
        socket.emit('dm:read', { conversationId: conversation.id });
        api
          .post(`/conversations/${conversation.id}/read`)
          .then(() => clearUnreadForActiveConversation())
          .catch(() => {});
      }
    };
    const onRead = (p: { conversationId: string; readerId: string }) => {
      if (p.conversationId !== conversation.id || p.readerId !== conversation.other.id) return;
      const readAt = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) => (m.senderId === me?.id && !m.readAt ? { ...m, readAt } : m)),
      );
    };
    const onTyping = (p: { fromUserId: string }) => {
      if (p.fromUserId !== conversation.other.id) return;
      setTyping(true);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setTyping(false), 2500);
    };

    socket.on('dm:new', onNew);
    socket.on('dm:read', onRead);
    socket.on('dm:typing', onTyping);
    return () => {
      socket.off('dm:new', onNew);
      socket.off('dm:read', onRead);
      socket.off('dm:typing', onTyping);
    };
  }, [conversation.id, conversation.other.id, me?.id, queryClient]);

  async function loadOlder() {
    if (!nextCursor) return;
    const { data } = await api.get<{ items: Message[]; nextCursor: string | null }>(
      `/conversations/${conversation.id}/messages`,
      { params: { cursor: nextCursor } },
    );
    setMessages((prev) => [...[...data.items].reverse(), ...prev]);
    setNextCursor(data.nextCursor);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    const img = image;
    if ((!content && !img) || isSending) return;
    setText('');
    setImage(null);
    setEmojiOpen(false);
    setError('');
    setIsSending(true);
    try {
      let data: { message: Message };
      if (img) {
        const form = new FormData();
        if (content) form.append('content', content);
        form.append('image', img.file);
        ({ data } = await api.post<{ message: Message }>(`/conversations/${conversation.id}/messages`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }));
      } else {
        ({ data } = await api.post<{ message: Message }>(`/conversations/${conversation.id}/messages`, { content }));
      }
      appendMessage(data.message);
      refreshConversationPreview(data.message);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
    } catch (err) {
      setError(errorMessage(err, 'Could not send message'));
      setText(content);
      setImage(img);
    } finally {
      setIsSending(false);
    }
  }

  function pickImage(file: File | undefined) {
    if (file) setImage({ file, preview: URL.createObjectURL(file) });
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    getSocket()?.emit('dm:typing', { toUserId: conversation.other.id });
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-3 py-3 backdrop-blur dark:border-gray-800 dark:bg-black/90 sm:px-4">
        <Link
          to="/messages"
          className="-ml-1 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-900 md:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft size={20} />
        </Link>
        <Avatar user={conversation.other} showPresence />
        <div className="min-w-0">
          <p className="truncate font-bold">{conversation.other.displayName}</p>
          <p className="text-sm text-gray-500">
            {online ? (
              <span className="text-green-500">● Active now</span>
            ) : lastSeen ? (
              `Last seen ${relativeTime(lastSeen)} ago`
            ) : (
              `@${conversation.other.username}`
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
        {nextCursor && (
          <button onClick={loadOlder} className="mx-auto mb-4 block text-sm text-brand hover:underline">
            Load older messages
          </button>
        )}
        {messages.map((m) => {
          const mine = m.senderId === me?.id;
          return (
            <div key={m.id} className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[82%] overflow-hidden rounded-2xl px-1 py-1 sm:max-w-[75%] ${
                  mine ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {m.imageUrl && (
                  <img
                    src={m.imageUrl}
                    onClick={() => setLightboxUrl(m.imageUrl)}
                    className="mb-1 max-h-72 w-full cursor-pointer rounded-xl object-cover"
                  />
                )}
                {m.content && <p className="whitespace-pre-wrap break-words px-3 py-1">{m.content}</p>}
                <p className={`px-3 pb-1 text-[11px] ${mine ? 'text-white/70' : 'text-gray-500'}`}>
                  {relativeTime(m.createdAt)}
                  {mine && m.readAt ? ' · Read' : ''}
                </p>
              </div>
            </div>
          );
        })}
        {typing && <p className="text-sm text-gray-500">{conversation.other.displayName} is typing...</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 text-sm text-red-500">{error}</p>}

      {image && (
        <div className="flex items-center gap-2 border-t border-gray-200 px-3 pt-2 dark:border-gray-800">
          <div className="relative">
            <img src={image.preview} className="h-16 w-16 rounded-lg object-cover" />
            <button
              onClick={() => setImage(null)}
              className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-white"
            >
              <X size={14} />
            </button>
          </div>
          <span className="text-sm text-gray-500">Image attached</span>
        </div>
      )}

      <form
        onSubmit={send}
        className="flex items-end gap-1.5 border-t border-gray-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur dark:border-gray-800 dark:bg-black/95 sm:px-3"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => pickImage(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="shrink-0 rounded-full p-2 text-brand hover:bg-brand/10"
          aria-label="Attach image"
        >
          <ImagePlus size={20} />
        </button>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            className="rounded-full p-2 text-brand hover:bg-brand/10"
            aria-label="Add emoji"
          >
            <Smile size={20} />
          </button>
          {emojiOpen && (
            <EmojiPicker onPick={(emoji) => setText((t) => t + emoji)} onClose={() => setEmojiOpen(false)} />
          )}
        </div>
        <textarea
          value={text}
          onChange={onInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(e);
            }
          }}
          rows={1}
          placeholder="Start a new message"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl bg-gray-100 px-4 py-2 leading-6 outline-none dark:bg-gray-900"
        />
        <button
          type="submit"
          disabled={(!text.trim() && !image) || isSending}
          className="btn-primary h-10 w-10 shrink-0 rounded-full p-0"
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </form>

      {lightboxUrl && (
        <Lightbox
          media={[{ id: 'dm', url: lightboxUrl, type: 'IMAGE', width: null, height: null } as Media]}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  );
}
