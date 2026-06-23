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

  const size = small ? 'min-h-9 px-4 text-sm' : 'min-h-11 px-5';

  if (following) {
    return (
      <button
        onClick={toggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        disabled={busy}
        className={`rounded-full border font-bold transition duration-200 disabled:opacity-50 ${size} ${
          hover
            ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
            : 'border-slate-200 bg-white/80 text-slate-800 hover:border-brand/30 hover:bg-rose-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]'
        }`}
      >
        {hover ? 'Unfollow' : 'Following'}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-full bg-slate-950 font-bold text-white shadow-sm transition duration-200 hover:bg-brand active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-rose-100 ${size}`}
    >
      Follow
    </button>
  );
}
