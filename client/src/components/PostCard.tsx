import { useEffect, useMemo, useState } from 'react';
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
import { relativeTime } from '../lib/format';
import { compactNumber } from '../lib/format';
import { Avatar } from './Avatar';
import { RichText } from './RichText';
import { MediaGrid } from './MediaGrid';
import { Modal } from './Modal';
import { PostComposer } from './PostComposer';
import type { Post, PostCounts, ViewerState } from '../types';

interface Props {
  post: Post;
  onDeleted?: (id: string) => void;
  subscribeRealtime?: boolean;
  showThreadLine?: boolean;
}

export function PostCard({ post, onDeleted, subscribeRealtime, showThreadLine }: Props) {
  const navigate = useNavigate();
  const me = useAuth((s) => s.user);

  // A repost entry wraps the original post; engagement targets the original.
  const isRepost = !!post.repostOf && !post.content && post.media.length === 0;
  const display = isRepost ? (post.repostOf as Post) : post;

  const [counts, setCounts] = useState<PostCounts>(display.counts);
  const [viewer, setViewer] = useState<ViewerState>(display.viewer);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [repostMenu, setRepostMenu] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [likeBurst, setLikeBurst] = useState(false);

  // Local copy of the editable text so edits reflect immediately.
  const [content, setContent] = useState<string | null>(display.content);
  const [editedAt, setEditedAt] = useState<string | null>(display.editedAt);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const isOwner = me?.id === display.author.id;

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

  // Live engagement counts for this post (used on detail pages).
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
      className="card animate-fade-in cursor-pointer px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-950"
    >
      {isRepost && (
        <div className="mb-1 flex items-center gap-2 pl-6 text-sm text-gray-500">
          <Repeat2 size={15} />
          <Link to={`/${post.author.username}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
            {post.author.displayName} reposted
          </Link>
        </div>
      )}
      {post.pinned && (
        <div className="mb-1 flex items-center gap-2 pl-6 text-sm text-gray-500">
          <Pin size={14} /> Pinned
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <Avatar user={display.author} />
          {showThreadLine && <div className="mt-1 w-0.5 flex-1 bg-gray-200 dark:bg-gray-800" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm">
            <Link
              to={`/${display.author.username}`}
              onClick={(e) => e.stopPropagation()}
              className="font-bold hover:underline"
            >
              {display.author.displayName}
            </Link>
            <span className="text-gray-500">@{display.author.username}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500 hover:underline">{relativeTime(display.createdAt)}</span>
            {editedAt && <span className="text-gray-500" title="Edited">· edited</span>}

            <div className="relative ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
                className="rounded-full p-1.5 text-gray-500 hover:bg-brand/10 hover:text-brand"
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && isOwner && (
                <div
                  className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-black"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!isRepost && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setEditText(content ?? '');
                        setEditOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-900"
                    >
                      <Pencil size={16} /> Edit
                    </button>
                  )}
                  <button
                    onClick={remove}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-red-500 hover:bg-gray-100 dark:hover:bg-gray-900"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                  <button
                    onClick={pin}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-900"
                  >
                    <Pin size={16} /> Pin to profile
                  </button>
                </div>
              )}
            </div>
          </div>

          {content && (
            <div className="mt-0.5 text-[15px] leading-snug">
              <RichText text={content} />
            </div>
          )}

          <MediaGrid media={display.media} />

          {display.quotedPost && <QuoteEmbed post={display.quotedPost} />}

          {/* Action bar */}
          <div className="mt-3 flex max-w-md items-center justify-between text-gray-500">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/post/${display.id}`);
              }}
              className="group flex items-center gap-1.5 hover:text-brand"
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
                className={`group flex items-center gap-1.5 hover:text-green-500 ${
                  viewer.reposted ? 'text-green-500' : ''
                }`}
              >
                <span className="rounded-full p-1.5 group-hover:bg-green-500/10">
                  <Repeat2 size={18} />
                </span>
                {counts.reposts > 0 && <span className="text-sm">{compactNumber(counts.reposts)}</span>}
              </button>
              {repostMenu && (
                <div
                  className="absolute z-10 mt-1 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-black"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={toggleRepost}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-900"
                  >
                    <Repeat2 size={16} /> {viewer.reposted ? 'Undo repost' : 'Repost'}
                  </button>
                  <button
                    onClick={() => {
                      setRepostMenu(false);
                      setQuoteOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-900"
                  >
                    <QuoteIcon size={16} /> Quote
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={toggleLike}
              className={`group flex items-center gap-1.5 hover:text-pink-600 ${
                viewer.liked ? 'text-pink-600' : ''
              }`}
            >
              <span className="relative rounded-full p-1.5 group-hover:bg-pink-600/10">
                <Heart
                  size={18}
                  fill={viewer.liked ? 'currentColor' : 'none'}
                  className={likeBurst ? 'animate-pop' : ''}
                />
                {likeBurst && (
                  <span className="pointer-events-none absolute inset-0 m-auto h-5 w-5 animate-heart-burst rounded-full border-2 border-pink-500" />
                )}
              </span>
              {counts.likes > 0 && <span className="text-sm tabular-nums">{compactNumber(counts.likes)}</span>}
            </button>

            {counts.views > 0 && (
              <span className="flex items-center gap-1 text-sm text-gray-500" title="Views">
                <BarChart2 size={17} />
                {compactNumber(counts.views)}
              </span>
            )}

            <button
              onClick={toggleBookmark}
              className={`group flex items-center hover:text-brand ${viewer.bookmarked ? 'text-brand' : ''}`}
            >
              <span className="rounded-full p-1.5 group-hover:bg-brand/10">
                <Bookmark size={18} fill={viewer.bookmarked ? 'currentColor' : 'none'} />
              </span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(`${window.location.origin}/post/${display.id}`);
                toast('Link copied to clipboard', 'success');
              }}
              className="group flex items-center hover:text-brand"
              title="Copy link"
            >
              <span className="rounded-full p-1.5 group-hover:bg-brand/10">
                <Share size={18} />
              </span>
            </button>
          </div>
        </div>
      </div>

      <Modal open={quoteOpen} onClose={() => setQuoteOpen(false)} title="Quote post">
        <PostComposer
          quotedPostId={display.id}
          autoFocus
          placeholder="Add a comment"
          onPosted={() => setQuoteOpen(false)}
        />
        <div className="mt-3 rounded-2xl border border-gray-200 p-3 text-sm dark:border-gray-800">
          <span className="font-bold">{display.author.displayName}</span>{' '}
          <span className="text-gray-500">@{display.author.username}</span>
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
          className="w-full resize-none rounded-xl border border-gray-200 bg-transparent p-3 text-[15px] outline-none focus:border-brand dark:border-gray-800"
        />
        <div className="mt-3 flex items-center justify-end gap-3">
          <span className={`text-sm ${editText.length > 280 ? 'text-red-500' : 'text-gray-500'}`}>
            {280 - editText.length}
          </span>
          <button
            onClick={saveEdit}
            disabled={editBusy || editText.trim().length === 0 || editText.length > 280}
            className="btn-primary"
          >
            {editBusy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </article>
  );
}

// Compact embedded card for a quoted post.
function QuoteEmbed({ post }: { post: Post }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/post/${post.id}`);
      }}
      className="mt-2 cursor-pointer rounded-2xl border border-gray-200 p-3 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
    >
      <div className="flex items-center gap-1 text-sm">
        <Avatar user={post.author} size="sm" />
        <span className="font-bold">{post.author.displayName}</span>
        <span className="text-gray-500">@{post.author.username}</span>
      </div>
      {post.content && (
        <div className="mt-1 text-sm">
          <RichText text={post.content} />
        </div>
      )}
      {post.media.length > 0 && <MediaGrid media={post.media.slice(0, 1)} />}
    </div>
  );
}
