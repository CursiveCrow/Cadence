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
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: [],
    },
  },
  resolve: {
    alias: [
      // Allow importing directly from /source/... in index.html and modules
      { find: /^\/source\//, replacement: path.resolve(__dirname, 'source') + '/' },
      { find: /^\/apps\//, replacement: path.resolve(__dirname, 'apps') + '/' },
      // First-class aliases to new source tree (no packages)
      { find: '@cadence/core', replacement: path.resolve(__dirname, 'source/core') },
      { find: '@cadence/renderer', replacement: path.resolve(__dirname, 'source/renderer') },
      { find: '@cadence/ui', replacement: path.resolve(__dirname, 'source/surface/components') },
      // '@cadence/ui' covers subpaths like styles/*
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
