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
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {toasts.map((t) => {
        const { icon: Icon, ring } = STYLES[t.type];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-3 rounded-2xl border border-gray-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur dark:border-gray-800 dark:bg-gray-900/95"
          >
            <Icon size={20} className={ring} />
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
