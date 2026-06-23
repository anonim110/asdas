import { useEffect, useRef } from 'react';

// A tiny, dependency-free emoji picker. Curated set of common emojis grouped
// loosely; clicking one calls onPick and closes.
const EMOJIS =
  '😀 😂 🤣 😊 😍 🥰 😎 🤩 🥳 😉 😋 😴 🤔 🙃 😅 😭 😡 🥺 😬 🤯 😱 🤗 🤝 🙏 👍 👎 👏 🙌 💪 🔥 ✨ ⭐ 🎉 🎊 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 💯 ✅ ❌ ⚡ 🌈 ☀️ 🌙 ⚽ 🎮 🎵 📷 💻 🚀 🍕 🍔 🍷 ☕ 🐶 🐱 🌹'.split(
    ' ',
  );

interface Props {
  onPick: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="panel absolute bottom-full z-30 mb-2 grid w-72 animate-scale-in grid-cols-8 gap-1 p-3"
    >
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onPick(e)}
          className="min-h-9 rounded-xl p-1 text-xl transition duration-200 hover:scale-110 hover:bg-rose-50 dark:hover:bg-white/[0.07]"
        >
          {e}
        </button>
      ))}
    </div>
  );
}
