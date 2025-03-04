/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/webview/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196f3',
          600: '#1e88e5',
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
        },
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
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      maxHeight: {
        '0': '0',
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        'full': '100%',
      },
    },
  },
  plugins: [],
  darkMode: 'media',
}; 
