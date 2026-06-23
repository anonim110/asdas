/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Murmur's social-first palette: warm engagement + blue utility accent.
        brand: {
          DEFAULT: '#E11D48',
          hover: '#BE123C',
          soft: '#FB7185',
        },
        accent: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          soft: '#93C5FD',
        },
      },
      boxShadow: {
        soft: '0 18px 50px -28px rgba(15, 23, 42, 0.35)',
        lift: '0 18px 35px -24px rgba(225, 29, 72, 0.45)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
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
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scale-in 0.2s ease-out',
        pop: 'pop 0.4s ease-out',
        'toast-in': 'toast-in 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'heart-burst': 'heart-burst 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
};
