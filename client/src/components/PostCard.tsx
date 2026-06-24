import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  Share,
  MoreHorizontal,
  Trash2,
  Pin,
  Quote as QuoteIcon,
  BarChart2,
  Pencil,
} from 'lucide-react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';
import { relativeTime, compactNumber } from '../lib/format';
import { Avatar } from './Avatar';
import { RichText } from './RichText';
import { MediaGrid } from './MediaGrid';
import { Modal } from './Modal';
import { Dismiss } from './Dismiss';
import { PostComposer } from './PostComposer';
import { UserName } from './UserName';
import { GameStatus } from './GameStatus';
import type { Post, PostCounts, ViewerState, PostAnalytics } from '../types';

interface Props {
  post: Post;
  onDeleted?: (id: string) => void;
  subscribeRealtime?: boolean;
  showThreadLine?: boolean;
  index?: number;
}

export function PostCard({ post, onDeleted, subscribeRealtime, showThreadLine, index = 0 }: Props) {
  const navigate = useNavigate();
  const me = useAuth((s) => s.user);

  const isRepost = !!post.repostOf && !post.content && post.media.length === 0;
  const display = isRepost ? (post.repostOf as Post) : post;

  const [counts, setCounts] = useState<PostCounts>(display.counts);
  const [viewer, setViewer] = useState<ViewerState>(display.viewer);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [repostMenu, setRepostMenu] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [likeBurst, setLikeBurst] = useState(false);
  const [content, setContent] = useState<string | null>(display.content);
  const [editedAt, setEditedAt] = useState<string | null>(display.editedAt);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analytics, setAnalytics] = useState<PostAnalytics | null>(null);

  const isOwner = me?.id === display.author.id;

  async function openAnalytics() {
    setMenuOpen(false);
    setAnalytics(null);
    setAnalyticsOpen(true);
    try {
      const { data } = await api.get<{ analytics: PostAnalytics }>(`/posts/${display.id}/analytics`);
      setAnalytics(data.analytics);
    } catch {
      toast('Could not load analytics', 'error');
      setAnalyticsOpen(false);
    }
  }

  async function saveEdit() {
    setEditBusy(true);
    try {
      const { data } = await api.patch<{ post: Post }>(`/posts/${display.id}`, { content: editText });
      setContent(data.post.content);
      setEditedAt(data.post.editedAt);
      setEditOpen(false);
      toast('Post updated', 'success');
    } catch {
      toast('Could not update post', 'error');
    } finally {
      setEditBusy(false);
    }
  }

  useEffect(() => {
    if (!subscribeRealtime) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('post:subscribe', { postId: display.id });
    const handler = (payload: { postId: string; counts: PostCounts }) => {
      if (payload.postId === display.id) setCounts(payload.counts);
    };
    socket.on('post:counts', handler);
    return () => {
      socket.emit('post:unsubscribe', { postId: display.id });
      socket.off('post:counts', handler);
    };
  }, [display.id, subscribeRealtime]);

  async function toggleLike(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !viewer.liked;
    if (next) {
      setLikeBurst(true);
      setTimeout(() => setLikeBurst(false), 500);
    }
    setViewer((v) => ({ ...v, liked: next }));
    setCounts((c) => ({ ...c, likes: c.likes + (next ? 1 : -1) }));
    try {
      const { data } = next
        ? await api.post(`/posts/${display.id}/like`)
        : await api.delete(`/posts/${display.id}/like`);
      setCounts(data.counts);
    } catch {
      setViewer((v) => ({ ...v, liked: !next }));
      setCounts((c) => ({ ...c, likes: c.likes + (next ? -1 : 1) }));
    }
  }

  async function toggleRepost() {
    setRepostMenu(false);
    const next = !viewer.reposted;
    setViewer((v) => ({ ...v, reposted: next }));
    setCounts((c) => ({ ...c, reposts: c.reposts + (next ? 1 : -1) }));
    try {
      const { data } = next
        ? await api.post(`/posts/${display.id}/repost`)
        : await api.delete(`/posts/${display.id}/repost`);
      setCounts(data.counts);
      toast(next ? 'Reposted' : 'Removed repost', 'success');
    } catch {
      setViewer((v) => ({ ...v, reposted: !next }));
      toast('Could not repost', 'error');
    }
  }

  async function toggleBookmark(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !viewer.bookmarked;
    setViewer((v) => ({ ...v, bookmarked: next }));
    try {
      if (next) await api.post(`/posts/${display.id}/bookmark`);
      else await api.delete(`/posts/${display.id}/bookmark`);
      toast(next ? 'Added to bookmarks' : 'Removed from bookmarks', 'success');
    } catch {
      setViewer((v) => ({ ...v, bookmarked: !next }));
      toast('Could not update bookmark', 'error');
    }
  }

  async function remove() {
    setMenuOpen(false);
    if (!confirm('Delete this post?')) return;
    await api.delete(`/posts/${display.id}`);
    setDeleted(true);
    toast('Post deleted', 'success');
    onDeleted?.(display.id);
  }

  async function pin() {
    setMenuOpen(false);
    await api.post(`/posts/${display.id}/pin`);
    toast('Pinned to your profile', 'success');
  }

  if (deleted) return null;

  return (
    <article
      onClick={() => navigate(`/post/${display.id}`)}
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      className="post-card card animate-feed-enter cursor-pointer px-4 py-4"
    >
      {isRepost && (
        <div className="mb-2 flex items-center gap-2 pl-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Repeat2 size={15} />
          <Link to={`/${post.author.username}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
            {post.author.displayName} reposted
          </Link>
        </div>
      )}
      {post.pinned && (
        <div className="mb-2 flex items-center gap-2 pl-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Pin size={14} /> Pinned
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <Avatar user={display.author} />
          {showThreadLine && <div className="mt-2 w-0.5 flex-1 rounded-full bg-slate-200 dark:bg-white/10" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1 text-sm">
            <Link
              to={`/${display.author.username}`}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 hover:underline"
            >
              <UserName user={display.author} className="max-w-full" compact />
            </Link>
            <span className="truncate text-slate-500 dark:text-slate-400">@{display.author.username}</span>
            <span className="text-slate-400">-</span>
            <span className="shrink-0 text-slate-500 hover:underline dark:text-slate-400">
              {relativeTime(display.createdAt)}
            </span>
            <GameStatus status={display.author.gameStatus} className="hidden shrink-0 sm:inline-flex" />
            {editedAt && (
              <span className="shrink-0 text-slate-500 dark:text-slate-400" title="Edited">
                - edited
              </span>
            )}

            <div className="relative ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
                className="icon-button min-h-9 min-w-9 p-0"
                aria-label="Post options"
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && isOwner && <Dismiss onDismiss={() => setMenuOpen(false)} />}
              {menuOpen && isOwner && (
                <div className="panel absolute right-0 z-10 mt-1 w-48 overflow-hidden py-1" onClick={(e) => e.stopPropagation()}>
                  {!isRepost && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setEditText(content ?? '');
                        setEditOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium transition hover:bg-rose-50 dark:hover:bg-white/[0.07]"
                    >
                      <Pencil size={16} /> Edit
                    </button>
                  )}
                  <button
                    onClick={remove}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                  <button
                    onClick={pin}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium transition hover:bg-rose-50 dark:hover:bg-white/[0.07]"
                  >
                    <Pin size={16} /> Pin to profile
                  </button>
                  {!isRepost && (
                    <button
                      onClick={openAnalytics}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium transition hover:bg-rose-50 dark:hover:bg-white/[0.07]"
                    >
                      <BarChart2 size={16} /> View analytics
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {content && (
            <div className="mt-1 text-[15.5px] leading-6 text-slate-900 dark:text-slate-100">
              <RichText text={content} />
            </div>
          )}

          <MediaGrid media={display.media} />

          {display.quotedPost && <QuoteEmbed post={display.quotedPost} />}

          <div className="mt-3 flex max-w-md items-center justify-between text-slate-500 dark:text-slate-400">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/post/${display.id}`);
              }}
              className="group flex min-h-11 items-center gap-1.5 rounded-full transition hover:text-brand"
              aria-label="Reply"
            >
              <span className="rounded-full p-1.5 group-hover:bg-brand/10">
                <MessageCircle size={18} />
              </span>
              {counts.replies > 0 && <span className="text-sm">{compactNumber(counts.replies)}</span>}
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRepostMenu((o) => !o);
                }}
                className={`group flex min-h-11 items-center gap-1.5 rounded-full transition hover:text-green-500 ${
                  viewer.reposted ? 'text-green-500' : ''
                }`}
                aria-label="Repost"
              >
                <span className="rounded-full p-1.5 group-hover:bg-green-500/10">
                  <Repeat2 size={18} className={viewer.reposted ? 'animate-nav-pop' : ''} />
                </span>
                {counts.reposts > 0 && <span className="text-sm">{compactNumber(counts.reposts)}</span>}
              </button>
              {repostMenu && <Dismiss onDismiss={() => setRepostMenu(false)} />}
              {repostMenu && (
                <div className="panel absolute z-10 mt-1 w-44 overflow-hidden py-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={toggleRepost}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium transition hover:bg-rose-50 dark:hover:bg-white/[0.07]"
                  >
                    <Repeat2 size={16} /> {viewer.reposted ? 'Undo repost' : 'Repost'}
                  </button>
                  <button
                    onClick={() => {
                      setRepostMenu(false);
                      setQuoteOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium transition hover:bg-rose-50 dark:hover:bg-white/[0.07]"
                  >
                    <QuoteIcon size={16} /> Quote
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={toggleLike}
              className={`group flex min-h-11 items-center gap-1.5 rounded-full transition hover:text-brand ${
                viewer.liked ? 'text-brand' : ''
              }`}
              aria-label="Like"
            >
              <span className="relative rounded-full p-1.5 group-hover:bg-brand/10">
                <Heart size={18} fill={viewer.liked ? 'currentColor' : 'none'} className={likeBurst ? 'animate-pop' : ''} />
                {likeBurst && (
                  <span className="pointer-events-none absolute inset-0 m-auto h-5 w-5 animate-heart-burst rounded-full border-2 border-brand" />
                )}
              </span>
              {counts.likes > 0 && <span className="text-sm tabular-nums">{compactNumber(counts.likes)}</span>}
            </button>

            {counts.views > 0 && (
              <span className="flex min-h-11 items-center gap-1 text-sm text-slate-500 dark:text-slate-400" title="Views">
                <BarChart2 size={17} />
                {compactNumber(counts.views)}
              </span>
            )}

            <button
              onClick={toggleBookmark}
              className={`group flex min-h-11 items-center rounded-full transition hover:text-brand ${
                viewer.bookmarked ? 'text-brand' : ''
              }`}
              aria-label="Bookmark"
            >
              <span className="rounded-full p-1.5 group-hover:bg-brand/10">
                <Bookmark
                  size={18}
                  fill={viewer.bookmarked ? 'currentColor' : 'none'}
                  className={viewer.bookmarked ? 'animate-nav-pop' : ''}
                />
              </span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(`${window.location.origin}/post/${display.id}`);
                toast('Link copied to clipboard', 'success');
              }}
              className="group flex min-h-11 items-center rounded-full transition hover:text-accent"
              title="Copy link"
              aria-label="Copy link"
            >
              <span className="rounded-full p-1.5 group-hover:bg-accent/10">
                <Share size={18} />
              </span>
            </button>
          </div>
        </div>
      </div>

      <Modal open={quoteOpen} onClose={() => setQuoteOpen(false)} title="Quote post">
        <PostComposer quotedPostId={display.id} autoFocus placeholder="Add a comment" onPosted={() => setQuoteOpen(false)} />
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
          <UserName user={display.author} compact />{' '}
          <span className="text-slate-500 dark:text-slate-400">@{display.author.username}</span>
          <p className="mt-1 line-clamp-3">{content}</p>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit post">
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          maxLength={280}
          rows={4}
          autoFocus
          className="input min-h-32 resize-none rounded-2xl"
        />
        <div className="mt-3 flex items-center justify-end gap-3">
          <span className={`text-sm ${editText.length > 280 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
            {280 - editText.length}
          </span>
          <button
            onClick={saveEdit}
            disabled={editBusy || editText.trim().length === 0 || editText.length > 280}
            className="btn-primary"
          >
            {editBusy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>

      <Modal open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} title="Post analytics">
        {!analytics ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : (
          <div>
            <div className="mb-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums">{compactNumber(analytics.views)}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">impressions</span>
              <span className="ml-auto rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
                {analytics.engagementRate}% engagement
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Likes', analytics.likes],
                ['Reposts', analytics.reposts],
                ['Replies', analytics.replies],
                ['Quotes', analytics.quotes],
                ['Bookmarks', analytics.bookmarks],
                ['Interactions', analytics.interactions],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200/80 p-3 text-center dark:border-white/10"
                >
                  <p className="text-xl font-extrabold tabular-nums">{compactNumber(value as number)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
              Posted {relativeTime(analytics.createdAt)}
            </p>
          </div>
        )}
      </Modal>
    </article>
  );
}

function QuoteEmbed({ post }: { post: Post }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/post/${post.id}`);
      }}
      className="mt-3 cursor-pointer rounded-2xl border border-slate-200 bg-white/70 p-3 transition duration-200 hover:border-brand/30 hover:bg-rose-50/70 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
    >
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Avatar user={post.author} size="sm" />
        <UserName user={post.author} className="max-w-[45%]" compact />
        <span className="truncate text-slate-500 dark:text-slate-400">@{post.author.username}</span>
      </div>
      {post.content && (
        <div className="mt-2 text-sm leading-5 text-slate-800 dark:text-slate-200">
          <RichText text={post.content} />
        </div>
      )}
      {post.media.length > 0 && <MediaGrid media={post.media.slice(0, 1)} />}
    </div>
  );
}
