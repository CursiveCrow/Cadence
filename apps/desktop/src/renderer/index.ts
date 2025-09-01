/**
 * PixiJS v8 WebGPU renderer utilities
 * WebGPU detection and spatial indexing support
 */

export * from './utils/spatial'
export * from './utils/webgpu-check'
export * from './core/scene'
export * from './core/dnd'
export * from './config'
export * from './utils/layout'
export * from './rendering/dateHeader'
export * from './plugins/status-glyph'
export * from './utils/resolution'
export type { RendererPlugin } from './core/scene'
export * from './core/engine'
export * from './core/panzoom'
export * from './rendering/shapes'

// Re-export select PixiJS classes to centralize the Pixi API surface
// and reduce the risk of multiple Pixi instances across the monorepo.
export { Application, RendererType, Rectangle, Container } from 'pixi.js'

