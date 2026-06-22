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
      setDevToken(data.token); // present only in development
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-3xl font-extrabold">Reset your password</h1>
        <p className="mb-6 text-sm text-gray-500">
          Enter your email and we'll send you a reset link.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
        {devToken && (
          <div className="mt-4 rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-900">
            <p className="mb-1 font-bold">Dev mode: use this token</p>
            <Link to={`/reset-password?token=${devToken}`} className="break-all text-brand hover:underline">
              Continue to reset →
            </Link>
          </div>
        )}

        <p className="mt-6 text-sm">
          <Link to="/login" className="text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
