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
    <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-[#07080f]/85">
      <div className="flex min-h-14 items-center gap-4 px-4 py-2">
        {back && (
          <button onClick={() => navigate(-1)} className="icon-button" aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-extrabold leading-tight text-slate-950 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
