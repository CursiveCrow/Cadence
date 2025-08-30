/**
 * Shared timeline rendering configuration for PixiJS renderer
 */

import type { TimelineConfig } from './scene'
import { PROJECT_START_DATE as SHARED_PROJECT_START_DATE } from '@cadence/config'

function cssVarColorToHex(varName: string, fallback: number): number {
  try {
    if (typeof window === 'undefined' || !window.document) return fallback
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
      return Number.isFinite(n) ? n : fallback
    }
    // rgb/rgba format
    const m = value.match(/rgba?\(([^)]+)\)/i)
    if (m) {
      const parts = m[1].split(',').map(s => parseFloat(s.trim()))
      if (parts.length >= 3) {
        const [r, g, b] = parts
        const n =
          ((Math.round(r) & 0xff) << 16) | ((Math.round(g) & 0xff) << 8) | (Math.round(b) & 0xff)
        return n >>> 0
      }
    }
    return fallback
  } catch {
    return fallback
  }
}

export const TIMELINE_CONFIG: TimelineConfig = {
  LEFT_MARGIN: 0,
  TOP_MARGIN: 60,
  DAY_WIDTH: 60,
  STAFF_SPACING: 120,
  STAFF_LINE_SPACING: 18,
  TASK_HEIGHT: 20,
  STAFF_LINE_COUNT: 5,
  BACKGROUND_COLOR: 0x1a1a1a,
  GRID_COLOR_MAJOR: cssVarColorToHex('--ui-grid-major', 0xffffff),
  GRID_COLOR_MINOR: cssVarColorToHex('--ui-grid-minor', 0xffffff),
  STAFF_LINE_COLOR: cssVarColorToHex('--ui-staff-line', 0xd1d5db),
  TASK_COLORS: {
    default: 0x8b5cf6,
    not_started: 0x6366f1,
    in_progress: 0xc084fc,
    completed: 0x10b981,
    blocked: 0xef4444,
    cancelled: 0x6b7280,
  },
  DEPENDENCY_COLOR: 0x666666,
  SELECTION_COLOR: cssVarColorToHex('--ui-color-accent', 0xf59e0b),
  TODAY_COLOR: cssVarColorToHex('--ui-color-accent', 0xf59e0b),
  DRAW_STAFF_LABELS: false,
  NOTE_START_PADDING: 2,
  // Measures: default to 7-day bars; align to project start; subtle color/width
  MEASURE_LENGTH_DAYS: 7,
  MEASURE_OFFSET_DAYS: 0,
  MEASURE_COLOR: cssVarColorToHex('--ui-color-border', 0xffffff),
  MEASURE_LINE_WIDTH_PX: 2,
}

// Mapping from task status to simple glyphs used in UI
export const STATUS_TO_ACCIDENTAL: Record<string, string> = {
  not_started: '',
  in_progress: '…',
  completed: '✓',
  blocked: '!',
  cancelled: '×',
}

// Centralized project start date used for timeline calculations
export const PROJECT_START_DATE = SHARED_PROJECT_START_DATE
