import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Feather } from 'lucide-react';
import { useAuth } from '../store/auth';
import { errorMessage } from '../lib/api';
import { GoogleAuthButton } from '../components/GoogleAuthButton';

export function Login() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const googleStatus = new URLSearchParams(location.search).get('google');
    if (googleStatus === 'not-configured') {
      setError('Google sign-in is not configured yet.');
    }
    if (googleStatus === 'failed') {
      setError('Could not sign in with Google. Please try again.');
    }
  }, [location.search]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(identifier, password);
      navigate(from ?? '/home', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Invalid credentials'));
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
        <h1 className="mb-2 text-3xl font-extrabold text-slate-950 dark:text-white">Sign in</h1>
        <p className="mb-6 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Jump back into your feed, messages, and conversations.
        </p>
        <GoogleAuthButton />
        <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          or
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input
            className="input"
            placeholder="Email or username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/forgot-password" className="font-medium text-brand hover:underline">
            Forgot password?
          </Link>
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create account
          </Link>
        </div>
        <p className="mt-8 text-xs leading-5 text-slate-500 dark:text-slate-400">
          New here?{' '}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create an account
          </Link>{' '}
          and start the conversation.
        </p>
      </div>
    </div>
  );
}
