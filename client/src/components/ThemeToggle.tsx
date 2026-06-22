import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../store/theme';

export function ThemeToggle({ withLabel }: { withLabel?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 rounded-full p-3 transition hover:bg-gray-100 dark:hover:bg-gray-900"
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
      {withLabel && <span className="hidden text-xl xl:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>}
    </button>
  );
}
