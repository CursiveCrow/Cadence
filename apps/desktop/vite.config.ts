import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ['@cadence/renderer'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext'
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
