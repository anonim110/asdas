import { ReactNode, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

const EXIT_MS = 180;

export function Modal({ open, onClose, children, title }: Props) {
  // Keep the modal mounted briefly after `open` flips off so the exit
  // animation can play.
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
      return;
    }
    if (!visible) return;
    setClosing(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, EXIT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-start sm:p-4 sm:pt-16 ${
        closing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={onClose}
    >
      <div
        className={`max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-white/70 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-xl sm:rounded-2xl sm:pb-0 dark:border-white/10 dark:bg-[#0d0a18]/95 ${
          closing ? 'animate-modal-exit' : 'animate-modal-enter'
        }`}
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
