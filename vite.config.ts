import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import path from 'path'

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@runtime': path.resolve(__dirname, 'src/runtime'),
      '@state': path.resolve(__dirname, 'src/state'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@domain': path.resolve(__dirname, 'src/domain'),
    },
  },
  plugins: [
    electron([
      {
        // with root set to 'src', entries are relative to it
        entry: 'main/index.ts',
        vite: {
          build: {
            // ensure output is at project root under dist-electron
            outDir: '../dist-electron/main',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      {
        entry: 'preload/index.ts',
        vite: {
          build: {
            outDir: '../dist-electron/preload',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
  ],
  server: {
    port: 5173,
    strictPort: true,
    open: false,
  },
})
