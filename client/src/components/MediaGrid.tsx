import { useState } from 'react';
import { Lightbox } from './Lightbox';
import type { Media } from '../types';

// Renders 1–4 media attachments in a responsive grid, matching common
// social-media layouts. Clicking opens a full-screen lightbox.
export function MediaGrid({ media }: { media: Media[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  if (!media.length) return null;
  const count = media.length;

  const gridClass = count === 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <>
      <div
        className={`mt-2 grid ${gridClass} gap-0.5 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800`}
        onClick={(e) => e.stopPropagation()}
      >
        {media.map((m, i) => {
          const span = count === 3 && i === 0 ? 'row-span-2' : '';
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className={`group relative ${span} ${count === 1 ? '' : 'aspect-square'} overflow-hidden`}
            >
              {m.type === 'VIDEO' ? (
                <video src={m.url} className="h-full w-full object-cover" />
              ) : (
                <img
                  src={m.url}
                  loading="lazy"
                  className={`transition duration-300 group-hover:brightness-90 ${
                    count === 1 ? 'max-h-[510px] w-full object-cover' : 'h-full w-full object-cover'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {lightboxIndex !== null && (
        <Lightbox media={media} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  );
}
