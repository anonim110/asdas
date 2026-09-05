import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  children?: ReactNode;
  right?: ReactNode;
}

export function PageHeader({ title, subtitle, back, children, right }: Props) {
  const navigate = useNavigate();

  return (
    <div className="safe-top sticky top-0 z-20 border-b border-stone-300 bg-[#f4f1e8] dark:border-white/10 dark:bg-[#11110f]">
      <div className="flex min-h-14 items-center gap-3 px-4 py-2">
        {back && (
          <button type="button" onClick={() => navigate(-1)} className="icon-button" aria-label="Go back">
            <ArrowLeft size={19} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.35rem] font-black leading-tight tracking-[-0.025em] text-stone-950 dark:text-stone-50">
            {title}
          </h1>
          {subtitle && <p className="truncate text-xs font-semibold text-stone-500 dark:text-stone-500">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {children}
    </div>
  );
}
