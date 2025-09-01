import { defineConfig } from 'vite'

export default defineConfig({
    root: 'source',
    publicDir: 'public',
    base: '',
    server: {
        port: 5173,
        strictPort: true,
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    },
    esbuild: {
        jsx: 'automatic',
        jsxImportSource: 'react',
    },
})


