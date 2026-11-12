import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';
import { builtinModules } from 'module';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const dependencyNames: string[] = Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies, ...pkg.peerDependencies });

export default defineConfig({
  plugins: [tsconfigPaths()],
  
  // For Node.js target
  build: {
    target: 'node22',
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
      // Node app: never bundle dependencies or Node built-ins; they resolve from node_modules at runtime.
      external: (id: string) =>
        id.startsWith('node:') ||
        builtinModules.includes(id.split('/')[0] as string) ||
        dependencyNames.some((name) => id === name || id.startsWith(`${name}/`))
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
    target: 'node22',
    format: 'esm'
  }
});