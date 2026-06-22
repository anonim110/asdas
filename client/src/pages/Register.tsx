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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 text-brand">
          <Feather size={40} />
          <span className="bg-gradient-to-r from-brand to-brand-soft bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            Murmur
          </span>
        </div>
        <h1 className="mb-6 text-3xl font-extrabold">Create your account</h1>
        <GoogleAuthButton label="Sign up with Google" />
        <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-gray-500">
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          or
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input className="input" placeholder="Name" value={form.displayName} onChange={update('displayName')} />
          <input className="input" placeholder="Username" value={form.username} onChange={update('username')} />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={update('email')} />
          <input
            className="input"
            type="password"
            placeholder="Password (min 8 characters)"
            value={form.password}
            onChange={update('password')}
            autoComplete="new-password"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
