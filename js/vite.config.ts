import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  
  // For Node.js target
  build: {
    target: 'node18',
    lib: {
      entry: {
        'cli/main': resolve(__dirname, 'src/cli/main.ts'),
        'cli/shutdown-hook': resolve(__dirname, 'src/cli/shutdown-hook.ts'),
        'graph/enhanced-trading-graph': resolve(__dirname, 'src/graph/enhanced-trading-graph.ts'),
        'graph/trading-graph': resolve(__dirname, 'src/graph/trading-graph.ts'),
        'graph/langgraph-setup': resolve(__dirname, 'src/graph/langgraph-setup.ts'),
        'utils/health-monitor': resolve(__dirname, 'src/utils/health-monitor.ts')
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      external: [
        // Node.js built-ins (both node: and bare forms)
        'fs', 'path', 'url', 'crypto', 'os', 'util', 'events', 'stream', 'async_hooks',
        'child_process', 'readline', 'tty', 'process', 'buffer', 'string_decoder',
        'node:fs', 'node:path', 'node:url', 'node:crypto', 'node:os', 'node:util', 
        'node:events', 'node:stream', 'node:async_hooks', 'node:process', 'node:child_process',
        'node:readline', 'node:tty', 'node:buffer', 'node:string_decoder',
        // npm packages
        '@langchain/core', '@langchain/openai', '@langchain/langgraph',
        '@langchain/community', 'langchain', 'winston', 'chalk', 'inquirer',
        'ora', 'axios', 'dotenv', 'zod', 'commander', 'node-fetch',
        // Inquirer dependencies
        '@inquirer/prompts', '@inquirer/core', '@inquirer/external-editor',
        'chardet'
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