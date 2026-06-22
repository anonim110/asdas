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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 text-brand">
          <Feather size={40} />
          <span className="bg-gradient-to-r from-brand to-brand-soft bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            Murmur
          </span>
        </div>
        <h1 className="mb-6 text-3xl font-extrabold">Sign in</h1>
        <GoogleAuthButton />
        <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-gray-500">
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          or
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
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
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/forgot-password" className="text-brand hover:underline">
            Forgot password?
          </Link>
          <Link to="/register" className="text-brand hover:underline">
            Create account
          </Link>
        </div>
        <p className="mt-8 text-xs text-gray-500">
          New here?{' '}
          <Link to="/register" className="text-brand hover:underline">
            Create an account
          </Link>{' '}
          and start the conversation.
        </p>
      </div>
    </div>
  );
}
