import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        signal: '#00FF41',      // Cyber Green
        critical: '#FF3333',    // Alert Red
        void: '#050505',        // Deep Black
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'], // Enforces the terminal look
      },
    },
  },
  plugins: [],
} satisfies Config