/**
 * PixiJS v8 WebGPU renderer utilities
 * WebGPU detection and spatial indexing support
 */

export * from './core/utils/spatial'
export * from './core/utils/webgpu-check'
export * from './core/scene'
export * from './core/types/renderer'
export * from './core/dnd'
export * from './core/config'
export * from './core/utils/layout'
export * from './components/rendering/dateHeader'
export * from './components/plugins/status-glyph'
export * from './core/utils/resolution'
export type { RendererPlugin } from './core/types/renderer'
export * from './core/engine'
export * from './core/panzoom'
export * from './components/rendering/shapes'


// Re-export Application for consumers that use '@cadence/renderer'
export { Application } from 'pixi.js'
