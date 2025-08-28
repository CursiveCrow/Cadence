import React, { useMemo, useRef } from 'react'
import '../styles/tokens.css'
import '../styles/ui.css'
import { DAY_THRESHOLD, HOUR_THRESHOLD, computeDateHeaderHeight } from './dateHeaderUtils'
import { getRendererMetrics } from '@cadence/renderer'

export interface DateHeaderProps {
    viewport: { x: number; y: number; zoom: number }
    projectStart: Date
    leftMargin: number
    dayWidth: number
    height?: number
    onZoomChange?: (newZoom: number, anchorLocalX: number) => void
}

export const DateHeader: React.FC<DateHeaderProps> = ({ viewport, projectStart, leftMargin, dayWidth, height = 32, onZoomChange }) => {
    const zoom = viewport.zoom || 1
    const startDate = useMemo(() => projectStart, [projectStart])
    const dragRef = useRef<{ active: boolean; originLocalX: number; startZoom: number }>({ active: false, originLocalX: 0, startZoom: zoom })

    const dynamicHeight = Math.max(height, computeDateHeaderHeight(zoom))
    const containerStyle: React.CSSProperties = {
        height: `${dynamicHeight}px`,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        border: 'none',
        zIndex: 2
    }

    const { monthLabels, monthTickXs, dayLabels, hourLabels, dayTickXs, hourTickXs } = useMemo(() => {
        const screenWidth = window.innerWidth || 1200
        // Engine renders with scale=1 and inflates DAY_WIDTH by zoom. Mirror that here.
        const metrics = getRendererMetrics()
        const res = metrics?.resolution || (window.devicePixelRatio || 1)
        const effDayDevice = (dayWidth * zoom)
        const leftMarginDevice = (metrics?.leftMarginPx ?? leftMargin)
        const dayWidthCss = effDayDevice / res
        const effectiveDayWidth = dayWidthCss
        // viewport.x is measured in days; worldX is in pixels. Use subpixel positions for exact alignment with WebGL grid.
        const worldToScreen = (worldX: number) => ((worldX - viewport.x * effDayDevice) / res)
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
        // viewport.x is in days. Compute the leftmost visible day index accounting for the left margin in pixels.
        const leftMostDays = Math.floor(viewport.x - (leftMarginDevice / Math.max(effDayDevice, 0.0001)))

        // Month labels: align with GPU grid. At month scale, grid uses fixed 30-day steps.
        if (scale === 'month') {
            const stepDays = 30
            const remainder = ((viewport.x % stepDays) + stepDays) % stepDays
            let xDev = leftMarginDevice - remainder * effDayDevice
            const limitDev = (screenWidth * res) + 2 * effDayDevice * visibleDays
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
            // For finer scales, place month labels on true calendar month starts
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

        // Compute uniform tick sequences aligned to projectStart using same step as GPU grid
        const stepDaysUniform = scale === 'hour' ? (1 / 24) : scale === 'day' ? 1 : scale === 'week' ? 7 : 30
        const remainderDays = ((viewport.x % stepDaysUniform) + stepDaysUniform) % stepDaysUniform
        const firstTickX = (leftMarginDevice + (0 - remainderDays) * effDayDevice) / res
        {
            // dayTicks for day/week/hour (one per whole day)
            const remainderDay = ((viewport.x % 1) + 1) % 1
            let x = (leftMarginDevice - remainderDay * effDayDevice) / res
            const limit = screenWidth + 2 * effectiveDayWidth
            while (x < (leftMarginDevice / res) + limit) {
                dayTickXs.push(x)
                x += (1 * effDayDevice) / res
            }
        }
        if (scale === 'hour') {
            // Dynamic density: 4h → 2h → 1h as you zoom in
            const hourWidth = Math.max(1, effectiveDayWidth / 24)
            let step = 4
            if (hourWidth >= 40) step = 1
            else if (hourWidth >= 20) step = 2

            const totalHours = visibleDays * 24
            const startHour = Math.max(0, leftMostDays * 24)
            // start a little before, snapped to step
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
                // center label on tick (no rounding for perfect line-up)
                hourLabels.push({ x: xScreen, text })
            }
            // Minor hour ticks at every hour using uniform sequence aligned to project start
            let xh = firstTickX
            const hourStepPx = (1 / 24) * effectiveDayWidth
            // Back up to ensure coverage
            xh -= hourStepPx * 48
            const limitH = screenWidth + 3 * effectiveDayWidth
            while (xh < leftMargin + limitH) {
                hourTickXs.push(xh)
                xh += hourStepPx
            }
            // Also compute day labels when zoomed to hour
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
            // Day ticks already generated uniformly above; skip duplicates
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
            // Day ticks already generated uniformly above; skip duplicates
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
        } else {
            // month scale only; monthLabels already computed above
        }

        return { monthLabels, monthTickXs, dayLabels, hourLabels, dayTickXs, hourTickXs }
    }, [viewport.x, zoom, leftMargin, dayWidth, startDate])

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 1) return
        try { e.preventDefault() } catch { }
        try { e.stopPropagation() } catch { }
        try { (e.currentTarget as any).setPointerCapture?.(e.pointerId) } catch { }
        dragRef.current.active = true
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        dragRef.current.originLocalX = e.clientX - rect.left
        dragRef.current.startZoom = viewport.zoom || 1
    }
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current.active) return
        if (!onZoomChange) return
        try { e.preventDefault() } catch { }
        const start = dragRef.current.startZoom
        // Use movement relative to initial location for consistent rate
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const currentLocalX = e.clientX - rect.left
        const dx = currentLocalX - dragRef.current.originLocalX
        const factor = Math.pow(1.01, dx)
        // Increase max zoom ceiling to allow tighter hour spacing
        const next = Math.max(0.1, Math.min(20, Math.round(start * factor * 100) / 100))
        onZoomChange(next, dragRef.current.originLocalX)
    }
    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        dragRef.current.active = false
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { }
        try { e.preventDefault() } catch { }
    }
    const onPointerLeave = () => { dragRef.current.active = false }

    // Slide-in transitions: days appear as zoom exceeds DAY_THRESHOLD; hours after HOUR_THRESHOLD
    const daysProgress = Math.max(0, Math.min(1, (zoom - DAY_THRESHOLD) / 0.25))
    const hoursProgress = Math.max(0, Math.min(1, (zoom - HOUR_THRESHOLD) / 0.5))
    const bandH = 24
    const monthTop = 0
    // Smooth slide: day band from 0 -> 24px; hour band from 24px -> 48px
    const dayTop = bandH * daysProgress
    const hourTop = bandH + bandH * hoursProgress

    return (
        <div className="ui-datehdr ui-text" style={containerStyle} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerLeave}>
            {/* Months band */}
            <div className="ui-absolute ui-datehdr-band" style={{ left: 0, right: 0, top: monthTop }}>
                {/* subtle separator */}
                <div className="ui-datehdr-sep" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
                {monthLabels.map((d, i) => (
                    <div key={`m-${i}`} className="ui-absolute ui-datehdr-label ui-datehdr-month ui-font-700" style={{ top: '50%', left: `${d.x}px`, transform: 'translateY(-50%)', whiteSpace: 'nowrap' }}>{d.text}</div>
                ))}
                {/* vertical ticks each month */}
                {monthTickXs.map((x, i) => (
                    <div key={`mt-${i}`} className="ui-datehdr-tick ui-datehdr-tick-strong" style={{ left: `${x}px` }} />
                ))}
            </div>
            {/* Days band */}
            <div className="ui-absolute ui-datehdr-band" style={{ left: 0, right: 0, top: dayTop, opacity: daysProgress }}>
                <div className="ui-datehdr-sep" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
                {dayLabels.map((d, i) => (
                    <div key={`d-${i}`} className="ui-absolute ui-datehdr-label ui-datehdr-day" style={{ top: '50%', left: `${d.x}px`, transform: 'translateY(-50%)', whiteSpace: 'nowrap' }}>{d.text}</div>
                ))}
                {dayTickXs.map((x, i) => (
                    <div key={`dt-${i}`} className="ui-datehdr-tick" style={{ left: `${x}px` }} />
                ))}
            </div>
            {/* Hours band */}
            <div className="ui-absolute ui-datehdr-band" style={{ left: 0, right: 0, top: hourTop, opacity: hoursProgress }}>
                <div className="ui-datehdr-sep" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
                {hourLabels.map((d, i) => (
                    <div key={`h-${i}`} className="ui-absolute ui-datehdr-label ui-datehdr-hour" style={{ top: '50%', left: `${d.x}px`, transform: 'translateY(-50%)', whiteSpace: 'nowrap' }}>{d.text}</div>
                ))}
                {hourTickXs.map((x, i) => (
                    <div key={`ht-${i}`} className="ui-datehdr-tick" style={{ left: `${x}px` }} />
                ))}
            </div>
        </div>
    )
}


