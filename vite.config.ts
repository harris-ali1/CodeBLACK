import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

export default defineConfig(({ mode }) => {
  // Loads ALL vars from .env.local (not just VITE_ ones). Only VITE_ vars ever
  // reach the browser, so ELEVENLABS_API_KEY stays on the dev server.
  const env = loadEnv(mode, process.cwd(), '')

  const proxy: Record<string, ProxyOptions> = {
    // Live river gauges (NOAA). Avoids browser CORS errors.
    '/nwps': {
      target: 'https://api.water.noaa.gov',
      changeOrigin: true,
    },
    // ElevenLabs text-to-speech for the Alerts page. The API key is added here,
    // server-side, so it never ships in the frontend bundle.
    '/tts': {
      target: 'https://api.elevenlabs.io',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/tts/, '/v1/text-to-speech'),
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY ?? '' },
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: { proxy },
    preview: { proxy },
  }
})