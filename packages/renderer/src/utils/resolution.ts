/**
 * Centralized resolution helpers for Pixi Graphics/Text across the renderer.
 */

/**
 * Compute a sane resolution factor for vector Graphics strokes/fills.
 * Keeps lines crisp on high-DPI displays without oversampling excessively.
 */
export function computeGraphicsResolution(): number {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1
    return Math.max(1, Math.min(3, Math.round(dpr)))
}

/**
 * Compute text resolution given optional X-scale of the viewport and an oversample factor.
 * Use a modest cap to avoid heavy texture allocations on very high DPI.
 */
export function computeTextResolution(scaleX: number = 1, oversample: number = 1): number {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1
    const desired = dpr * Math.max(1, scaleX) * Math.max(1, oversample)
    return Math.max(1, Math.min(4, desired))
}



