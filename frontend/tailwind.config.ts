import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Primary backgrounds
        bg: {
          primary: '#050508',
          secondary: '#0a0a0f',
          tertiary: '#0f0f18',
        },
        // Accent colors
        accent: {
          DEFAULT: '#00ffaa',
          dim: 'rgba(0, 255, 170, 0.15)',
          glow: 'rgba(0, 255, 170, 0.4)',
        },
        // Neon palette
        neon: {
          pink: '#ff6ec7',
          cyan: '#00d4ff',
          purple: '#7c3aed',
          green: '#00ffaa',
          blue: '#3b82f6',
          orange: '#ff7b00',
        },
        // Text colors
        text: {
          primary: '#ffffff',
          secondary: 'rgba(255, 255, 255, 0.7)',
          muted: 'rgba(255, 255, 255, 0.4)',
        },
        // Border colors
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.15)',
        },
      },
      animation: {
        // Glow animations
        'glow': 'glow 2s ease-in-out infinite alternate',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'glow-slow': 'glow 4s ease-in-out infinite alternate',
        
        // Float animations
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-fast': 'float 4s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out infinite 3s',
        
        // Pulse animations
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        
        // Shimmer effect
        'shimmer': 'shimmer 2s infinite',
        'shimmer-slow': 'shimmer 3s infinite',
        
        // Gradient shift
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        
        // Rotate
        'rotate-slow': 'rotate-slow 20s linear infinite',
        'rotate-reverse': 'rotate-slow 20s linear infinite reverse',
        
        // Scale
        'scale-pulse': 'scale-pulse 2s ease-in-out infinite',
        
        // Fade in
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        'fade-in-down': 'fade-in-down 0.8s ease-out forwards',
        'fade-in-left': 'fade-in-left 0.8s ease-out forwards',
        'fade-in-right': 'fade-in-right 0.8s ease-out forwards',
        
        // Bounce subtle
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        
        // Spin slow
        'spin-slow': 'spin 8s linear infinite',
        
        // Wiggle
        'wiggle': 'wiggle 1s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { 
            textShadow: '0 0 10px rgba(0, 255, 170, 0.5), 0 0 20px rgba(0, 255, 170, 0.3)' 
          },
          '100%': { 
            textShadow: '0 0 20px rgba(0, 255, 170, 0.8), 0 0 40px rgba(0, 255, 170, 0.5), 0 0 60px rgba(0, 255, 170, 0.3)' 
          },
        },
        'glow-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(0, 255, 170, 0.3)' 
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(0, 255, 170, 0.5), 0 0 60px rgba(0, 255, 170, 0.3)' 
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% center' },
          '50%': { backgroundPosition: '100% center' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'rotate-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'scale-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          from: { opacity: '0', transform: 'translateY(-30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-left': {
          from: { opacity: '0', transform: 'translateX(-30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in-right': {
          from: { opacity: '0', transform: 'translateX(30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-shine': 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(0, 255, 170, 0.3)',
        'glow': '0 0 30px rgba(0, 255, 170, 0.4)',
        'glow-lg': '0 0 60px rgba(0, 255, 170, 0.5)',
        'glow-purple': '0 0 30px rgba(124, 58, 237, 0.4)',
        'glow-pink': '0 0 30px rgba(255, 110, 199, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(0, 255, 170, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionDuration: {
        '400': '400ms',
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
      },
    },
  },
  plugins: [],
};

export default config;
