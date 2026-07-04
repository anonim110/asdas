import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import { Avatar } from './Avatar';
import { StoryViewer } from './StoryViewer';
import type { StoryGroup } from '../types';

// Horizontal row of story rings shown at the top of the Home feed. The first
// tile is always "Your story" (create or view own), followed by people the
// viewer follows, unseen first.
export function StoriesBar() {
  const me = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const toast = useToast((s) => s.show);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: groups } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const { data } = await api.get<{ groups: StoryGroup[] }>('/stories/feed');
      return data.groups;
    },
    staleTime: 30_000,
  });

  // Refresh the bar when anyone we follow publishes a story.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = () => queryClient.invalidateQueries({ queryKey: ['stories'] });
    socket.on('story:new', onNew);
    return () => {
      socket.off('story:new', onNew);
    };
  }, [queryClient]);

  async function publish(file: File | undefined) {
    if (!file || isPublishing) return;
    setIsPublishing(true);
    try {
      const form = new FormData();
      form.append('media', file);
      await api.post('/stories', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast('Story published');
    } catch (err) {
      toast(errorMessage(err, 'Could not publish story'));
    } finally {
      setIsPublishing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (!me) return null;
  const list = groups ?? [];
  const myGroup = list.find((g) => g.author.id === me.id) ?? null;
  const others = list.filter((g) => g.author.id !== me.id);

  // Skeleton row while the first load is in flight, so the feed below
  // doesn't jump when the bar appears.
  if (!groups) {
    return (
      <div className="card flex gap-3 overflow-hidden px-3 py-3">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
            <div className="skeleton h-[54px] w-[54px] rounded-full" />
            <div className="skeleton h-2 w-10 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card scrollbar-none overflow-x-auto px-3 py-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => publish(e.target.files?.[0])}
      />
      <div className="flex items-start gap-3">
        {/* Your story: opens the viewer when you have one, otherwise picks a file. */}
        <StoryRing
          label="Your story"
          author={{ ...me }}
          state={myGroup ? (myGroup.allViewed ? 'seen' : 'unseen') : 'none'}
          badge={
            isPublishing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Plus size={12} strokeWidth={3} />
            )
          }
          onBadgeClick={() => fileRef.current?.click()}
          onClick={() => {
            if (myGroup) setViewerAt(list.indexOf(myGroup));
            else fileRef.current?.click();
          }}
        />
        {others.map((g) => (
          <StoryRing
            key={g.author.id}
            label={g.author.displayName}
            author={g.author}
            state={g.allViewed ? 'seen' : 'unseen'}
            onClick={() => setViewerAt(list.indexOf(g))}
          />
        ))}
      </div>

      {viewerAt !== null && list[viewerAt] && (
        <StoryViewer groups={list} initialGroup={viewerAt} onClose={() => setViewerAt(null)} />
      )}
    </div>
  );
}

function StoryRing({
  label,
  author,
  state,
  badge,
  onClick,
  onBadgeClick,
}: {
  label: string;
  author: { id?: string; username: string; displayName: string; avatarUrl: string | null };
  state: 'unseen' | 'seen' | 'none';
  badge?: React.ReactNode;
  onClick: () => void;
  onBadgeClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-16 shrink-0 flex-col items-center gap-1 outline-none transition duration-200 active:scale-95"
    >
      <div className="relative transition duration-200 group-hover:scale-105">
        <div className="relative overflow-hidden rounded-full p-[2.5px]">
          {/* Ring layer. Unseen rings slowly rotate their conic gradient;
              oversized so the spinning square always covers the circle. */}
          {state === 'unseen' ? (
            <span className="absolute -inset-2 animate-ring-spin bg-[conic-gradient(from_210deg,#22d3ee,#8b5cf6,#d946ef,#22d3ee)]" />
          ) : (
            <span
              className={`absolute inset-0 ${
                state === 'seen' ? 'bg-slate-300 dark:bg-white/20' : 'bg-transparent'
              }`}
            />
          )}
          <div className="relative rounded-full bg-white p-[2px] dark:bg-[#0a0714]">
            <Avatar user={author} size="lg" linkable={false} />
          </div>
        </div>
        {badge && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              if (!onBadgeClick) return;
              e.stopPropagation();
              onBadgeClick();
            }}
            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow-sm dark:border-[#0a0714]"
            aria-label="Add story"
          >
            {badge}
          </span>
        )}
      </div>
      <span className="w-full truncate text-center text-[11px] font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </span>
    </button>
  );
}
