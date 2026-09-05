import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, MapPin, LinkIcon, MoreHorizontal, Mail, Share2 } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../store/toast';
import { usePresence } from '../store/presence';
import { joinedDate, compactNumber } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { Dismiss } from '../components/Dismiss';
import { FollowButton } from '../components/FollowButton';
import { Feed } from '../components/Feed';
import { Spinner } from '../components/Spinner';
import { UserName } from '../components/UserName';
import type { Conversation, Post, Profile as ProfileType } from '../types';

type Tab = 'posts' | 'replies' | 'media' | 'likes';
const TABS: Tab[] = ['posts', 'replies', 'media', 'likes'];

export function Profile() {
  const { username = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('posts');
  const [menu, setMenu] = useState(false);

  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => (await api.get<{ profile: ProfileType }>(`/users/${username}`)).data.profile,
  });

  useEffect(() => {
    if (profile?.id) usePresence.getState().request([profile.id]);
  }, [profile?.id]);

  async function blockToggle() {
    if (!profile) return;
    setMenu(false);
    const wasBlocked = profile.relationship.isBlocked;
    if (wasBlocked) await api.delete(`/users/${username}/block`);
    else await api.post(`/users/${username}/block`);
    toast(wasBlocked ? `Unblocked @${username}` : `Blocked @${username}`, 'success');
    refetch();
  }

  async function muteToggle() {
    if (!profile) return;
    setMenu(false);
    const wasMuted = profile.relationship.isMuted;
    if (wasMuted) await api.delete(`/users/${username}/mute`);
    else await api.post(`/users/${username}/mute`);
    toast(wasMuted ? `Unmuted @${username}` : `Muted @${username}`, 'success');
    refetch();
  }

  async function message() {
    const { data } = await api.post<{ conversation: Conversation }>('/conversations', { username });
    queryClient.setQueryData<Conversation[]>(['conversations'], (current) => [
      data.conversation,
      ...(current ?? []).filter((c) => c.id !== data.conversation.id),
    ]);
    navigate(`/messages/${data.conversation.id}`);
  }

  if (isLoading) return <Spinner className="mt-10" />;
  if (isError || !profile) return <p className="p-6 text-center text-red-500">User not found.</p>;

  const rel = profile.relationship;

  async function copyProfile() {
    await navigator.clipboard?.writeText(`${window.location.origin}/${username}`);
    toast('Profile link copied', 'success');
  }

  return (
    <div>
      <PageHeader title={profile.displayName} subtitle={`${compactNumber(profile.counts.posts)} posts`} back />

      <div className="h-36 w-full bg-stone-300 sm:h-48 dark:bg-stone-800">
        {profile.bannerUrl && (
          <img
            src={profile.bannerUrl}
            alt=""
            className="h-full w-full animate-avatar-reveal object-cover"
          />
        )}
      </div>

      <div className="px-4">
        <div className="flex items-start justify-between">
          <div className="-mt-16">
            <Avatar user={profile} size="xl" linkable={false} showPresence />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">
            <button
              onClick={copyProfile}
              className="icon-button border border-stone-300 bg-transparent dark:border-white/10"
              title="Copy profile link"
              aria-label="Copy profile link"
            >
              <Share2 size={18} />
            </button>

            {!rel.isSelf && (
              <>
                <button
                  onClick={message}
                  className="icon-button border border-stone-300 bg-transparent dark:border-white/10"
                  title="Message"
                  aria-label="Message"
                >
                  <Mail size={18} />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setMenu((open) => !open)}
                    className="icon-button border border-stone-300 bg-transparent dark:border-white/10"
                    aria-label="Profile actions"
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {menu && <Dismiss onDismiss={() => setMenu(false)} />}
                  {menu && (
                    <div className="panel absolute right-0 z-10 mt-1 w-48 overflow-hidden py-1">
                      <button
                        onClick={muteToggle}
                        className="block w-full px-4 py-3 text-left font-medium transition-colors hover:bg-stone-100 dark:hover:bg-white/[0.05]"
                      >
                        {rel.isMuted ? 'Unmute' : 'Mute'} @{username}
                      </button>
                      <button
                        onClick={blockToggle}
                        className="block w-full px-4 py-3 text-left font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        {rel.isBlocked ? 'Unblock' : 'Block'} @{username}
                      </button>
                    </div>
                  )}
                </div>

                <FollowButton username={username} initialFollowing={rel.isFollowing} onChange={() => refetch()} />
              </>
            )}

            {rel.isSelf && (
              <Link to="/settings" className="btn-outline">
                Edit profile
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4">
          <UserName user={profile} className="max-w-full text-2xl tracking-[-0.025em]" />
          <p className="font-semibold text-stone-500">@{profile.username}</p>
          {rel.isFollowedBy && !rel.isSelf && (
            <span className="mt-2 inline-block border-l-2 border-brand pl-2 text-xs font-bold uppercase tracking-[0.06em] text-stone-500">
              Follows you
            </span>
          )}
        </div>

        {profile.bio && (
          <p className="mt-4 max-w-[56ch] whitespace-pre-wrap text-[15px] leading-6 text-stone-800 dark:text-stone-200">
            {profile.bio}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-stone-500">
          {profile.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={15} /> {profile.location}
            </span>
          )}

          {profile.link && (
            <a
              href={profile.link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-1.5 font-bold text-brand hover:underline"
            >
              <LinkIcon size={15} /> {profile.link.replace(/^https?:\/\//, '')}
            </a>
          )}

          <span className="flex items-center gap-1.5">
            <CalendarDays size={15} /> {joinedDate(profile.createdAt)}
          </span>
        </div>

        <div className="mt-4 flex gap-6 border-t border-stone-300 py-4 text-sm dark:border-white/10">
          <Link to={`/${username}/following`} className="hover:underline">
            <strong>{compactNumber(profile.counts.following)}</strong>{' '}
            <span className="text-stone-500">Following</span>
          </Link>
          <Link to={`/${username}/followers`} className="hover:underline">
            <strong>{compactNumber(profile.counts.followers)}</strong>{' '}
            <span className="text-stone-500">Followers</span>
          </Link>
        </div>
      </div>

      {rel.isBlocked ? (
        <p className="border-t border-stone-300 p-10 text-center text-stone-500 dark:border-white/10">
          You have blocked @{username}.
        </p>
      ) : (
        <>
          <div className="flex gap-6 overflow-x-auto border-y border-stone-300 px-4 dark:border-white/10">
            {TABS.map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`relative shrink-0 py-3 text-sm font-extrabold uppercase tracking-[0.07em] transition-colors ${
                  tab === item
                    ? 'text-stone-950 dark:text-white'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {item}
                {tab === item && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" />}
              </button>
            ))}
          </div>

          <Feed
            key={tab}
            queryKey={['profile-feed', username, tab]}
            fetchPage={async (pageParam) => {
              const { data } = await api.get<{ items: Post[]; nextCursor: string | null }>(
                `/users/${username}/posts`,
                { params: { tab, cursor: pageParam } },
              );
              return { items: data.items, next: data.nextCursor };
            }}
            emptyText={`No ${tab} yet.`}
          />
        </>
      )}
    </div>
  );
}
