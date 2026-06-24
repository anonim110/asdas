import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../store/theme';

export function ThemeToggle({ withLabel }: { withLabel?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="flex min-h-12 items-center gap-4 rounded-lg px-3 py-2.5 text-slate-700 transition duration-200 hover:bg-white/75 hover:text-slate-950 active:scale-[0.98] dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
      {withLabel && <span className="hidden text-lg xl:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>}
    </button>
  );
}
