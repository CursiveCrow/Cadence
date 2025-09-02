/**
 * CSS variable color utilities for renderer config.
 */

const __cssColorCache = new Map<string, number>()

/**
 * Resolve a CSS variable to a numeric hex color suitable for Pixi, with caching and fallbacks.
 */
export function cssVarColorToHex(varName: string, fallback: number): number {
    try {
        if (typeof window === 'undefined' || !window.document) return fallback
        const cached = __cssColorCache.get(varName)
        if (typeof cached === 'number') return cached
        const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
        if (!value) return fallback
        // Hex format
        if (value.startsWith('#')) {
            const hex = value.slice(1)
            const n = parseInt(
                hex.length === 3
                    ? hex
                        .split('')
                        .map(c => c + c)
                        .join('')
                    : hex,
                16
            )
            const fin = Number.isFinite(n) ? n : fallback
            __cssColorCache.set(varName, fin)
            return fin
        }
        // rgb/rgba format
        const m = value.match(/rgba?\(([^)]+)\)/i)
        if (m) {
            const parts = m[1].split(',').map(s => parseFloat(s.trim()))
            if (parts.length >= 3) {
                const [r, g, b] = parts
                const n =
                    ((Math.round(r) & 0xff) << 16) | ((Math.round(g) & 0xff) << 8) | (Math.round(b) & 0xff)
                const fin = n >>> 0
                __cssColorCache.set(varName, fin)
                return fin
            }
        }
        return fallback
    } catch {
        return fallback
    }
}

/**
 * Convert packed 0xRRGGBB to normalized {r,g,b} in [0,1].
 */
export function hexToRgb01(hex: number): { r: number; g: number; b: number } {
    const r = ((hex >> 16) & 0xff) / 255
    const g = ((hex >> 8) & 0xff) / 255
    const b = (hex & 0xff) / 255
    return { r, g, b }
}


