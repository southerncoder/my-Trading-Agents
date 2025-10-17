import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    https: process.env.HTTPS_ENABLED === 'true' ? (() => {
      const keyPath = resolve(__dirname, 'certs/frontend-key.pem')
      const certPath = resolve(__dirname, 'certs/frontend-cert.pem')
      
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
      '/api': {
        target: process.env.HTTPS_ENABLED === 'true' ? 'https://localhost:3001' : 'http://localhost:3001',
        changeOrigin: true,
        secure: false, // Allow self-signed certificates in development
      },
      '/ws': {
        target: process.env.HTTPS_ENABLED === 'true' ? 'wss://localhost:3001' : 'ws://localhost:3001',
        ws: true,
        secure: false, // Allow self-signed certificates in development
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})