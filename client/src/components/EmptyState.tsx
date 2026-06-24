import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  children?: ReactNode; // optional action (e.g. a button)
}

// Friendly, centered placeholder shown when a list/feed has no content.
export function EmptyState({ icon: Icon, title, subtitle, children }: Props) {
  return (
    <div className="animate-page-enter flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-brand shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <Icon size={30} strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">{title}</h3>
      {subtitle && <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
