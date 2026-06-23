import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

// Floating "back to top" button that appears once the page is scrolled down.
// Sits above the mobile bottom-nav / compose button.
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className="animate-scale-in fixed bottom-36 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-brand shadow-soft backdrop-blur transition hover:bg-rose-50 active:scale-95 sm:bottom-6 dark:border-white/10 dark:bg-[#07080f]/95 dark:hover:bg-white/[0.07]"
    >
      <ArrowUp size={20} />
    </button>
  );
}
