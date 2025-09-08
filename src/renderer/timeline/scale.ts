// keep file minimal; no imports needed

export type TimeScale = 'hour' | 'day' | 'week' | 'month'

export const DAY_THRESHOLD = 0.75
export const HOUR_THRESHOLD = 2

export function getTimeScaleForZoom(zoom: number): TimeScale {
  if (zoom >= HOUR_THRESHOLD) return 'hour'
  if (zoom >= DAY_THRESHOLD) return 'day'
  if (zoom >= 0.35) return 'week'
  return 'month'
}
