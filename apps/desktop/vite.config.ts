import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ['@cadence/renderer', '@cadence/config', '@cadence/contracts', '@cadence/platform-services'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext'
  },
  resolve: {
    alias: {
      '@cadence/core': path.resolve(__dirname, '../../packages/core/src'),
      '@cadence/crdt': path.resolve(__dirname, '../../packages/crdt/src'),
      '@cadence/renderer': path.resolve(__dirname, '../../packages/renderer/src'),
      '@cadence/state': path.resolve(__dirname, '../../packages/state/src'),
      '@cadence/config': path.resolve(__dirname, '../../packages/config/src'),
      '@cadence/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@cadence/platform-services': path.resolve(__dirname, '../../packages/platform-services/src'),
      '@cadence/fixtures': path.resolve(__dirname, '../../packages/fixtures/src'),
      '@cadence/ui': path.resolve(__dirname, '../../packages/ui/src')
      , '@cadence/renderer-react': path.resolve(__dirname, '../../packages/renderer-react/src')
    }
  },
  plugins: [
    react(),
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
              external: ['electron']
            }
          },
          resolve: {
            alias: {
              '@cadence/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
              '@cadence/config': path.resolve(__dirname, '../../packages/config/src')
            }
          }
        }
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
              external: ['electron']
            }
          },
          resolve: {
            alias: {
              '@cadence/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
              '@cadence/config': path.resolve(__dirname, '../../packages/config/src')
            }
          }
        }
      }
    ]),
    // Use electron-renderer for Node.js integration in renderer
    renderer()
  ],
  server: {
    port: 5173,
    strictPort: true
  },
  clearScreen: false
})
