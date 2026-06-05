/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        surface: {
          DEFAULT: '#141414',
          light: '#1a1a1a',
          dark: '#0d0d0d',
        },
        edge: {
          DEFAULT: '#222222',
          light: '#2a2a2a',
          dark: '#1a1a1a',
        },
        muted: {
          DEFAULT: '#666666',
          light: '#888888',
          dark: '#444444',
        },
        accent: {
          DEFAULT: '#00e5ff',
          dim: '#00b8d4',
          glow: 'rgba(0, 229, 255, 0.12)',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 8s linear infinite',
        'float-slow': 'float-slow 20s ease-in-out infinite',
        'float-slow-reverse': 'float-slow-reverse 25s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 15px) scale(0.95)' },
        },
        'float-slow-reverse': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(-25px, 20px) scale(0.95)' },
          '66%': { transform: 'translate(15px, -25px) scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}
