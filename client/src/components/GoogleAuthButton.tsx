import { API_ORIGIN } from '../lib/api';

export function GoogleAuthButton({ label = 'Continue with Google' }: { label?: string }) {
  return (
    <a
      href={`${API_ORIGIN}/api/auth/google`}
      className="flex min-h-12 w-full items-center justify-between gap-3 border border-stone-400 bg-transparent px-4 py-3 font-extrabold text-stone-900 transition-colors hover:border-stone-950 hover:bg-stone-950 hover:text-white dark:border-stone-600 dark:text-stone-100 dark:hover:border-stone-100 dark:hover:bg-stone-100 dark:hover:text-stone-950"
    >
      <span>{label}</span>
      <span className="text-sm font-black">G</span>
    </a>
  );
}
