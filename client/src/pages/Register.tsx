import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Feather } from 'lucide-react';
import { useAuth } from '../store/auth';
import { errorMessage } from '../lib/api';
import { GoogleAuthButton } from '../components/GoogleAuthButton';

export function Register() {
  const register = useAuth((s) => s.register);
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not create account'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#eeeae0] text-stone-950 dark:bg-[#0d0d0b] dark:text-stone-100 lg:grid lg:grid-cols-[0.8fr_1.2fr]">
      <aside className="hidden min-h-dvh flex-col justify-between bg-stone-950 p-10 text-stone-100 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center bg-brand text-white">
            <Feather size={19} />
          </span>
          <span className="text-2xl font-black tracking-[-0.055em]">Murmur</span>
        </div>

        <div className="max-w-md border-t border-stone-700 pt-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">Create your corner</p>
          <p className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.05em]">
            A profile.<br />A feed.<br />People worth following.
          </p>
        </div>
      </aside>

      <main className="flex min-h-dvh items-center px-5 py-10 sm:px-8 lg:px-14">
        <div className="mx-auto w-full max-w-[500px] border-t-4 border-stone-950 pt-7 dark:border-stone-100">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center bg-brand text-white">
              <Feather size={18} />
            </span>
            <span className="text-2xl font-black tracking-[-0.055em]">Murmur</span>
          </div>

          <h1 className="text-4xl font-black tracking-[-0.045em]">Create your account</h1>
          <p className="mt-2 max-w-[46ch] text-sm leading-6 text-stone-500">
            Pick a name, claim a username, and start posting. You can finish your profile later.
          </p>

          <div className="mt-7">
            <GoogleAuthButton label="Sign up with Google" />
          </div>

          <div className="my-5 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.12em] text-stone-500">
            <span className="h-px flex-1 bg-stone-300 dark:bg-white/10" />
            or
            <span className="h-px flex-1 bg-stone-300 dark:bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input className="input" placeholder="Name" value={form.displayName} onChange={update('displayName')} autoComplete="name" />
            <input className="input" placeholder="Username" value={form.username} onChange={update('username')} autoComplete="username" />
            <input className="input" type="email" placeholder="Email" value={form.email} onChange={update('email')} autoComplete="email" />
            <input
              className="input"
              type="password"
              placeholder="Password (min 8 characters)"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
            />

            {error && (
              <p className="border-l-2 border-red-600 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            )}

            <button className="btn-primary w-full py-3" disabled={busy}>
              {busy ? 'Creating...' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 border-t border-stone-300 pt-4 text-sm text-stone-600 dark:border-white/10 dark:text-stone-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
