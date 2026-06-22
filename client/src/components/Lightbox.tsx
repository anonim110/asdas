import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Media } from '../types';

interface Props {
  media: Media[];
  startIndex?: number;
  onClose: () => void;
}

// Full-screen media viewer with fade/scale animation and keyboard navigation.
export function Lightbox({ media, startIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const current = media[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, media.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [media.length, onClose]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex animate-fade-in items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
        <X size={22} />
      </button>

      {media.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.max(i - 1, 0));
            }}
            disabled={index === 0}
            className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.min(i + 1, media.length - 1));
            }}
            disabled={index === media.length - 1}
            className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronRight size={26} />
          </button>
        </>
      )}

      <div className="max-h-[90vh] max-w-[92vw] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {current.type === 'VIDEO' ? (
          <video src={current.url} controls autoPlay className="max-h-[90vh] max-w-[92vw] rounded-lg" />
        ) : (
          <img src={current.url} className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain" />
        )}
      </div>

      {media.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
          {index + 1} / {media.length}
        </div>
      )}
    </div>
  );
}
