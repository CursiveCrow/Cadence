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
export * from './plugins/status-glyph'
export * from './resolution'
export type { RendererPlugin } from './scene'
export * from './engine'
export * from './panzoom'

// Runtime metrics for UI alignment
export type RendererMetrics = {
    resolution: number
    dayWidthPx: number
    leftMarginPx: number
}

// These are set by the engine after initialization
let __rendererMetrics: RendererMetrics | null = null

export function setRendererMetrics(m: RendererMetrics) {
    __rendererMetrics = m
    try { (window as any).__CADENCE_RENDERER_METRICS__ = m } catch { }
}

export function getRendererMetrics(): RendererMetrics | null {
    return __rendererMetrics || (typeof window !== 'undefined' ? (window as any).__CADENCE_RENDERER_METRICS__ || null : null)
}

// Re-export select PixiJS classes to centralize the Pixi API surface
// and reduce the risk of multiple Pixi instances across the monorepo.
export { Application, RendererType, Rectangle, Container } from 'pixi.js'
