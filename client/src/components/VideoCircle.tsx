import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

// Telegram-style round "video circle" message. Tap to play/pause with sound.
export function VideoCircle({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  return (
    <button
      onClick={toggle}
      className="relative block h-48 w-48 max-w-[70vw] overflow-hidden rounded-full ring-2 ring-cyan-300/50 shadow-[0_0_34px_-8px_rgba(34,211,238,0.6)] sm:h-56 sm:w-56"
      aria-label={playing ? 'Pause video message' : 'Play video message'}
    >
      <video
        ref={ref}
        src={url}
        playsInline
        loop
        className="h-full w-full object-cover"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {!playing && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Play size={42} className="text-white drop-shadow-lg" />
        </span>
      )}
    </button>
  );
}
