import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Modal({ open, onClose, children, title }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in sm:pt-16"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl animate-scale-in overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#090a12]/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-14 items-center gap-4 border-b border-slate-100 px-4 py-2 dark:border-white/10">
          <button onClick={onClose} className="icon-button" aria-label="Close modal">
            <X size={20} />
          </button>
          {title && <h2 className="text-lg font-bold">{title}</h2>}
        </div>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
