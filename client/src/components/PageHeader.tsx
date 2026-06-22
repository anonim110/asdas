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
    <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-black/80">
      <div className="flex items-center gap-6 px-4 py-2">
        {back && (
          <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-900">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-extrabold leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
