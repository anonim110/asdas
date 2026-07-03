import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Eye, Trash2, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import { Avatar } from './Avatar';
import { relativeTime } from '../lib/format';
import type { StoryGroup, StoryViewerEntry } from '../types';

const IMAGE_DURATION_MS = 5000;
const TICK_MS = 50;

// Full-screen Instagram-style story viewer: segmented progress bars,
// auto-advance, hold to pause, tap left/right or arrow keys to navigate.
export function StoryViewer({
  groups,
  initialGroup,
  onClose,
}: {
  groups: StoryGroup[];
  initialGroup: number;
  onClose: () => void;
}) {
  const me = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const toast = useToast((s) => s.show);
  const [gIdx, setGIdx] = useState(initialGroup);
  const [sIdx, setSIdx] = useState(() => {
    // Start a group at its first unseen story.
    const first = groups[initialGroup]?.stories.findIndex((s) => !s.viewed) ?? 0;
    return first === -1 ? 0 : first;
  });
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerEntry[] | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const elapsedRef = useRef(0);

  const group = groups[gIdx];
  const story = group?.stories[sIdx];
  const mine = !!me && group?.author.id === me.id;

  const goNext = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    setViewersOpen(false);
    if (sIdx + 1 < group.stories.length) {
      setSIdx(sIdx + 1);
    } else if (gIdx + 1 < groups.length) {
      setGIdx(gIdx + 1);
      setSIdx(0);
    } else {
      onClose();
    }
  }, [gIdx, sIdx, group, groups.length, onClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    setViewersOpen(false);
    if (sIdx > 0) {
      setSIdx(sIdx - 1);
    } else if (gIdx > 0) {
      const prev = groups[gIdx - 1];
      setGIdx(gIdx - 1);
      setSIdx(prev.stories.length - 1);
    }
  }, [gIdx, sIdx, groups]);

  // Mark the visible story as viewed and reflect it in the stories cache.
  useEffect(() => {
    if (!story || mine || story.viewed) return;
    api.post(`/stories/${story.id}/view`).catch(() => {});
    queryClient.setQueryData<StoryGroup[]>(['stories'], (current) =>
      current?.map((g) =>
        g.author.id !== group.author.id
          ? g
          : {
              ...g,
              stories: g.stories.map((s) => (s.id === story.id ? { ...s, viewed: true } : s)),
              allViewed: g.stories.every((s) => s.id === story.id || s.viewed),
            },
      ),
    );
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer for image stories (videos drive progress via timeupdate).
  useEffect(() => {
    if (!story || story.mediaType !== 'IMAGE') return;
    if (paused || viewersOpen) return;
    const timer = setInterval(() => {
      elapsedRef.current += TICK_MS;
      const p = elapsedRef.current / IMAGE_DURATION_MS;
      if (p >= 1) goNext();
      else setProgress(p);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [story?.id, story?.mediaType, paused, viewersOpen, goNext]);

  // Pause/resume the video element together with the hold-to-pause state.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused || viewersOpen) video.pause();
    else video.play().catch(() => {});
  }, [paused, viewersOpen, story?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [goNext, goPrev, onClose]);

  async function openViewers() {
    setViewersOpen(true);
    setViewers(null);
    try {
      const { data } = await api.get<{ viewers: StoryViewerEntry[] }>(`/stories/${story!.id}/viewers`);
      setViewers(data.viewers);
    } catch {
      setViewers([]);
    }
  }

  async function removeStory() {
    try {
      await api.delete(`/stories/${story!.id}`);
      toast('Story deleted');
      await queryClient.invalidateQueries({ queryKey: ['stories'] });
      // Move on locally: the cache refresh will rebuild the bar; keep the
      // viewer usable by advancing (or closing when it was the only story).
      if (group.stories.length <= 1) onClose();
      else if (sIdx >= group.stories.length - 1) setSIdx(Math.max(0, sIdx - 1));
      group.stories.splice(sIdx, 1);
      setProgress(0);
      elapsedRef.current = 0;
    } catch (err) {
      toast(errorMessage(err, 'Could not delete story'));
    }
  }

  if (!story) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 animate-fade-in">
      {/* Desktop side arrows */}
      {(gIdx > 0 || sIdx > 0) && (
        <button
          onClick={goPrev}
          className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:block"
          aria-label="Previous story"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <button
        onClick={goNext}
        className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:block"
        aria-label="Next story"
      >
        <ChevronRight size={22} />
      </button>

      <div
        className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-black sm:h-[92dvh] sm:rounded-2xl"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {/* Progress segments */}
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: i < sIdx ? '100%' : i === sIdx ? `${progress * 100}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute inset-x-0 top-4 z-20 flex items-center gap-2 px-3 pt-[env(safe-area-inset-top)]">
          <Avatar user={group.author} size="sm" linkable={false} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{group.author.displayName}</p>
            <p className="text-[11px] font-medium text-white/70">{relativeTime(story.createdAt)} ago</p>
          </div>
          {mine && (
            <button
              onClick={removeStory}
              className="rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label="Delete story"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
            aria-label="Close stories"
          >
            <X size={20} />
          </button>
        </div>

        {/* Media */}
        <div className="flex flex-1 items-center justify-center">
          {story.mediaType === 'VIDEO' ? (
            <video
              ref={videoRef}
              key={story.id}
              src={story.mediaUrl}
              autoPlay
              playsInline
              className="max-h-full w-full object-contain"
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration > 0) setProgress(v.currentTime / v.duration);
              }}
              onEnded={goNext}
            />
          ) : (
            <img key={story.id} src={story.mediaUrl} className="max-h-full w-full object-contain" alt="" />
          )}
        </div>

        {/* Tap zones (below header/footer controls) */}
        <button className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={goPrev} aria-label="Previous" />
        <button className="absolute inset-y-0 right-0 z-10 w-2/3" onClick={goNext} aria-label="Next" />

        {/* Caption + own-story viewers */}
        <div className="absolute inset-x-0 bottom-0 z-20 space-y-2 bg-gradient-to-t from-black/70 to-transparent p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {story.caption && <p className="text-sm font-medium text-white">{story.caption}</p>}
          {mine && (
            <button
              onClick={openViewers}
              className="flex items-center gap-1.5 text-sm font-semibold text-white/90 transition hover:text-white"
            >
              <Eye size={16} /> {story.viewCount} {story.viewCount === 1 ? 'view' : 'views'}
            </button>
          )}
        </div>

        {/* Viewers sheet */}
        {viewersOpen && (
          <div className="absolute inset-x-0 bottom-0 z-30 max-h-[55%] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl dark:bg-[#0b0c15]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold text-slate-950 dark:text-white">Viewers</p>
              <button onClick={() => setViewersOpen(false)} className="icon-button" aria-label="Close viewers">
                <X size={18} />
              </button>
            </div>
            {viewers === null ? (
              <p className="py-4 text-center text-sm text-slate-500">Loading...</p>
            ) : viewers.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No views yet.</p>
            ) : (
              viewers.map((v) => (
                <div key={v.id} className="flex items-center gap-3 py-2">
                  <Avatar user={v} size="sm" linkable={false} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{v.displayName}</p>
                    <p className="truncate text-xs text-slate-500">@{v.username}</p>
                  </div>
                  <span className="text-xs text-slate-500">{relativeTime(v.viewedAt)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
