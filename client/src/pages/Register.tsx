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
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
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
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3 text-brand">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-lift">
            <Feather size={25} />
          </span>
          <span className="bg-gradient-to-r from-brand via-brand-soft to-accent bg-clip-text text-4xl font-extrabold text-transparent">
            Murmur
          </span>
        </div>
        <h1 className="mb-2 text-3xl font-extrabold text-slate-950 dark:text-white">Create your account</h1>
        <p className="mb-6 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Join the conversation with a profile that is ready in seconds.
        </p>
        <GoogleAuthButton label="Sign up with Google" />
        <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          or
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        </div>
        <form onSubmit={submit} className="space-y-4">
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
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
