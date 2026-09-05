import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Feather } from 'lucide-react';
import { useAuth } from '../store/auth';
import { errorMessage } from '../lib/api';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { useT } from '../lib/i18n';

export function Login() {
  const t = useT();
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
    if (googleStatus === 'not-configured') setError('Google sign-in is not configured yet.');
    if (googleStatus === 'failed') setError('Could not sign in with Google. Please try again.');
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
    <div className="min-h-dvh bg-[#eeeae0] text-stone-950 dark:bg-[#0d0d0b] dark:text-stone-100 lg:grid lg:grid-cols-[0.8fr_1.2fr]">
      <aside className="hidden min-h-dvh flex-col justify-between bg-stone-950 p-10 text-stone-100 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center bg-brand text-white">
            <Feather size={19} />
          </span>
          <span className="text-2xl font-black tracking-[-0.055em]">Murmur</span>
        </div>

        <div className="max-w-md border-t border-stone-700 pt-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">Social, without the noise</p>
          <p className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.05em]">
            Follow people.<br />Read thoughts.<br />Join the conversation.
          </p>
        </div>
      </aside>

      <main className="flex min-h-dvh items-center px-5 py-10 sm:px-8 lg:px-14">
        <div className="mx-auto w-full max-w-[460px] border-t-4 border-stone-950 pt-7 dark:border-stone-100">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center bg-brand text-white">
              <Feather size={18} />
            </span>
            <span className="text-2xl font-black tracking-[-0.055em]">Murmur</span>
          </div>

          <h1 className="text-4xl font-black tracking-[-0.045em]">{t('signIn')}</h1>
          <p className="mt-2 max-w-[42ch] text-sm leading-6 text-stone-500">{t('signInSubtitle')}</p>

          <div className="mt-7">
            <GoogleAuthButton />
          </div>

          <div className="my-5 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.12em] text-stone-500">
            <span className="h-px flex-1 bg-stone-300 dark:bg-white/10" />
            or
            <span className="h-px flex-1 bg-stone-300 dark:bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              className="input"
              placeholder={t('emailOrUsername')}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
            <input
              className="input"
              type="password"
              placeholder={t('password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && (
              <p className="border-l-2 border-red-600 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            )}

            <button className="btn-primary w-full py-3" disabled={busy}>
              {busy ? t('signingIn') : t('signIn')}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-stone-300 pt-4 text-sm dark:border-white/10">
            <Link to="/forgot-password" className="font-bold text-brand hover:underline">
              {t('forgotPassword')}
            </Link>
            <Link to="/register" className="font-bold text-brand hover:underline">
              {t('createAccount')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
