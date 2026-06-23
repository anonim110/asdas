import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToast, ToastType } from '../store/toast';

const STYLES: Record<ToastType, { icon: typeof Info; ring: string }> = {
  success: { icon: CheckCircle2, ring: 'text-green-500' },
  error: { icon: AlertCircle, ring: 'text-red-500' },
  info: { icon: Info, ring: 'text-brand' },
};

// Fixed, animated toast stack shown above the mobile nav.
export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      {toasts.map((t) => {
        const { icon: Icon, ring } = STYLES[t.type];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-[#090a12]/95"
          >
            <Icon size={20} className={ring} />
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="icon-button min-h-8 min-w-8 p-0" aria-label="Dismiss toast">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
