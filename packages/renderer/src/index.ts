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

// Re-export select PixiJS classes to centralize the Pixi API surface
// and reduce the risk of multiple Pixi instances across the monorepo.
export { Application, RendererType, Rectangle, Container } from 'pixi.js'
