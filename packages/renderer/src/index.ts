/**
 * PixiJS v8 WebGPU renderer utilities
 * WebGPU detection and spatial indexing support
 */

export * from './spatial'
export * from './webgpu-check'
export * from './scene'
export * from './dnd'
export * from './config'
export * from './layout'
export * from './dateHeader'
export * from './plugins/status-glyph'
export * from './resolution'
export type { RendererPlugin } from './scene'
export * from './engine'
export * from './panzoom'
export * from './shapes'


// Re-export select PixiJS classes to centralize the Pixi API surface
// and reduce the risk of multiple Pixi instances across the monorepo.
export { Application, RendererType, Rectangle, Container } from 'pixi.js'
