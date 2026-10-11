import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { berylMiddleware } from './server/beryl-replay.mjs'
import { createCaller } from './server/call.mjs'

// Forwards /nwps/* to NOAA's National Water Prediction Service so the browser
// doesn't hit CORS errors when loading live gauge data.
// Same idea for the US Census geocoder (used to confirm home addresses).
const nwpsProxy = {
  '/nwps': {
    target: 'https://api.water.noaa.gov',
    changeOrigin: true,
  },
  '/census': {
    target: 'https://geocoding.geo.census.gov',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/census/, '/geocoder'),
  },
}

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
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), serverApis(env)],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: { proxy: nwpsProxy },
    preview: { proxy: nwpsProxy },
  }
})
