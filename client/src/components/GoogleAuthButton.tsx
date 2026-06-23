import { API_ORIGIN } from '../lib/api';

export function GoogleAuthButton({ label = 'Continue with Google' }: { label?: string }) {
  return (
    <a
      href={`${API_ORIGIN}/api/auth/google`}
      className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-3 font-bold text-slate-800 shadow-sm transition duration-200 hover:border-accent/30 hover:bg-blue-50 active:scale-[0.99] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-extrabold text-slate-900 shadow-sm">
        G
      </span>
      {label}
    </a>
  );
}
