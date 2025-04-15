/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        primary: '#ffffff',
        secondary: '#0ea5e9',
        border: 'rgba(255, 255, 255, 0.1)',
        foreground: '#303030', // 消息气泡背景色
        'input-border': 'rgba(255, 255, 255, 0.2)', // 消息气泡边框色
      },
      height: {
        'svh': '100vh',
      },
      keyframes: {
        shine: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        shine: 'shine 5s linear infinite',
        'dot-bounce-1': 'bounce 0.8s ease-in-out infinite',
        'dot-bounce-2': 'bounce 0.8s ease-in-out 0.2s infinite',
        'dot-bounce-3': 'bounce 0.8s ease-in-out 0.4s infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // 添加typography插件支持prose类
  ],
} 