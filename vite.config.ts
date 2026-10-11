import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { berylMiddleware } from './server/beryl-replay.mjs'

// Forwards /nwps/* to NOAA's National Water Prediction Service so the browser
// doesn't hit CORS errors when loading live gauge data.
const nwpsProxy = {
  '/nwps': {
    target: 'https://api.water.noaa.gov',
    changeOrigin: true,
  },
}

// Serves /api/beryl/replay from TigerData. DATABASE_URL comes from .env.local
// (no VITE_ prefix, so Vite never exposes it to the browser).
function berylApi(databaseUrl: string | undefined): Plugin {
  const handler = berylMiddleware(databaseUrl)
  return {
    name: 'beryl-api',
    configureServer: (server) => void server.middlewares.use('/api/beryl/replay', handler),
    configurePreviewServer: (server) => void server.middlewares.use('/api/beryl/replay', handler),
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), berylApi(env.DATABASE_URL)],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: { proxy: nwpsProxy },
    preview: { proxy: nwpsProxy },
  }
})
