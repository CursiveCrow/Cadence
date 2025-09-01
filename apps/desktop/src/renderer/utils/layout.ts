import { Staff } from '@cadence/core'
import type { TimelineConfig, TaskLike, TaskLayout } from '../core/scene'

export type TimeScale = 'hour' | 'day' | 'week' | 'month'
import { LAYOUT_THRESHOLDS } from '@cadence/config'

// Re-export for backward compatibility
export const DAY_THRESHOLD = LAYOUT_THRESHOLDS.DAY_THRESHOLD
export const HOUR_THRESHOLD = LAYOUT_THRESHOLDS.HOUR_THRESHOLD

export function computeEffectiveConfig(
  base: TimelineConfig,
  zoom: number,
  verticalScale: number
): TimelineConfig {
  const effDay = Math.max(base.DAY_WIDTH * (zoom || 1), 3)
  return {
    ...base,
    DAY_WIDTH: effDay,
    HOUR_WIDTH: effDay / 24,
    WEEK_WIDTH: effDay * 7,
    MONTH_WIDTH: effDay * 30,
    TOP_MARGIN: Math.round(base.TOP_MARGIN * verticalScale),
    STAFF_SPACING: Math.max(20, Math.round(base.STAFF_SPACING * verticalScale)),
    STAFF_LINE_SPACING: Math.max(8, Math.round(base.STAFF_LINE_SPACING * verticalScale)),
    TASK_HEIGHT: Math.max(14, Math.round(base.TASK_HEIGHT * verticalScale)),
  } as TimelineConfig
}
export function getTimeScaleForZoom(zoom: number): TimeScale {
  if (zoom >= HOUR_THRESHOLD) return 'hour'
  if (zoom >= DAY_THRESHOLD) return 'day'
  if (zoom >= 0.35) return 'week'
  return 'month'
}
export function snapXToTimeWithConfig(
  x: number,
  config: TimelineConfig,
  zoom: number,
  projectStartDate: Date
): { snappedX: number; offsetMs: number; dayIndex: number; scale: TimeScale } {
  const scale = getTimeScaleForZoom(zoom)
  const dayWidth = config.DAY_WIDTH
  const relDays = (x - config.LEFT_MARGIN) / Math.max(dayWidth, 0.0001)
  if (scale === 'hour') {
    const hours = Math.round(relDays * 24)
    const snappedX = config.LEFT_MARGIN + (hours / 24) * dayWidth
    const offsetMs = hours * 60 * 60 * 1000
    const dayIndex = Math.floor(hours / 24)
    return { snappedX, offsetMs, dayIndex, scale }
  }
  if (scale === 'day') {
    const dayIndex = Math.round(relDays)
    const snappedX = config.LEFT_MARGIN + dayIndex * dayWidth
    const offsetMs = dayIndex * 24 * 60 * 60 * 1000
    return { snappedX, offsetMs, dayIndex, scale }
  }
  if (scale === 'week') {
    const weeks = Math.round(relDays / 7)
    const snappedX = config.LEFT_MARGIN + weeks * 7 * dayWidth
    const dayIndex = weeks * 7
    const offsetMs = dayIndex * 24 * 60 * 60 * 1000
    return { snappedX, offsetMs, dayIndex, scale }
  }
  const msPerDay = 24 * 60 * 60 * 1000
  const days = Math.max(0, Math.round(relDays))
  const base = new Date(
    Date.UTC(
      projectStartDate.getUTCFullYear(),
      projectStartDate.getUTCMonth(),
      projectStartDate.getUTCDate()
    )
  )
  const target = new Date(base.getTime() + days * msPerDay)
  const monthStart = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), 1))
  const offsetMs = monthStart.getTime() - base.getTime()
  const dayIndex = Math.round(offsetMs / msPerDay)
  const snappedX = config.LEFT_MARGIN + dayIndex * dayWidth
  return { snappedX, offsetMs, dayIndex, scale }
}
export function findNearestStaffLineAt(
  y: number,
  staffs: Staff[],
  config: TimelineConfig
): { staff: Staff; staffLine: number; centerY: number } | null {
  if (!staffs || staffs.length === 0) return null
  let closest: { staff: Staff; staffLine: number; centerY: number } | null = null
  let minDistance = Infinity
  const halfStep = config.STAFF_LINE_SPACING / 2
  for (let i = 0; i < staffs.length; i++) {
    const staff = staffs[i]
    const staffStartY = config.TOP_MARGIN + i * config.STAFF_SPACING
    const maxIndex = (staff.numberOfLines - 1) * 2
    for (let idx = 0; idx <= maxIndex; idx++) {
      const centerY = staffStartY + idx * halfStep
      const dist = Math.abs(y - centerY)
      if (dist < minDistance) {
        minDistance = dist
        closest = { staff, staffLine: idx, centerY }
      }
    }
  }
  return closest
}
export function snapXToDayWithConfig(
  x: number,
  config: TimelineConfig
): { snappedX: number; dayIndex: number } {
  const relative = (x - config.LEFT_MARGIN) / config.DAY_WIDTH
  const dayIndex = Math.round(relative)
  const snappedX = config.LEFT_MARGIN + dayIndex * config.DAY_WIDTH
  return { snappedX, dayIndex }
}
export function dayIndexToIsoDateUTC(dayIndex: number, projectStartDate: Date): string {
  const base = new Date(
    Date.UTC(
      projectStartDate.getUTCFullYear(),
      projectStartDate.getUTCMonth(),
      projectStartDate.getUTCDate()
    )
  )
  const date = new Date(base.getTime() + dayIndex * 24 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 10)
}
export function computeTaskLayout(
  config: TimelineConfig,
  task: TaskLike & { startDate: string; durationDays: number; staffId: string; staffLine: number },
  projectStartDate: Date,
  staffs: Staff[]
): TaskLayout {
  const start = new Date(task.startDate)
  const base = new Date(
    Date.UTC(
      projectStartDate.getUTCFullYear(),
      projectStartDate.getUTCMonth(),
      projectStartDate.getUTCDate()
    )
  )
  const dayIndex = Math.max(
    0,
    Math.round((start.getTime() - base.getTime()) / (24 * 60 * 60 * 1000))
  )
  const startX = config.LEFT_MARGIN + dayIndex * config.DAY_WIDTH
  const width = Math.max(config.DAY_WIDTH * Math.max(1, task.durationDays), config.DAY_WIDTH)
  const staffIndex = staffs.findIndex(s => s.id === task.staffId)
  const staffStartY =
    config.TOP_MARGIN + (staffIndex === -1 ? 0 : staffIndex * config.STAFF_SPACING)
  const centerY = staffStartY + (task.staffLine * config.STAFF_LINE_SPACING) / 2
  const topY = centerY - config.TASK_HEIGHT / 2
  const radius = config.TASK_HEIGHT / 2
  return { startX, centerY, topY, width, radius }
}
export function getGridParamsForZoom(
  zoom: number,
  projectStartDate: Date
): {
  minorWidthPx: number
  majorWidthPx: number
  minorStepDays: number
  majorStepDays: number
  minorAlpha: number
  majorAlpha: number
  scaleType: TimeScale
  baseDow: number
  weekendAlpha: number
  globalAlpha: number
} {
  const scale = getTimeScaleForZoom(zoom)
  const minorWidthPx = 0.25
  const majorWidthPx = 1
  const minorStepDays = zoom >= 2 ? 1.0 / 24.0 : zoom >= 0.75 ? 1.0 : zoom >= 0.35 ? 7.0 : 30.0
  const majorStepDays = zoom >= 2 ? 1.0 : zoom >= 0.75 ? 7.0 : zoom >= 0.35 ? 30.0 : 30.0
  const minorAlpha = zoom >= 2 ? 0.22 : zoom >= 0.75 ? 0.35 : 0.22
  const majorAlpha = zoom >= 2 ? 0.6 : zoom >= 0.75 ? 0.9 : 0.5
  const baseDow = new Date(projectStartDate).getUTCDay()
  const weekendAlpha = zoom >= 2 || zoom >= 0.75 ? 0.2 : 0.0
  const globalAlpha = 0.25
  return {
    minorWidthPx,
    majorWidthPx,
    minorStepDays,
    majorStepDays,
    minorAlpha,
    majorAlpha,
    scaleType: scale,
    baseDow,
    weekendAlpha,
    globalAlpha,
  }
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
export function worldDayToScreenX(
  config: TimelineConfig,
  dayIndex: number,
  align: { viewportXDaysQuantized: number }
): number {
  return config.LEFT_MARGIN + (dayIndex - align.viewportXDaysQuantized) * config.DAY_WIDTH
}
export function worldDayToContainerX(
  config: TimelineConfig,
  dayIndex: number,
  align: { viewportXDaysQuantized: number; viewportPixelOffsetX: number }
): number {
  return worldDayToScreenX(config, dayIndex, align) - align.viewportPixelOffsetX
}
export function getMeasureMarkerXsAligned(
  config: TimelineConfig,
  extendedWidth: number,
  align: { viewportXDaysQuantized: number; viewportPixelOffsetX: number },
  opts?: { measureLengthDays?: number; measureOffsetDays?: number }
): number[] {
  const measureLen = Math.max(
    1,
    Math.round(opts?.measureLengthDays ?? (config as any).MEASURE_LENGTH_DAYS ?? 0)
  )
  if (measureLen <= 0) return []
  const dayWidth = Math.max(1, config.DAY_WIDTH)
  const measureOffsetDays = Math.round(
    opts?.measureOffsetDays ?? (config as any).MEASURE_OFFSET_DAYS ?? 0
  )
  const stepDays = measureLen
  const leftWorldDays =
    align.viewportXDaysQuantized + (align.viewportPixelOffsetX - config.LEFT_MARGIN) / dayWidth
  const rightWorldDays =
    align.viewportXDaysQuantized +
    (align.viewportPixelOffsetX + extendedWidth - config.LEFT_MARGIN) / dayWidth
  const firstK = Math.floor((leftWorldDays - measureOffsetDays) / stepDays) - 1
  const lastK = Math.ceil((rightWorldDays - measureOffsetDays) / stepDays) + 1
  const xs: number[] = []
  for (let k = firstK; k <= lastK; k++) {
    const dayIndex = k * stepDays + measureOffsetDays
    const x = worldDayToContainerX(config, dayIndex, align)
    if (x < -2) continue
    if (x > extendedWidth + 2) break
    xs.push(x)
  }
  return xs
}
