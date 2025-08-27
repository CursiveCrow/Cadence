import React, { useMemo, useRef } from 'react'
import '../styles/tokens.css'

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

    const containerStyle: React.CSSProperties = {
        height: `${height}px`,
        width: '100%',
        position: 'relative',
        background: 'linear-gradient(180deg, var(--ui-surface-1) 0%, var(--ui-surface-1-focus) 100%)',
        borderBottom: '1px solid var(--ui-color-border)',
        color: 'var(--ui-color-text)',
        overflow: 'hidden',
        zIndex: 2
    }

    const { labels } = useMemo(() => {
        const screenWidth = window.innerWidth || 1200
        // Engine renders with scale=1 and inflates DAY_WIDTH by zoom. Mirror that here.
        const effectiveDayWidth = dayWidth * zoom
        // viewport.x is measured in days; worldX is in pixels. Convert consistently.
        const worldToScreen = (worldX: number) => Math.round(worldX - viewport.x * effectiveDayWidth)
        const visibleDays = Math.ceil(screenWidth / Math.max(effectiveDayWidth, 0.0001)) + 5

        const getScaleForZoom = (z: number) => {
            if (z >= 2) return 'hour' as const
            if (z >= 0.75) return 'day' as const
            if (z >= 0.35) return 'week' as const
            return 'month' as const
        }
        const scale = getScaleForZoom(zoom)
        const labels: { x: number; text: string }[] = []

        const base = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()))
        // viewport.x is in days. Compute the leftmost visible day index accounting for the left margin in pixels.
        const leftMostDays = Math.floor((viewport.x - (leftMargin / Math.max(effectiveDayWidth, 0.0001))))

        if (scale === 'hour') {
            const totalHours = visibleDays * 24
            const startHour = Math.max(0, leftMostDays * 24)
            for (let i = -12; i < totalHours + 12; i++) {
                const h = startHour + i
                const d = Math.floor(h / 24)
                const hourInDay = h % 24
                const date = new Date(base.getTime())
                date.setUTCDate(date.getUTCDate() + d)
                date.setUTCHours(hourInDay, 0, 0, 0)
                const text = date.toLocaleTimeString('en-US', { hour: '2-digit' })
                const xWorld = leftMargin + (h / 24) * effectiveDayWidth
                const xScreen = worldToScreen(xWorld)
                labels.push({ x: xScreen + 4, text })
            }
        } else if (scale === 'day') {
            const startDay = Math.max(0, leftMostDays)
            for (let i = -5; i < visibleDays + 5; i++) {
                const d = startDay + i
                const date = new Date(base.getTime())
                date.setUTCDate(date.getUTCDate() + d)
                const text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const xWorld = leftMargin + d * effectiveDayWidth
                const xScreen = worldToScreen(xWorld)
                labels.push({ x: xScreen + 5, text })
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
                labels.push({ x: xScreen + 6, text })
            }
        } else {
            // month scale
            // Create labels at the start of each month covering visible range
            const startOffsetDays = Math.max(0, leftMostDays)
            const startDateRef = new Date(base.getTime())
            startDateRef.setUTCDate(startDateRef.getUTCDate() + startOffsetDays)
            // Move to first of current month
            const firstOfMonth = new Date(Date.UTC(startDateRef.getUTCFullYear(), startDateRef.getUTCMonth(), 1))
            let cursor = firstOfMonth
            const endDays = startOffsetDays + visibleDays + 60
            while (true) {
                const diffMs = cursor.getTime() - base.getTime()
                const dayIndex = Math.round(diffMs / (24 * 60 * 60 * 1000))
                if (dayIndex > endDays) break
                const text = cursor.toLocaleDateString('en-US', { month: 'short' })
                const xWorld = leftMargin + dayIndex * effectiveDayWidth
                const xScreen = worldToScreen(xWorld)
                labels.push({ x: xScreen + 6, text })
                // Advance one month
                cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
            }
        }

        return { labels }
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
        const next = Math.max(0.1, Math.min(10, Math.round(start * factor * 100) / 100))
        onZoomChange(next, dragRef.current.originLocalX)
    }
    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        dragRef.current.active = false
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { }
        try { e.preventDefault() } catch { }
    }
    const onPointerLeave = () => { dragRef.current.active = false }

    return (
        <div style={containerStyle} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerLeave}>
            {labels.map((d, i) => (
                <div key={i} style={{ position: 'absolute', top: '50%', left: `${d.x}px`, transform: 'translateY(-50%)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {d.text}
                </div>
            ))}
        </div>
    )
}


