import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: Number(process.env.FRONTEND_DEV_PORT || 38440),
    host: true,
    https: process.env.HTTPS_ENABLED === 'true' ? (() => {
      const keyPath = resolve(import.meta.dirname, 'certs/frontend-key.pem')
      const certPath = resolve(import.meta.dirname, 'certs/frontend-cert.pem')
      
      if (existsSync(keyPath) && existsSync(certPath)) {
        return {
          key: readFileSync(keyPath),
          cert: readFileSync(certPath),
        }
      } else {
        console.warn('⚠️  HTTPS certificates not found. Run: npm run generate-certs')
        console.warn('   Falling back to HTTP mode')
        return false
      }
    })() : false,
    proxy: {
      // Paper portfolios have their own service (nginx routes it the same way in the container).
      '/api/portfolio': {
        target: `http://localhost:${process.env.PORTFOLIO_PORT || '38408'}`,
        changeOrigin: true,
      },
      '/api': {
        target: process.env.HTTPS_ENABLED === 'true' ? `https://localhost:${process.env.WEB_API_PORT || '38401'}` : `http://localhost:${process.env.WEB_API_PORT || '38401'}`,
        changeOrigin: true,
        secure: false, // Allow self-signed certificates in development
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})