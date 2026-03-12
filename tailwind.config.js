/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.tsx",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./utils/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'system-bg':      '#09090b',
        'system-card':    '#0f0f1a',
        'system-border':  '#1e1e35',
        'system-surface': '#161625',
        'system-accent':  '#8b5cf6',
        'system-neon':    '#00d2ff',
        'system-success': '#34d399',
        'system-warning': '#f59e0b',
        'system-danger':  '#f87171',
        'system-gold':    '#fbbf24',
        'stat-str':       '#f97066',
        'stat-int':       '#818cf8',
        'stat-dis':       '#c084fc',
        'stat-soc':       '#fbbf24',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-blue':   '0 0 10px rgba(0,210,255,0.5), 0 0 30px rgba(0,210,255,0.2)',
        'neon-purple': '0 0 10px rgba(139,92,246,0.5), 0 0 30px rgba(139,92,246,0.2)',
        'neon-red':    '0 0 10px rgba(239,68,68,0.5), 0 0 30px rgba(239,68,68,0.2)',
        'glass':       '0 8px 32px 0 rgba(0,0,0,0.5)',
        'card':        '0 20px 60px rgba(0,0,0,0.5)',
      },
      backgroundImage: {
        'gradient-neon':   'linear-gradient(135deg, #8b5cf6 0%, #00d2ff 100%)',
        'gradient-dark':   'linear-gradient(135deg, #0a0a0f 0%, #0e0820 100%)',
      },
      animation: {
        'pulse-fast':     'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':      'spin 4s linear infinite',
        'border-glow':    'borderGlow 2.5s ease-in-out infinite',
        'neon-pulse':     'neonPulse 2.5s ease-in-out infinite',
        'gradient-move':  'gradientMove 4s ease infinite',
        'fade-in-up':     'fadeInUp 0.6s ease-out both',
        'fade-in':        'fadeIn 0.5s ease-out both',
        'shimmer':        'shimmer 2.5s ease-in-out infinite',
        'orbit':          'orbitSpin 8s linear infinite',
        'orbit-reverse':  'orbitSpin 5s linear infinite reverse',
        'scanline':       'scanline 4s linear infinite',
      },
      keyframes: {
        borderGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0,210,255,0.3), inset 0 0 5px rgba(0,210,255,0.04)' },
          '50%':      { boxShadow: '0 0 20px rgba(0,210,255,0.7), inset 0 0 10px rgba(0,210,255,0.08)' },
        },
        neonPulse: {
          '0%, 100%': { textShadow: '0 0 6px rgba(0,210,255,0.8), 0 0 20px rgba(0,210,255,0.4)' },
          '50%':      { textShadow: '0 0 14px rgba(0,210,255,1), 0 0 50px rgba(0,210,255,0.7)' },
        },
        gradientMove: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        orbitSpin: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        scanline: {
          '0%':   { transform: 'translateY(-100vh)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    }
  },
  plugins: [],
}
