import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const backendTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: backendTarget, changeOrigin: true },
        '/uploads': { target: backendTarget, changeOrigin: true },
      },
    },
  }
})
