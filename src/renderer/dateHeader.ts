import { computeViewportAlignment, getTimeScaleForZoom, DAY_THRESHOLD, HOUR_THRESHOLD } from './layout'
import type { TimelineConfig } from './config'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export { DAY_THRESHOLD, HOUR_THRESHOLD }

export function computeDateHeaderHeight(zoom: number): number {
  const base = 32
  const dayBand = 24
  const hourBand = 24
  const daysProg = clamp((zoom - DAY_THRESHOLD) / 0.25, 0, 1)
  const hoursProg = clamp((zoom - HOUR_THRESHOLD) / 0.5, 0, 1)
  return Math.round(base + dayBand * daysProg + hourBand * hoursProg)
}

export interface DateHeaderParams {
  viewport: { x: number; y: number; zoom: number }
  projectStart: Date
  leftMargin: number
  dayWidth: number
  width: number
}

export interface DateHeaderViewModel {
  monthLabels: { x: number; text: string }[]
  monthTickXs: number[]
  dayLabels: { x: number; text: string }[]
  hourLabels: { x: number; text: string }[]
  dayTickXs: number[]
  hourTickXs: number[]
}

export function computeDateHeaderViewModel(params: DateHeaderParams): DateHeaderViewModel {
  const { viewport, projectStart, leftMargin, dayWidth, width } = params
  const zoom = viewport.zoom || 1

  const screenWidth = Math.max(0, Math.floor(width)) || 1200
  const dayWidthCss = dayWidth * zoom
  const leftMarginCss = leftMargin
  const alignment = computeViewportAlignment({ LEFT_MARGIN: leftMarginCss, DAY_WIDTH: dayWidthCss, TOP_MARGIN: 0, STAFF_SPACING: 0, STAFF_LINE_SPACING: 0 } as TimelineConfig, viewport.x || 0)
  const worldDayToScreenX = (dayIndex: number) => leftMarginCss + (dayIndex - alignment.viewportXDaysQuantized) * dayWidthCss
  const visibleDays = Math.ceil(screenWidth / Math.max(dayWidthCss, 0.0001)) + 5

  const scale = getTimeScaleForZoom(zoom)
  const monthLabels: { x: number; text: string }[] = []
  const monthTickXs: number[] = []
  const dayLabels: { x: number; text: string }[] = []
  const hourLabels: { x: number; text: string }[] = []
  const dayTickXs: number[] = []
  const hourTickXs: number[] = []

  const base = new Date(Date.UTC(projectStart.getUTCFullYear(), projectStart.getUTCMonth(), projectStart.getUTCDate()))
  const leftMostDays = Math.floor(alignment.viewportXDaysQuantized - leftMarginCss / Math.max(dayWidthCss, 0.0001))

  if (scale === 'month') {
    const stepDays = 30
    const remainder = (alignment.viewportXDaysQuantized % stepDays + stepDays) % stepDays
    let xCss = leftMarginCss - remainder * dayWidthCss
    const limitCss = screenWidth + 2 * dayWidthCss * visibleDays
    while (xCss < leftMarginCss + limitCss) {
      const dayIndex = Math.round((xCss - leftMarginCss) / Math.max(dayWidthCss, 0.0001))
      const date = new Date(base.getTime())
      date.setUTCDate(date.getUTCDate() + dayIndex)
      const text = date.toLocaleDateString('en-US', { month: 'short' })
      if (xCss > leftMarginCss + 1) monthTickXs.push(xCss)
      monthLabels.push({ x: xCss + 6, text })
      xCss += stepDays * dayWidthCss
    }
  } else {
    const startOffsetDays = Math.max(0, leftMostDays)
    const startDateRef = new Date(base.getTime())
    startDateRef.setUTCDate(startDateRef.getUTCDate() + startOffsetDays)
    const firstOfMonth = new Date(Date.UTC(startDateRef.getUTCFullYear(), startDateRef.getUTCMonth(), 1))
    let cursor = firstOfMonth
    const endDays = startOffsetDays + visibleDays + 60
    while (true) {
      const diffMs = cursor.getTime() - base.getTime()
      const dayIndex = Math.round(diffMs / (24 * 60 * 60 * 1000))
      if (dayIndex > endDays) break
      const text = cursor.toLocaleDateString('en-US', { month: 'short' })
      const xScreen = worldDayToScreenX(dayIndex)
      monthLabels.push({ x: xScreen + 6, text })
      if (xScreen > leftMarginCss + 1) monthTickXs.push(xScreen)
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    }
  }

  const stepDaysUniform = scale === 'hour' ? 1 / 24 : scale === 'day' ? 1 : scale === 'week' ? 7 : 30
  const remainderDays = (alignment.viewportXDaysQuantized % stepDaysUniform + stepDaysUniform) % stepDaysUniform
  const firstTickX = leftMarginCss + (0 - remainderDays) * dayWidthCss

  const remainderDay = (alignment.viewportXDaysQuantized % 1 + 1) % 1
  let x = leftMarginCss - remainderDay * dayWidthCss
  const limit = screenWidth + 2 * dayWidthCss
  while (x < leftMarginCss + limit) {
    if (x > leftMarginCss + 1) dayTickXs.push(x)
    x += dayWidthCss
  }

  if (scale === 'hour') {
    const hourWidth = Math.max(1, dayWidthCss / 24)
    let step = hourWidth >= 40 ? 1 : hourWidth >= 20 ? 2 : 4
    const totalHours = visibleDays * 24
    const startHour = Math.max(0, leftMostDays * 24)
    const firstHour = Math.max(0, Math.floor((startHour - step * 2) / step) * step)
    const endHour = startHour + totalHours + step * 2

    for (let h = firstHour; h <= endHour; h += step) {
      const hourInDay = h % 24
      let hour12 = hourInDay % 12
      if (hour12 === 0) hour12 = 12
      const ap = hourInDay < 12 ? 'a' : 'p'
      const text = `${hour12}${ap}`
      const xScreen = leftMarginCss + ((h / 24) - alignment.viewportXDaysQuantized) * dayWidthCss
      hourLabels.push({ x: xScreen, text })
    }

    let xh = firstTickX
    const hourStepPx = (1 / 24) * dayWidthCss
    xh -= hourStepPx * 48
    const limitH = screenWidth + 3 * dayWidthCss
    while (xh < leftMargin + limitH) {
      if (xh > leftMarginCss + 1) hourTickXs.push(xh)
      xh += hourStepPx
    }

    const startDay = Math.max(0, leftMostDays)
    for (let i = -5; i < visibleDays + 5; i++) {
      const d = startDay + i
      const date = new Date(base.getTime())
      date.setUTCDate(date.getUTCDate() + d)
      const text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const xScreen = worldDayToScreenX(d)
      dayLabels.push({ x: xScreen + 5, text })
    }
  } else if (scale === 'day') {
    const startDay = Math.max(0, leftMostDays)
    for (let i = -5; i < visibleDays + 5; i++) {
      const d = startDay + i
      const date = new Date(base.getTime())
      date.setUTCDate(date.getUTCDate() + d)
      const text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const xScreen = worldDayToScreenX(d)
      dayLabels.push({ x: xScreen + 5, text })
    }
  } else if (scale === 'week') {
    const startWeek = Math.max(0, Math.floor(leftMostDays / 7))
    const weeksVisible = Math.ceil(visibleDays / 7) + 5
    for (let i = -3; i < weeksVisible; i++) {
      const w = startWeek + i
      const d = w * 7
      const date = new Date(base.getTime())
      date.setUTCDate(date.getUTCDate() + d)
      const text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const xScreen = worldDayToScreenX(d)
      dayLabels.push({ x: xScreen + 6, text })
    }
  }

  return { monthLabels, monthTickXs, dayLabels, hourLabels, dayTickXs, hourTickXs }
}

