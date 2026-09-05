import { ReactNode, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

const EXIT_MS = 140;

export function Modal({ open, onClose, children, title }: Props) {
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
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
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
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-start sm:p-4 sm:pt-16 ${
        closing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={onClose}
    >
      <div
        className={`max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-md border border-stone-400 bg-[#fbf9f3] pb-[env(safe-area-inset-bottom)] shadow-[0_18px_42px_-24px_rgba(0,0,0,0.6)] sm:rounded-md sm:pb-0 dark:border-stone-700 dark:bg-[#1b1b17] ${
          closing ? 'animate-modal-exit' : 'animate-modal-enter'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-h-14 items-center gap-3 border-b border-stone-300 px-4 py-2 dark:border-white/10">
          <button onClick={onClose} className="icon-button" aria-label="Close modal">
            <X size={19} />
          </button>
          {title && <h2 className="text-lg font-black tracking-[-0.02em]">{title}</h2>}
        </div>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
