import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, MapPin, LinkIcon, MoreHorizontal, Mail } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../store/toast';
import { usePresence } from '../store/presence';
import { joinedDate, compactNumber } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { FollowButton } from '../components/FollowButton';
import { Feed } from '../components/Feed';
import { Spinner } from '../components/Spinner';
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

  // Ask the server whether this user is currently online.
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

  return (
    <div>
      <PageHeader title={profile.displayName} subtitle={`${compactNumber(profile.counts.posts)} posts`} back />

      {/* Banner */}
      <div className="h-48 w-full bg-gray-200 dark:bg-gray-800">
        {profile.bannerUrl && <img src={profile.bannerUrl} className="h-full w-full object-cover" />}
      </div>

      <div className="px-4">
        <div className="flex items-start justify-between">
          <div className="-mt-16">
            <Avatar user={profile} size="xl" linkable={false} showPresence />
          </div>
          <div className="mt-3 flex items-center gap-2">
            {!rel.isSelf && (
              <>
                <button
                  onClick={message}
                  className="rounded-full border border-gray-300 p-2 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
                  title="Message"
                >
                  <Mail size={18} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setMenu((o) => !o)}
                    className="rounded-full border border-gray-300 p-2 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {menu && (
                    <div className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-black">
                      <button onClick={muteToggle} className="block w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-900">
                        {rel.isMuted ? 'Unmute' : 'Mute'} @{username}
                      </button>
                      <button onClick={blockToggle} className="block w-full px-4 py-3 text-left text-red-500 hover:bg-gray-100 dark:hover:bg-gray-900">
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

        <div className="mt-3">
          <h2 className="text-xl font-extrabold">{profile.displayName}</h2>
          <p className="text-gray-500">@{profile.username}</p>
          {rel.isFollowedBy && !rel.isSelf && (
            <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
              Follows you
            </span>
          )}
        </div>

        {profile.bio && <p className="mt-3 whitespace-pre-wrap">{profile.bio}</p>}

        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
          {profile.location && (
            <span className="flex items-center gap-1">
              <MapPin size={16} /> {profile.location}
            </span>
          )}
          {profile.link && (
            <a
              href={profile.link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-1 text-brand hover:underline"
            >
              <LinkIcon size={16} /> {profile.link.replace(/^https?:\/\//, '')}
            </a>
          )}
          <span className="flex items-center gap-1">
            <CalendarDays size={16} /> {joinedDate(profile.createdAt)}
          </span>
        </div>

        <div className="mt-3 flex gap-5 text-sm">
          <Link to={`/${username}/following`} className="hover:underline">
            <strong>{compactNumber(profile.counts.following)}</strong> <span className="text-gray-500">Following</span>
          </Link>
          <Link to={`/${username}/followers`} className="hover:underline">
            <strong>{compactNumber(profile.counts.followers)}</strong> <span className="text-gray-500">Followers</span>
          </Link>
        </div>
      </div>

      {rel.isBlocked ? (
        <p className="p-10 text-center text-gray-500">You have blocked @{username}.</p>
      ) : (
        <>
          {/* Tabs */}
          <div className="mt-4 flex border-b border-gray-200 dark:border-gray-800">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="relative flex-1 py-4 text-center font-bold capitalize transition hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                <span className={tab === t ? '' : 'text-gray-500'}>{t}</span>
                {tab === t && <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-brand" />}
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
