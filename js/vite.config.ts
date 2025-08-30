import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  
  // For Node.js target
  build: {
    target: 'node18',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'TradingAgents',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: [
        // Node.js built-ins
        'fs', 'path', 'url', 'crypto', 'os', 'util', 'events', 'stream',
        // npm packages
        '@langchain/core', '@langchain/openai', '@langchain/langgraph',
        '@langchain/community', 'langchain', 'winston', 'chalk', 'inquirer',
        'ora', 'axios', 'dotenv', 'zod', 'commander'
      ]
    },
    outDir: 'dist',
    emptyOutDir: true
  },

  // Development settings
  server: {
    hmr: false // Disable HMR for Node.js apps
  },

  // Resolve settings
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/agents': resolve(__dirname, 'src/agents'),
      '@/dataflows': resolve(__dirname, 'src/dataflows'),
      '@/graph': resolve(__dirname, 'src/graph'),
      '@/cli': resolve(__dirname, 'src/cli'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/utils': resolve(__dirname, 'src/utils')
    }
  },

  // Ensure proper ES module handling
  esbuild: {
    target: 'node18',
    format: 'esm'
  }
});