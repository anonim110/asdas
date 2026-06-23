import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../store/theme';

export function ThemeToggle({ withLabel }: { withLabel?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="flex min-h-12 items-center gap-3 rounded-full px-3 py-2.5 text-slate-700 transition duration-200 hover:bg-white/75 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
      {withLabel && <span className="hidden text-xl xl:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>}
    </button>
  );
}
