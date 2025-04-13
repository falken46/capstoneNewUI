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
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // 添加typography插件支持prose类
  ],
} 