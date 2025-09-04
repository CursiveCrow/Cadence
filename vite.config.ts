import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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
                main: path.resolve(__dirname, 'src/index.html')
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@types': path.resolve(__dirname, './src/types'),
            '@app': path.resolve(__dirname, './src/app'),
            '@renderer': path.resolve(__dirname, './src/renderer')
        }
    },
    plugins: [
        react(),
        electron([
            {
                // with root set to 'src', entries should be relative to it
                entry: 'main/index.ts',
                vite: {
                    build: {
                        // ensure output is at project root under dist-electron
                        outDir: '../dist-electron/main',
                        rollupOptions: {
                            external: ['electron']
                        }
                    }
                }
            },
            {
                entry: 'preload/index.ts',
                vite: {
                    build: {
                        outDir: '../dist-electron/preload',
                        rollupOptions: {
                            external: ['electron']
                        }
                    }
                }
            }
        ])
    ],
    server: {
        port: 5173,
        strictPort: true,
        open: false
    }
})
