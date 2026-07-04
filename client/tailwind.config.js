import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Manrope Variable"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // "Aurora" palette: electric violet brand + cyan utility accent.
        brand: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          soft: '#A78BFA',
        },
        accent: {
          DEFAULT: '#06B6D4',
          hover: '#0891B2',
          soft: '#67E8F9',
        },
      },
      boxShadow: {
        soft: '0 18px 50px -28px rgba(30, 20, 60, 0.35)',
        lift: '0 18px 35px -24px rgba(124, 58, 237, 0.55)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'page-enter': {
          '0%': { opacity: '0', transform: 'translateY(5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'feed-enter': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'avatar-reveal': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'nav-pop': {
          '0%': { transform: 'scale(0.86)' },
          '65%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        'modal-enter': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.35)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'heart-burst': {
          '0%': { transform: 'scale(0)', opacity: '0.8' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        'message-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'story-in': {
          '0%': { opacity: '0', transform: 'scale(1.04)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'typing-dot': {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-3px)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'page-enter': 'page-enter 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
        'feed-enter': 'feed-enter 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'avatar-reveal': 'avatar-reveal 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
        'nav-pop': 'nav-pop 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        'modal-enter': 'modal-enter 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scale-in 0.2s ease-out',
        pop: 'pop 0.4s ease-out',
        'toast-in': 'toast-in 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'heart-burst': 'heart-burst 0.5s ease-out forwards',
        'message-in': 'message-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
        'story-in': 'story-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
        'typing-dot': 'typing-dot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
