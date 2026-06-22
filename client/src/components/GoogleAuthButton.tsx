import { API_ORIGIN } from '../lib/api';

export function GoogleAuthButton({ label = 'Continue with Google' }: { label?: string }) {
  return (
    <a
      href={`${API_ORIGIN}/api/auth/google`}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-gray-300 px-4 py-3 font-bold transition hover:bg-gray-100 active:scale-[0.99] dark:border-gray-700 dark:hover:bg-gray-900"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-extrabold text-gray-900">
        G
      </span>
      {label}
    </a>
  );
}
