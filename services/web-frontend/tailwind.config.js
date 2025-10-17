/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'press-start': ['"Press Start 2P"', 'monospace'],
        'fira-code': ['"Fira Code"', 'monospace'],
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        // Futuristic color palette inspired by southerncoding.dev
        'electric-blue': '#7dd3fc',
        'neon-green': '#00ff88',
        'neon-pink': '#ff0080',
        'cyber-purple': '#8b5cf6',
        'matrix-green': '#00ff41',
        
        // Dark theme base colors
        'dark': {
          50: '#1e293b',
          100: '#0f172a',
          200: '#020617',
          300: '#000000',
        },
        
        // Trading-specific colors with futuristic twist
        'bull': {
          50: '#ecfdf5',
          400: '#4ade80',
          500: '#00ff88', // Neon green
          600: '#00e676',
          700: '#00c853',
          800: '#00a047',
          900: '#007c3a',
        },
        'bear': {
          50: '#fef2f2',
          400: '#f87171',
          500: '#ff0080', // Neon pink
          600: '#e91e63',
          700: '#c2185b',
          800: '#ad1457',
          900: '#880e4f',
        },
        
        // Neutral grays for dark theme
        'slate': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'blink': 'blink 1.5s step-end infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'matrix': 'matrix 20s linear infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        blink: {
          'from, to': { opacity: '0' },
          '50%': { opacity: '1' }
        },
        glow: {
          'from': { 
            'box-shadow': '0 0 5px #7dd3fc, 0 0 10px #7dd3fc, 0 0 15px #7dd3fc',
          },
          'to': { 
            'box-shadow': '0 0 10px #7dd3fc, 0 0 20px #7dd3fc, 0 0 30px #7dd3fc',
          }
        },
        matrix: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' }
        },
        slideUp: {
          'from': { transform: 'translateY(20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' }
        }
      },
      backgroundImage: {
        'gradient-cyber': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        'gradient-neon': 'linear-gradient(135deg, #7dd3fc 0%, #8b5cf6 50%, #ec4899 100%)',
        'gradient-matrix': 'linear-gradient(180deg, transparent 0%, #00ff41 50%, transparent 100%)',
      },
      boxShadow: {
        'neon': '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
        'neon-lg': '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
        'cyber': '0 4px 14px 0 rgba(125, 211, 252, 0.15)',
        'cyber-lg': '0 8px 25px 0 rgba(125, 211, 252, 0.25)',
      }
    },
  },
  plugins: [],
}