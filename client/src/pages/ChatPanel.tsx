import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, ImagePlus, Smile, X, Phone, Video, Search, Gamepad2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../store/auth';
import { useRealtime } from '../store/realtime';
import { usePresence } from '../store/presence';
import { useCall } from '../store/call';
import { Avatar } from '../components/Avatar';
import { EmojiPicker } from '../components/EmojiPicker';
import { Lightbox } from '../components/Lightbox';
import { Modal } from '../components/Modal';
import { GameInviteCard } from '../components/GameInviteCard';
import { relativeTime } from '../lib/format';
import { encodeGameInvite, messagePreview, parseGameInvite } from '../lib/gameInvite';
import type { Conversation, Media, Message } from '../types';

export function ChatPanel({ conversation }: { conversation: Conversation }) {
  const queryClient = useQueryClient();
  const me = useAuth((s) => s.user);
  const setDmUnread = useRealtime((s) => s.setDmUnread);
  const startCall = useCall((s) => s.startCall);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gameInviteOpen, setGameInviteOpen] = useState(false);
  const [gameInvite, setGameInvite] = useState({ game: '', mode: '', startsAt: '', note: '' });
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

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
          content: messagePreview(message.content) || (message.imageUrl ? 'Image' : ''),
          imageUrl: message.imageUrl,
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
      setMessages((prev) => prev.map((m) => (m.senderId === me?.id && !m.readAt ? { ...m, readAt } : m)));
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

  async function deliver(content: string, img: typeof image): Promise<boolean> {
    if ((!content && !img) || isSending) return false;
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
      return true;
    } catch (err) {
      setError(errorMessage(err, 'Could not send message'));
      return false;
    } finally {
      setIsSending(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    const img = image;
    if ((!content && !img) || isSending) return;
    setText('');
    setImage(null);
    setEmojiOpen(false);
    const sent = await deliver(content, img);
    if (!sent) {
      setText(content);
      setImage(img);
    }
  }

  async function sendGameInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!gameInvite.game.trim() || isSending) return;
    const sent = await deliver(encodeGameInvite(gameInvite), null);
    if (sent) {
      setGameInviteOpen(false);
      setGameInvite({ game: '', mode: '', startsAt: '', note: '' });
    }
  }

  function pickImage(file: File | undefined) {
    if (file) setImage({ file, preview: URL.createObjectURL(file) });
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    getSocket()?.emit('dm:typing', { toUserId: conversation.other.id });
  }

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleMessages = normalizedSearch
    ? messages.filter((message) => {
        const invite = parseGameInvite(message.content);
        return [
          message.content,
          invite?.game,
          invite?.mode,
          invite?.startsAt,
          invite?.note,
        ].some((value) => value?.toLowerCase().includes(normalizedSearch));
      })
    : messages;

  return (
    <div className="flex h-[100dvh] min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="glass-bar safe-top z-10 flex min-h-16 shrink-0 items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
        <Link to="/messages" className="-ml-1 icon-button md:hidden" aria-label="Back to conversations">
          <ArrowLeft size={20} />
        </Link>
        <Avatar user={conversation.other} showPresence />
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold text-slate-950 dark:text-white">{conversation.other.displayName}</p>
          <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
            {online ? (
              <span className="text-green-600 dark:text-green-400">Active now</span>
            ) : lastSeen ? (
              `Last seen ${relativeTime(lastSeen)} ago`
            ) : (
              `@${conversation.other.username}`
            )}
          </p>
        </div>

        {/* Voice / video call this friend */}
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className="icon-button text-brand"
            aria-label="Search conversation"
            title="Search"
          >
            <Search size={19} />
          </button>
          <button
            onClick={() => startCall(conversation.other, 'audio')}
            className="icon-button text-brand"
            aria-label="Start voice call"
            title="Voice call"
          >
            <Phone size={20} />
          </button>
          <button
            onClick={() => startCall(conversation.other, 'video')}
            className="icon-button text-brand"
            aria-label="Start video call"
            title="Video call"
          >
            <Video size={20} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="glass-bar shrink-0 px-3 py-2">
          <div className="search-field min-h-11">
            <Search size={17} className="shrink-0 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages"
              className="min-w-0 flex-1 bg-transparent outline-none"
              autoFocus
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="icon-button min-h-9 min-w-9" aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
        {nextCursor && (
          <button onClick={loadOlder} className="mx-auto mb-4 block rounded-full px-4 py-2 text-sm font-bold text-brand hover:bg-rose-50 dark:hover:bg-white/[0.06]">
            Load older messages
          </button>
        )}
        {normalizedSearch && visibleMessages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">No matching messages.</p>
        )}
        {visibleMessages.map((m) => {
          const mine = m.senderId === me?.id;
          const invite = parseGameInvite(m.content);
          return (
            <div key={m.id} className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[82%] overflow-hidden rounded-3xl px-1 py-1 shadow-sm sm:max-w-[75%] ${
                  mine
                    ? 'bg-brand text-white'
                    : 'border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100'
                }`}
              >
                {m.imageUrl && (
                  <img
                    src={m.imageUrl}
                    onClick={() => setLightboxUrl(m.imageUrl)}
                    className="mb-1 max-h-72 w-full cursor-pointer rounded-2xl object-cover"
                    alt=""
                  />
                )}
                {invite ? (
                  <GameInviteCard
                    invite={invite}
                    mine={mine}
                    onJoin={() => {
                      setText(`I'm in for ${invite.game}${invite.mode ? ` - ${invite.mode}` : ''}.`);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                  />
                ) : (
                  m.content && <p className="whitespace-pre-wrap break-words px-3 py-1 leading-6">{m.content}</p>
                )}
                <p className={`px-3 pb-1 text-[11px] ${mine ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'}`}>
                  {relativeTime(m.createdAt)}
                  {mine && m.readAt ? ' - Read' : ''}
                </p>
              </div>
            </div>
          );
        })}
        {typing && <p className="px-1 text-sm font-medium text-slate-500 dark:text-slate-400">{conversation.other.displayName} is typing...</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mx-3 mb-2 rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

      {image && (
        <div className="flex items-center gap-3 border-t border-slate-200/80 px-3 pt-3 dark:border-white/10">
          <div className="relative">
            <img src={image.preview} className="h-16 w-16 rounded-2xl object-cover" alt="" />
            <button onClick={() => setImage(null)} className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/80 text-white" aria-label="Remove image">
              <X size={14} />
            </button>
          </div>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Image attached</span>
        </div>
      )}

      <form
        onSubmit={send}
        className="glass-strong flex min-w-0 shrink-0 items-end gap-1 border-x-0 border-b-0 px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 sm:gap-1.5 sm:px-3 sm:pt-3"
      >
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} className="icon-button shrink-0 text-brand" aria-label="Attach image">
          <ImagePlus size={20} />
        </button>
        <button
          type="button"
          onClick={() => setGameInviteOpen(true)}
          className="icon-button shrink-0 text-brand"
          aria-label="Create game invite"
          title="Game invite"
        >
          <Gamepad2 size={20} />
        </button>
        <div className="relative shrink-0">
          <button type="button" onClick={() => setEmojiOpen((o) => !o)} className="icon-button text-brand" aria-label="Add emoji">
            <Smile size={20} />
          </button>
          {emojiOpen && <EmojiPicker onPick={(emoji) => setText((t) => t + emoji)} onClose={() => setEmojiOpen(false)} />}
        </div>
        <textarea
          ref={inputRef}
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
          className="input max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-2xl px-3 leading-6"
        />
        <button
          type="submit"
          disabled={(!text.trim() && !image) || isSending}
          className="btn-primary h-11 w-11 shrink-0 rounded-full p-0"
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

      <Modal open={gameInviteOpen} onClose={() => setGameInviteOpen(false)} title="Invite to game">
        <form onSubmit={sendGameInvite} className="space-y-4 pt-2">
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Game</span>
            <input
              className="input"
              value={gameInvite.game}
              onChange={(e) => setGameInvite((current) => ({ ...current, game: e.target.value }))}
              maxLength={60}
              placeholder="Valorant, Minecraft, CS2..."
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Mode or squad</span>
            <input
              className="input"
              value={gameInvite.mode}
              onChange={(e) => setGameInvite((current) => ({ ...current, mode: e.target.value }))}
              maxLength={60}
              placeholder="Ranked duo, raid, casual..."
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">When</span>
            <input
              className="input"
              value={gameInvite.startsAt}
              onChange={(e) => setGameInvite((current) => ({ ...current, startsAt: e.target.value }))}
              maxLength={80}
              placeholder="Tonight at 20:00"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Note</span>
            <textarea
              className="input min-h-20 resize-none"
              value={gameInvite.note}
              onChange={(e) => setGameInvite((current) => ({ ...current, note: e.target.value }))}
              maxLength={240}
              placeholder="Need one support player. Voice chat on."
            />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={!gameInvite.game.trim() || isSending}>
            <Gamepad2 size={18} /> {isSending ? 'Sending...' : 'Send squad invite'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
