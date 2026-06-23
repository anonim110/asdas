import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../store/auth';
import { useTheme } from '../store/theme';
import { soundsMuted, setSoundsMuted } from '../lib/sound';
import { playMessageSound } from '../lib/sound';
import { PageHeader } from '../components/PageHeader';
import type { AuthUser } from '../types';

export function Settings() {
  const user = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const logout = useAuth((s) => s.logout);
  const { theme, set: setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const googleWelcome = new URLSearchParams(location.search).get('welcome') === 'google';

  const [form, setForm] = useState({
    displayName: user.displayName,
    bio: user.bio ?? '',
    link: user.link ?? '',
    location: user.location ?? '',
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl);
  const [bannerPreview, setBannerPreview] = useState(user.bannerUrl);
  const [savedMsg, setSavedMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(soundsMuted());

  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSavedMsg('');
    try {
      const data = new FormData();
      data.append('displayName', form.displayName);
      data.append('bio', form.bio);
      data.append('link', form.link);
      data.append('location', form.location);
      if (avatar) data.append('avatar', avatar);
      if (banner) data.append('banner', banner);

      const { data: res } = await api.patch<{ user: AuthUser }>('/users/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(res.user);
      queryClient.invalidateQueries({ queryKey: ['profile', user.username] });
      setSavedMsg('Profile saved.');
    } catch (err) {
      setError(errorMessage(err, 'Could not save profile'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" back />

      {googleWelcome && (
        <section className="card bg-brand/5 p-4">
          <h2 className="font-bold">Google sign-in is ready</h2>
          <p className="mt-1 text-sm text-gray-500">
            Your profile was created from Google. You can adjust your name and avatar here.
          </p>
        </section>
      )}

      <form onSubmit={saveProfile} className="card pb-6">
        <div className="relative h-40 bg-gradient-to-br from-rose-100 via-white to-blue-100 dark:from-white/[0.08] dark:via-white/[0.03] dark:to-blue-500/10">
          {bannerPreview && <img src={bannerPreview} className="h-full w-full object-cover" />}
          <button
            type="button"
            onClick={() => bannerInput.current?.click()}
            className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-950/60 text-white backdrop-blur transition hover:bg-slate-950/75"
            aria-label="Change banner"
          >
            <Camera size={20} />
          </button>
          <input
            ref={bannerInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setBanner(f);
                setBannerPreview(URL.createObjectURL(f));
              }
            }}
          />
        </div>

        <div className="px-4">
          <div className="relative -mt-12 mb-4 h-24 w-24">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-200 dark:border-[#07080f] dark:bg-slate-800">
              {avatarPreview && <img src={avatarPreview} className="h-full w-full object-cover" />}
            </div>
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/60 text-white backdrop-blur transition hover:bg-slate-950/75"
              aria-label="Change avatar"
            >
              <Camera size={18} />
            </button>
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setAvatar(f);
                  setAvatarPreview(URL.createObjectURL(f));
                }
              }}
            />
          </div>

          <div className="space-y-4">
            <Field label="Name">
              <input
                className="input"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                maxLength={50}
              />
            </Field>
            <Field label="Bio">
              <textarea
                className="input resize-none"
                rows={3}
                value={form.bio}
                maxLength={160}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </Field>
            <Field label="Location">
              <input
                className="input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                maxLength={50}
              />
            </Field>
            <Field label="Website">
              <input
                className="input"
                placeholder="https://"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
              />
            </Field>
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          {savedMsg && <p className="mt-3 text-sm text-green-600">{savedMsg}</p>}
          <button className="btn-primary mt-4" disabled={busy}>
            {busy ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>

      <section className="card p-4">
        <h2 className="mb-3 text-lg font-bold">Appearance</h2>
        <div className="flex gap-3">
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 rounded-xl border p-4 text-left capitalize ${
                theme === t ? 'border-brand ring-1 ring-brand' : 'border-gray-300 dark:border-gray-700'
              }`}
            >
              {t} mode
            </button>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section className="card p-4">
        <h2 className="mb-3 text-lg font-bold">Notifications</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Message sounds</p>
            <p className="text-sm text-gray-500">Play a chime when a new direct message arrives.</p>
          </div>
          <button
            role="switch"
            aria-checked={!muted}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              setSoundsMuted(next);
              if (!next) playMessageSound(); // preview the sound when enabling
            }}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              muted ? 'bg-gray-300 dark:bg-gray-700' : 'bg-brand'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                muted ? 'left-1' : 'left-6'
              }`}
            />
          </button>
        </div>
      </section>

      {user.googleLinked && (
        <section className="card p-4">
          <h2 className="mb-1 text-lg font-bold">Google sign-in</h2>
          <p className="text-sm text-gray-500">
            Connected to your Google account. You can sign in without a password.
          </p>
        </section>
      )}

      <ChangePassword />

      <section className="p-4">
        <button
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="btn-outline w-full border-red-300 text-red-500 dark:border-red-900"
        >
          Log out
        </button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function ChangePassword() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const hasPassword = user?.hasPassword ?? true;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setError('');
    try {
      await api.post('/auth/change-password', {
        currentPassword: hasPassword ? current : undefined,
        newPassword: next,
      });
      if (user && !hasPassword) setUser({ ...user, hasPassword: true });
      setMsg(hasPassword ? 'Password changed.' : 'Password added.');
      setCurrent('');
      setNext('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4">
      <h2 className="mb-1 text-lg font-bold">{hasPassword ? 'Change password' : 'Set password'}</h2>
      {!hasPassword && (
        <p className="mb-3 text-sm text-gray-500">
          Optional: add a password if you also want to sign in without Google.
        </p>
      )}
      <form onSubmit={submit} className="space-y-3">
        {hasPassword && (
          <input
            className="input"
            type="password"
            placeholder="Current password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        )}
        <input
          className="input"
          type="password"
          placeholder="New password (min 8)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {msg && <p className="text-sm text-green-600">{msg}</p>}
        <button className="btn-primary" disabled={busy || !next || (hasPassword && !current)}>
          {busy ? 'Updating...' : hasPassword ? 'Update password' : 'Add password'}
        </button>
      </form>
    </section>
  );
}
