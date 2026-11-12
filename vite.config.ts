import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// base: './' makes every asset URL relative, so the same build works on
// GitHub Pages (served from /<repo>/) and on Vercel (served from /).
// Routing uses HashRouter, so no server rewrite rules are needed either.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // plotly.js-dist-min is a single ~4.6 MB file (1.4 MB gzipped) that cannot be split;
    // it is lazy-loaded with the TP pages, so the warning is expected.
    chunkSizeWarningLimit: 5000,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
