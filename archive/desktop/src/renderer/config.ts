/**
 * Shared timeline rendering configuration for PixiJS renderer
 * Now imports from centralized configuration module
 */

import type { TimelineConfig } from './core/scene'
import { TIMELINE_CONFIG as CENTRAL_TIMELINE_CONFIG, STATUS_GLYPHS, PROJECT_START_DATE } from '@cadence/config'

const __cssColorCache = new Map<string, number>()
export function clearCssColorCache(): void { __cssColorCache.clear() }

function cssVarColorToHex(varName: string, fallback: number): number {
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

// Apply CSS variable resolution to the centralized config
export const TIMELINE_CONFIG: TimelineConfig = {
  ...CENTRAL_TIMELINE_CONFIG,
  GRID_COLOR_MAJOR: cssVarColorToHex(CENTRAL_TIMELINE_CONFIG.GRID_COLOR_MAJOR as string, 0xffffff),
  GRID_COLOR_MINOR: cssVarColorToHex(CENTRAL_TIMELINE_CONFIG.GRID_COLOR_MINOR as string, 0xffffff),
  STAFF_LINE_COLOR: cssVarColorToHex(CENTRAL_TIMELINE_CONFIG.STAFF_LINE_COLOR as string, 0xd1d5db),
  SELECTION_COLOR: cssVarColorToHex(CENTRAL_TIMELINE_CONFIG.SELECTION_COLOR as string, 0xf59e0b),
  TODAY_COLOR: cssVarColorToHex(CENTRAL_TIMELINE_CONFIG.TODAY_COLOR as string, 0xf59e0b),
  MEASURE_COLOR: cssVarColorToHex(CENTRAL_TIMELINE_CONFIG.MEASURE_COLOR as string, 0xffffff),
} as TimelineConfig

// Re-export from centralized config for backward compatibility
export const STATUS_TO_ACCIDENTAL = STATUS_GLYPHS
export { PROJECT_START_DATE }

