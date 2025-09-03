import type { TimelineConfig } from './config'

export type TimeScale = 'hour' | 'day' | 'week' | 'month'

export const DAY_THRESHOLD = 0.75
export const HOUR_THRESHOLD = 2

export function getTimeScaleForZoom(zoom: number): TimeScale {
  if (zoom >= HOUR_THRESHOLD) return 'hour'
  if (zoom >= DAY_THRESHOLD) return 'day'
  if (zoom >= 0.35) return 'week'
  return 'month'
}

export function computeViewportAlignment(
  config: TimelineConfig,
  viewportXDays: number
): { viewportXDaysQuantized: number; viewportPixelOffsetX: number } {
  const dayWidth = Math.max(config.DAY_WIDTH, 0.0001)
  const pixel = Math.round((viewportXDays || 0) * dayWidth)
  const viewportPixelOffsetX = -pixel
  const viewportXDaysQuantized = pixel / dayWidth
  return { viewportXDaysQuantized, viewportPixelOffsetX }
}

export function worldDayToContainerX(
  config: TimelineConfig,
  dayIndex: number,
  align: { viewportXDaysQuantized: number; viewportPixelOffsetX: number }
): number {
  const dayWidth = Math.max(config.DAY_WIDTH, 0.0001)
  const screenX = config.LEFT_MARGIN + (dayIndex - align.viewportXDaysQuantized) * dayWidth
  return screenX - align.viewportPixelOffsetX
}

