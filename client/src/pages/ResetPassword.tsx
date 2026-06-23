import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <h1 className="mb-2 text-3xl font-extrabold text-slate-950 dark:text-white">Choose a new password</h1>
        <p className="mb-6 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Paste your reset token and choose a stronger password.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <input className="input" placeholder="Reset token" value={token} onChange={(e) => setToken(e.target.value)} />
          <input
            className="input"
            type="password"
            placeholder="New password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Updating...' : 'Reset password'}
          </button>
        </form>
        <p className="mt-6 text-sm">
          <Link to="/login" className="font-medium text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
