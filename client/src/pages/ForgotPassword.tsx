import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post<{ message: string; token: string | null }>('/auth/forgot-password', {
        email,
      });
      setMessage(data.message);
      setDevToken(data.token);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <h1 className="mb-2 text-3xl font-extrabold text-slate-950 dark:text-white">Reset your password</h1>
        <p className="mb-6 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Enter your email and we'll send you a reset link.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        {message && <p className="mt-4 text-sm font-medium text-green-600 dark:text-green-400">{message}</p>}
        {devToken && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
            <p className="mb-1 font-bold">Dev mode: use this token</p>
            <Link to={`/reset-password?token=${devToken}`} className="break-all font-medium text-brand hover:underline">
              Continue to reset
            </Link>
          </div>
        )}

        <p className="mt-6 text-sm">
          <Link to="/login" className="font-medium text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
