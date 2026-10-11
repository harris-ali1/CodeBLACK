import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Forwards /nwps/* to NOAA's National Water Prediction Service so the browser
// doesn't hit CORS errors when loading live gauge data.
const nwpsProxy = {
  '/nwps': {
    target: 'https://api.water.noaa.gov',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { proxy: nwpsProxy },
  preview: { proxy: nwpsProxy },
})