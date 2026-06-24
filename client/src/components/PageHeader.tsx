import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  children?: ReactNode; // e.g. tab bar
  right?: ReactNode;
}

export function PageHeader({ title, subtitle, back, children, right }: Props) {
  const navigate = useNavigate();
  return (
    <div className="glass-bar safe-top sticky top-0 z-20 shadow-[0_8px_24px_-24px_rgba(15,23,42,0.7)]">
      <div className="flex min-h-14 items-center gap-4 px-4 py-2">
        {back && (
          <button type="button" onClick={() => navigate(-1)} className="icon-button" aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold leading-tight text-slate-950 dark:text-white">{title}</h1>
          {subtitle && <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {children}
    </div>
  );
}
