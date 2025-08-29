import { getRendererMetrics } from '@cadence/renderer'

export const DAY_THRESHOLD = 0.75
export const HOUR_THRESHOLD = 2

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

/**
 * Compute the hierarchical date header height based on zoom.
 * Base band (months): 32px
 * Days band slides in after DAY_THRESHOLD up to +24px
 * Hours band slides in after HOUR_THRESHOLD up to +20px
 */
export function computeDateHeaderHeight(zoom: number): number {
    const base = 32
    const dayBand = 24
    const hourBand = 24
    const daysProg = clamp((zoom - DAY_THRESHOLD) / 0.25, 0, 1)
    const hoursProg = clamp((zoom - HOUR_THRESHOLD) / 0.5, 0, 1)
    // Smooth, continuous growth to avoid snap when bands appear
    return Math.round(base + dayBand * daysProg + hourBand * hoursProg)
}

export interface DateHeaderParams {
    viewport: { x: number; y: number; zoom: number }
    projectStart: Date
    leftMargin: number
    dayWidth: number
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
    const { viewport, projectStart, leftMargin, dayWidth } = params
    const zoom = viewport.zoom || 1
    const startDate = projectStart

    const screenWidth = window.innerWidth || 1200
    const metrics = getRendererMetrics()
    const res = metrics?.resolution || (window.devicePixelRatio || 1)
    const effDayDevice = dayWidth * zoom
    const leftMarginDevice = metrics?.leftMarginPx ?? leftMargin
    const dayWidthCss = effDayDevice / res
    const effectiveDayWidth = dayWidthCss
    const worldToScreen = (worldX: number) => (worldX - viewport.x * effDayDevice) / res
    const visibleDays = Math.ceil(screenWidth / Math.max(effectiveDayWidth, 0.0001)) + 5

    const getScaleForZoom = (z: number) => {
        if (z >= 2) return 'hour' as const
        if (z >= 0.75) return 'day' as const
        if (z >= 0.35) return 'week' as const
        return 'month' as const
    }

    const scale = getScaleForZoom(zoom)
    const monthLabels: { x: number; text: string }[] = []
    const monthTickXs: number[] = []
    const dayLabels: { x: number; text: string }[] = []
    const hourLabels: { x: number; text: string }[] = []
    const dayTickXs: number[] = []
    const hourTickXs: number[] = []

    const base = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()))
    const leftMostDays = Math.floor(viewport.x - leftMarginDevice / Math.max(effDayDevice, 0.0001))

    if (scale === 'month') {
        const stepDays = 30
        const remainder = (viewport.x % stepDays + stepDays) % stepDays
        let xDev = leftMarginDevice - remainder * effDayDevice
        const limitDev = screenWidth * res + 2 * effDayDevice * visibleDays
        while (xDev < leftMarginDevice + limitDev) {
            const xCss = xDev / res
            const dayIndex = Math.round((xDev - leftMarginDevice) / Math.max(effDayDevice, 0.0001))
            const date = new Date(base.getTime())
            date.setUTCDate(date.getUTCDate() + dayIndex)
            const text = date.toLocaleDateString('en-US', { month: 'short' })
            monthTickXs.push(xCss)
            monthLabels.push({ x: xCss + 6, text })
            xDev += stepDays * effDayDevice
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
            const xWorld = leftMarginDevice + dayIndex * effDayDevice
            const xScreen = worldToScreen(xWorld)
            monthLabels.push({ x: xScreen + 6, text })
            monthTickXs.push(xScreen)
            cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
        }
    }

    const stepDaysUniform = scale === 'hour' ? 1 / 24 : scale === 'day' ? 1 : scale === 'week' ? 7 : 30
    const remainderDays = (viewport.x % stepDaysUniform + stepDaysUniform) % stepDaysUniform
    const firstTickX = (leftMarginDevice + (0 - remainderDays) * effDayDevice) / res

    const remainderDay = (viewport.x % 1 + 1) % 1
    let x = (leftMarginDevice - remainderDay * effDayDevice) / res
    const limit = screenWidth + 2 * effectiveDayWidth
    while (x < leftMarginDevice / res + limit) {
        dayTickXs.push(x)
        x += (1 * effDayDevice) / res
    }

    if (scale === 'hour') {
        const hourWidth = Math.max(1, effectiveDayWidth / 24)
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
            const xWorld = leftMarginDevice + (h / 24) * effDayDevice
            const xScreen = worldToScreen(xWorld)
            hourLabels.push({ x: xScreen, text })
        }

        let xh = firstTickX
        const hourStepPx = (1 / 24) * effectiveDayWidth
        xh -= hourStepPx * 48
        const limitH = screenWidth + 3 * effectiveDayWidth
        while (xh < leftMargin + limitH) {
            hourTickXs.push(xh)
            xh += hourStepPx
        }

        const startDay = Math.max(0, leftMostDays)
        for (let i = -5; i < visibleDays + 5; i++) {
            const d = startDay + i
            const date = new Date(base.getTime())
            date.setUTCDate(date.getUTCDate() + d)
            const text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const xWorld = leftMarginDevice + d * effDayDevice
            const xScreen = worldToScreen(xWorld)
            dayLabels.push({ x: xScreen + 5, text })
        }
    } else if (scale === 'day') {
        const startDay = Math.max(0, leftMostDays)
        for (let i = -5; i < visibleDays + 5; i++) {
            const d = startDay + i
            const date = new Date(base.getTime())
            date.setUTCDate(date.getUTCDate() + d)
            const text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const xWorld = leftMarginDevice + d * effDayDevice
            const xScreen = worldToScreen(xWorld)
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
            const xWorld = leftMargin + d * effectiveDayWidth
            const xScreen = worldToScreen(xWorld)
            dayLabels.push({ x: xScreen + 6, text })
        }
    }

    return { monthLabels, monthTickXs, dayLabels, hourLabels, dayTickXs, hourTickXs }
}


