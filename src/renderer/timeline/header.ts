import { getTimeScaleForZoom, DAY_THRESHOLD, HOUR_THRESHOLD } from './scale'
import { worldDaysToScreenX, dayIndexFromISO } from './math'

// Visual padding between the month tick and its text label (in CSS pixels)
const MONTH_LABEL_PADDING_PX = 6

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
    // Use base dayWidth; worldDaysToScreenX applies zoom internally. Passing dayWidthCss would double-apply zoom.
    const worldDayToScreenXCss = (dayIndex: number) => worldDaysToScreenX(dayIndex, viewport, leftMarginCss, dayWidth)
    const visibleDays = Math.ceil(screenWidth / Math.max(dayWidthCss, 1e-4)) + 5

    const scale = getTimeScaleForZoom(zoom)
    const monthLabels: { x: number; text: string }[] = []
    const monthTickXs: number[] = []
    const dayLabels: { x: number; text: string }[] = []
    const hourLabels: { x: number; text: string }[] = []
    const dayTickXs: number[] = []
    const hourTickXs: number[] = []

    const base = new Date(Date.UTC(projectStart.getUTCFullYear(), projectStart.getUTCMonth(), projectStart.getUTCDate()))
    const leftMostDays = Math.floor((viewport.x || 0) - leftMarginCss / Math.max(dayWidthCss, 1e-4))

    // Always use real calendar month boundaries (no fixed 30-day approximation)
    const startOffsetDays = Math.max(0, leftMostDays)
    const startDateRef = new Date(base.getTime())
    startDateRef.setUTCDate(startDateRef.getUTCDate() + startOffsetDays)
    const firstOfMonth = new Date(Date.UTC(startDateRef.getUTCFullYear(), startDateRef.getUTCMonth(), 1))
    let cursor = firstOfMonth
    const endDays = startOffsetDays + visibleDays + 60
    // Compute the month that contains the left edge of the viewport (for sticky label)
    const currentLeftDayIndex = Math.max(0, Math.floor(viewport.x || 0))
    const curRef = new Date(base.getTime())
    curRef.setUTCDate(curRef.getUTCDate() + currentLeftDayIndex)
    const curMonthStartISO = `${curRef.getUTCFullYear()}-${String(curRef.getUTCMonth() + 1).padStart(2, '0')}-01`
    const currentMonthStartIndex = dayIndexFromISO(curMonthStartISO, base)
    while (true) {
        // Compute the first day-of-month index robustly from an ISO date
        const yyyy = cursor.getUTCFullYear()
        const mm = String(cursor.getUTCMonth() + 1).padStart(2, '0')
        const isoMonthStart = `${yyyy}-${mm}-01`
        const monthStartIndex = dayIndexFromISO(isoMonthStart, base)
        // Empirically, header ticks render one day early relative to day ticks in some TZs; compensate by +1 day
        const tickIndex = monthStartIndex
        if (tickIndex > endDays) break
        // Format month in UTC to avoid local timezone shifting month name
        const text = cursor.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
        const xTick = worldDayToScreenXCss(tickIndex)
        // Sticky label: if the month at the viewport's left edge is this month and
        // its tick is left of the viewport, pin its label to the left margin.
        let xLabel = xTick + MONTH_LABEL_PADDING_PX
        if (monthStartIndex === currentMonthStartIndex && xTick < leftMarginCss + 1) {
            xLabel = leftMarginCss + MONTH_LABEL_PADDING_PX
        }
        monthLabels.push({ x: xLabel, text })
        if (xTick > leftMarginCss + 1) monthTickXs.push(xTick)
        cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    }

    const stepDaysUniform = scale === 'hour' ? 1 / 24 : scale === 'day' ? 1 : scale === 'week' ? 7 : 30
    const remainderDays = ((viewport.x || 0) % stepDaysUniform + stepDaysUniform) % stepDaysUniform
    const firstTickX = leftMarginCss + (0 - remainderDays) * dayWidthCss

    const remainderDay = ((viewport.x || 0) % 1 + 1) % 1
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
            const xScreen = leftMarginCss + ((h / 24) - (viewport.x || 0)) * dayWidthCss
            hourLabels.push({ x: xScreen, text })
        }

        let xh = firstTickX
        const hourStepPx = (1 / 24) * dayWidthCss
        xh -= hourStepPx * 48
        const limitH = screenWidth + 3 * dayWidthCss
        while (xh < leftMarginCss + limitH) {
            if (xh > leftMarginCss + 1) hourTickXs.push(xh)
            xh += hourStepPx
        }

        const startDay = Math.max(0, leftMostDays)
        for (let i = -5; i < visibleDays + 5; i++) {
            const d = startDay + i
            const date = new Date(base.getTime())
            date.setUTCDate(date.getUTCDate() + d)
            const text = String(date.getUTCDate())
            const xScreen = worldDayToScreenXCss(d)
            dayLabels.push({ x: xScreen + 5, text })
        }
    } else if (scale === 'day') {
        const startDay = Math.max(0, leftMostDays)
        for (let i = -5; i < visibleDays + 5; i++) {
            const d = startDay + i
            const date = new Date(base.getTime())
            date.setUTCDate(date.getUTCDate() + d)
            const text = String(date.getUTCDate())
            const xScreen = worldDayToScreenXCss(d)
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
            const xScreen = worldDayToScreenXCss(d)
            dayLabels.push({ x: xScreen + 6, text })
        }
    }

    return { monthLabels, monthTickXs, dayLabels, hourLabels, dayTickXs, hourTickXs }
}

// HMR: when this timeline header module updates, request a re-render
try {
  if (import.meta && (import.meta as any).hot) {
    (import.meta as any).hot.accept(() => {
      try { window.dispatchEvent(new CustomEvent("cadence:hmr:rerender")) } catch {}
    })
  }
} catch {}

