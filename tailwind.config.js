/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/webview/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2c3e50',
        secondary: '#34495e',
        accent: '#3498db',
        'light-bg': '#ecf0f1',
        'dark-bg': '#2c3e50',
        'text-light': '#ecf0f1',
        'text-dark': '#2c3e50',
        'high-ref': '#E67E22', // Orange
        'medium-ref': '#3498DB', // Blue
        'low-ref': '#95A5A6', // Gray
        'incoming-ref': '#27AE60', // Green
        'outgoing-ref': '#8E44AD', // Purple
      },
    },
  },
  plugins: [],
}; 
