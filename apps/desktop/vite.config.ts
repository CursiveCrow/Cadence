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
      '@cadence/renderer/react',
      '@cadence/config',
      '@cadence/contracts',
      '@cadence/platform-services',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      // CSS path alias that tsconfig-paths doesn't catch for styles imports
      '@cadence/ui/styles': path.resolve(__dirname, '../../packages/ui/src/styles'),
      '@cadence/config': path.resolve(__dirname, '../../packages/config/src'),
      '@cadence/renderer': path.resolve(__dirname, '../../packages/renderer/src'),
      '@cadence/renderer/react': path.resolve(__dirname, '../../packages/renderer/src/react'),
    },
  },
  plugins: [
    react(),
    tsconfigPaths(),
    electron([
      {
        // Main process entry point
        entry: 'electron/main.ts',
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
        entry: 'electron/preload.ts',
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
  server: {
    port: 5173,
    strictPort: true,
  },
  clearScreen: false,
})
