/**
 * Cadence Renderer Public API (narrowed)
 * - Minimal config and helpers for UI consumers
 * - Factory to create a renderer instance behind a stable port
 */

export { TIMELINE_CONFIG } from './core/config'
export {
  findNearestStaffLineAt,
  snapXToDayWithConfig,
  dayIndexToIsoDateUTC,
  DAY_THRESHOLD,
  HOUR_THRESHOLD,
} from './core/utils/layout'
export { computeDateHeaderHeight, computeDateHeaderViewModel } from './components/rendering/dateHeader'
export type { DateHeaderViewModel } from './components/rendering/dateHeader'

// Renderer Port
export type { TimelineConfig } from './core/types/renderer'
export { createRenderer } from './public/rendererPort'
export { statusToAccidental } from './core/utils/status'
