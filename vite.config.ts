import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite'
import { berylMiddleware } from './server/beryl-replay.mjs'
import { createCaller } from './server/call.mjs'

// Small server-side APIs that run inside the Vite server. Secrets (DATABASE_URL,
// ELEVENLABS_API_KEY) come from .env.local with no VITE_ prefix,
// so Vite never exposes them to the browser.
//   /api/beryl/replay  Hurricane Beryl replay from TigerData
//   /api/call          phone-call alerts through ElevenLabs + Twilio
function serverApis(env: Record<string, string>): Plugin {
  const beryl = berylMiddleware(env.DATABASE_URL)
  const caller = createCaller(env)
  return {
    name: 'floodline-server-apis',
    configureServer(server) {
      server.middlewares.use('/api/beryl/replay', beryl)
      server.middlewares.use('/api/call', caller.middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/beryl/replay', beryl)
      server.middlewares.use('/api/call', caller.middleware)
    },
  }
}

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
    // US Census geocoder, used to confirm home addresses on the profile page.
    '/census': {
      target: 'https://geocoding.geo.census.gov',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/census/, '/geocoder'),
    },
    // ElevenLabs text-to-speech for the Alerts page. The API key is added here,
    // server-side, so it never ships in the frontend bundle.
    // (This key needs Text to Speech access, on top of ElevenAgents.)
    '/tts': {
      target: 'https://api.elevenlabs.io',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/tts/, '/v1/text-to-speech'),
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY ?? '' },
    },
  }

  return {
    plugins: [react(), tailwindcss(), serverApis(env)],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: { proxy },
    preview: { proxy },
  }
})
