import { useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../store/toast';

interface Props {
  username: string;
  initialFollowing: boolean;
  onChange?: (following: boolean) => void;
  small?: boolean;
}

export function FollowButton({ username, initialFollowing, onChange, small }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      if (next) await api.post(`/users/${username}/follow`);
      else await api.delete(`/users/${username}/follow`);
      toast(next ? `Following @${username}` : `Unfollowed @${username}`, 'success');
      onChange?.(next);
    } catch {
      setFollowing(!next);
      toast('Something went wrong', 'error');
    } finally {
      setBusy(false);
    }
  }

  const size = small ? 'px-4 py-1 text-sm' : 'px-5 py-2';

  if (following) {
    return (
      <button
        onClick={toggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`rounded-full border font-bold ${size} ${
          hover
            ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950'
            : 'border-gray-300 dark:border-gray-700'
        }`}
      >
        {hover ? 'Unfollow' : 'Following'}
      </button>
    );
  }

  return (
    <button onClick={toggle} className={`rounded-full bg-gray-900 font-bold text-white dark:bg-white dark:text-black ${size}`}>
      Follow
    </button>
  );
}
