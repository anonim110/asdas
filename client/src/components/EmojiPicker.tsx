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
      className="absolute bottom-full z-30 mb-2 grid w-72 grid-cols-8 gap-1 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl animate-scale-in dark:border-gray-800 dark:bg-gray-900"
    >
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onPick(e)}
          className="rounded-lg p-1 text-xl transition hover:scale-125 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {e}
        </button>
      ))}
    </div>
  );
}
