/**
 * Layout utilities for timeline rendering
 */

import { Staff } from '@cadence/core'
import type { TimelineConfig } from './scene'

export type TimeScale = 'hour' | 'day' | 'week' | 'month'

export function getTimeScaleForZoom(zoom: number): TimeScale {
  if (zoom >= 2) return 'hour'
  if (zoom >= 0.75) return 'day'
  if (zoom >= 0.35) return 'week'
  return 'month'
}

/**
 * Convert an x coordinate to the nearest time tick based on current zoom.
 * Returns snapped x and offset in milliseconds from project start.
 * Note: For 'month' scale, we snap to the first day of months.
 */
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
  // month scale: snap to first day of month boundaries
  {
    const msPerDay = 24 * 60 * 60 * 1000
    const days = Math.max(0, Math.round(relDays))
    const base = new Date(Date.UTC(
      projectStartDate.getUTCFullYear(),
      projectStartDate.getUTCMonth(),
      projectStartDate.getUTCDate()
    ))
    const target = new Date(base.getTime() + days * msPerDay)
    // Snap to first of month following/closest
    const monthStart = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), 1))
    const offsetMs = monthStart.getTime() - base.getTime()
    const dayIndex = Math.round(offsetMs / msPerDay)
    const snappedX = config.LEFT_MARGIN + dayIndex * dayWidth
    return { snappedX, offsetMs, dayIndex, scale }
  }
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
  const year = projectStartDate.getUTCFullYear()
  const month = projectStartDate.getUTCMonth()
  const day = projectStartDate.getUTCDate()
  const utcDate = new Date(Date.UTC(year, month, day + dayIndex))
  return utcDate.toISOString().split('T')[0]
}

export function offsetMsToIsoDateUTC(offsetMs: number, projectStartDate: Date): string {
  const base = Date.UTC(
    projectStartDate.getUTCFullYear(),
    projectStartDate.getUTCMonth(),
    projectStartDate.getUTCDate()
  )
  const utcDate = new Date(base + offsetMs)
  return utcDate.toISOString().split('T')[0]
}


