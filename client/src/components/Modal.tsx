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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in sm:pt-16"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl animate-scale-in rounded-2xl bg-white shadow-2xl dark:bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 px-4 py-3">
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-900">
            <X size={20} />
          </button>
          {title && <h2 className="text-lg font-bold">{title}</h2>}
        </div>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
