import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: [
      '@cadence/renderer',
      '@cadence/config',
      '@cadence/contracts',
      '@cadence/platform-services',
      '@sqlite.org/sqlite-wasm',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: ['@sqlite.org/sqlite-wasm'],
    },
  },
  resolve: {
    alias: [
      // Allow importing directly from /source/... in index.html and modules
      { find: /^\/source\//, replacement: path.resolve(__dirname, 'source') + '/' },
      // First-class aliases to new source tree (no packages)
      { find: '@cadence/core', replacement: path.resolve(__dirname, 'source/core') },
      { find: '@cadence/state', replacement: path.resolve(__dirname, 'source/infrastructure/persistence') },
      { find: '@cadence/crdt', replacement: path.resolve(__dirname, 'source/infrastructure/persistence/crdt') },
      { find: '@cadence/renderer', replacement: path.resolve(__dirname, 'source/renderer') },
      { find: '@cadence/renderer-react', replacement: path.resolve(__dirname, 'source/surface/components/renderer-react') },
      { find: '@cadence/platform-services', replacement: path.resolve(__dirname, 'source/infrastructure/platform/services') },
      { find: '@cadence/contracts', replacement: path.resolve(__dirname, 'source/infrastructure/platform/contracts') },
      { find: '@cadence/ui', replacement: path.resolve(__dirname, 'source/surface/components') },
      { find: '@cadence/config', replacement: path.resolve(__dirname, 'source/config') },
      { find: '@cadence/fixtures', replacement: path.resolve(__dirname, 'source/config/fixtures') },
      // CSS path alias that tsconfig-paths doesn't catch for styles imports
      { find: '@cadence/ui/styles', replacement: path.resolve(__dirname, 'source/surface/components/styles') },
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [path.resolve(__dirname, '.')] },
  },
  plugins: [
    react(),
    tsconfigPaths(),
    electron([
      {
        // Main process entry point
        entry: 'source/infrastructure/platform/electron/main.ts',
        onstart(options: any) {
          options.startup()
        },
        vite: {
          build: {
            sourcemap: true,
            minify: process.env.NODE_ENV === 'production',
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
          resolve: {},
          plugins: [tsconfigPaths()],
        },
      },
      {
        // Preload script
        entry: 'source/infrastructure/platform/electron/preload.ts',
        onstart(options: any) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete
          if (options.reload) {
            options.reload()
          }
        },
        vite: {
          build: {
            sourcemap: 'inline',
            minify: process.env.NODE_ENV === 'production',
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
          resolve: {},
          plugins: [tsconfigPaths()],
        },
      },
    ]),
    // Use electron-renderer for Node.js integration in renderer
    renderer(),
  ],
  clearScreen: false,
})
