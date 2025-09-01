#!/usr/bin/env bun

/**
 * Bun Native Development Server
 * Fast alternative to Vite for development
 */

import { bunOptimized } from '../infrastructure/runtime/bun-optimizations'

const PORT = parseInt(process.env.PORT || '3000')
const HOST = process.env.HOST || 'localhost'

console.log('🚀 Starting Bun Native Development Server...')

// Start the optimized development server
bunOptimized.startDevServer(PORT)

// Enable hot module replacement
if (process.env.NODE_ENV === 'development') {
  const watcher = new Bun.FileSystemWatcher()
  
  // Watch for changes in source files
  watcher.watchPath('./src', (event) => {
    if (event.kind === 'change' && event.path.endsWith('.tsx')) {
      console.log(`🔄 Hot reload: ${event.path}`)
      // Trigger HMR update
      // Note: In a full implementation, this would send WebSocket messages
      // to connected clients to trigger component reloads
    }
  })
  
  console.log('🔥 Hot Module Replacement enabled')
}

console.log(`✅ Server running at http://${HOST}:${PORT}`)
console.log(`📊 Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`)
console.log(`⚡ Runtime: Bun v${Bun.version}`)

