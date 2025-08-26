/**
 * Layout utilities for timeline rendering
 */

import { Staff } from '@cadence/core'
import type { TimelineConfig } from './scene'

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


