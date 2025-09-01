/**
 * DateHeader Component
 * Displays timeline date headers with zoom-aware granularity
 */

import React, { useRef, useMemo } from 'react'
import type { TimelineConfig } from '../../infrastructure/persistence/redux/slices/timelineSlice'
import './DateHeader.css'
import { computeViewportAlignment, worldDayToScreenX } from '../../renderer/utils/alignment'

export interface DateHeaderProps {
    projectStartDate: string
    viewport: { x: number; y: number; zoom: number }
    width: number
    height?: number
    onZoomChange?: (newZoom: number, anchorX: number) => void
    config: TimelineConfig
}

type TimeScale = 'hour' | 'day' | 'week' | 'month'

const HOUR_THRESHOLD = 2.5
const DAY_THRESHOLD = 0.8
const WEEK_THRESHOLD = 0.3
const MONTH_THRESHOLD = 0.1

export const DateHeader: React.FC<DateHeaderProps> = ({
    projectStartDate,
    viewport,
    width,
    height = 48,
    onZoomChange,
    config
}) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef({
        active: false,
        startX: 0,
        startZoom: 1,
        anchorX: 0
    })

    // Determine time scale based on zoom
    const timeScale: TimeScale = useMemo(() => {
        const zoom = viewport.zoom
        if (zoom >= HOUR_THRESHOLD) return 'hour'
        if (zoom >= DAY_THRESHOLD) return 'day'
        if (zoom >= WEEK_THRESHOLD) return 'week'
        return 'month'
    }, [viewport.zoom])

    // Calculate visible dates
    // Compute arrays per scale like archive version
    const { months, weeks, days, hours } = useMemo(() => {
        const startDate = new Date(projectStartDate)
        const dayWidth = (config.DAY_WIDTH || 30) * viewport.zoom
        const leftMargin = config.LEFT_MARGIN || 120
        const containerWidth = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : width)
        const align = computeViewportAlignment({ LEFT_MARGIN: leftMargin, DAY_WIDTH: dayWidth }, (viewport.x || 0) / Math.max(1, dayWidth))
        const leftMostDays = Math.floor(align.viewportXDaysQuantized - leftMargin / Math.max(dayWidth, 0.0001))
        const visibleDays = Math.ceil(containerWidth / Math.max(dayWidth, 0.0001))
        const startDay = leftMostDays - 5
        const endDay = leftMostDays + visibleDays + 5

        const months: Array<{ x: number; text: string }> = []
        const weeks: Array<{ x: number; text: string }> = []
        const days: Array<{ x: number; text: string }> = []
        const hours: Array<{ x: number; text: string }> = []

        // Months
        for (let day = startDay; day <= endDay + 31; day++) {
            const d = new Date(startDate)
            d.setDate(d.getDate() + day)
            if (d.getDate() === 1) {
                const x = Math.round(worldDayToScreenX({ LEFT_MARGIN: leftMargin, DAY_WIDTH: dayWidth }, day, align))
                months.push({ x, text: d.toLocaleDateString('en-US', { month: 'short', year: d.getMonth() === 0 ? 'numeric' : undefined as any }) })
            }
        }

        // Weeks (start on Sunday)
        for (let day = startDay; day <= endDay; day++) {
            const d = new Date(startDate)
            d.setDate(d.getDate() + day)
            if (d.getDay() === 0) {
                const x = Math.round(worldDayToScreenX({ LEFT_MARGIN: leftMargin, DAY_WIDTH: dayWidth }, day, align))
                weeks.push({ x, text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
            }
        }

        // Days (later culled by spacing)
        for (let day = startDay; day <= endDay; day++) {
            const d = new Date(startDate)
            d.setDate(d.getDate() + day)
            const x = Math.round(worldDayToScreenX({ LEFT_MARGIN: leftMargin, DAY_WIDTH: dayWidth }, day, align))
            days.push({ x, text: d.getDate().toString() })
        }

        // Hours (every 3 hours, later culled by spacing)
        if (dayWidth > 60) {
            const hoursPerScreen = Math.ceil(containerWidth / Math.max(1, dayWidth / 24))
            for (let day = startDay; day <= endDay; day++) {
                for (let h = 0; h < 24; h += 3) {
                    const x = Math.round(worldDayToScreenX({ LEFT_MARGIN: leftMargin, DAY_WIDTH: dayWidth }, day + h / 24, align))
                    hours.push({ x, text: `${h}:00` })
                }
            }
        }

        // Helper to cull labels by minimum spacing to avoid overlap
        const cullBySpacing = <T extends { x: number }>(items: T[], minSpacing: number): T[] => {
            const result: T[] = []
            let lastX = -Infinity
            for (const item of items) {
                if (item.x - lastX >= minSpacing) {
                    result.push(item)
                    lastX = item.x
                }
            }
            return result
        }

        // Determine conservative spacings
        const minDaySpacing = Math.max(28, Math.min(72, dayWidth * 0.65))
        const minHourSpacing = Math.max(24, Math.min(48, (dayWidth / 24) * 3 * 0.9))

        return {
            months: months.filter(m => m.x >= -100 && m.x <= containerWidth + 100),
            weeks: weeks.filter(w => w.x >= -100 && w.x <= containerWidth + 100),
            days: cullBySpacing(days.filter(d => d.x >= -100 && d.x <= containerWidth + 100), minDaySpacing),
            hours: cullBySpacing(hours.filter(h => h.x >= -100 && h.x <= containerWidth + 100), minHourSpacing)
        }
    }, [projectStartDate, viewport, width, config])

    const todayMarkerX = useMemo(() => {
        const dayWidth = (config.DAY_WIDTH || 30) * viewport.zoom
        const leftMargin = config.LEFT_MARGIN || 120
        const startDate = new Date(projectStartDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        startDate.setHours(0, 0, 0, 0)
        const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        return Math.round(leftMargin + daysSinceStart * dayWidth + viewport.x)
    }, [projectStartDate, viewport, config])

    // Handle middle-mouse drag for zooming
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 1) return // Only middle mouse button
        e.preventDefault()

        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        dragRef.current = {
            active: true,
            startX: e.clientX,
            startZoom: viewport.zoom,
            anchorX: e.clientX - rect.left
        }

        containerRef.current?.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current.active || !onZoomChange) return

        const deltaX = e.clientX - dragRef.current.startX
        const zoomFactor = Math.pow(1.005, deltaX)
        const newZoom = Math.max(0.1, Math.min(5, dragRef.current.startZoom * zoomFactor))

        onZoomChange(newZoom, dragRef.current.anchorX)
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        dragRef.current.active = false
        containerRef.current?.releasePointerCapture(e.pointerId)
    }

    // Dynamic height based on zoom level
    // Bands are ordered from top->bottom: month > week > day > hour
    const dynamicHeight = useMemo(() => {
        switch (timeScale) {
            case 'hour':
                return 32 /* hour */ + 24 /* day */ + 24 /* week */ + 28 /* month */
            case 'day':
                return 0 /* hour hidden */ + 24 /* day */ + 24 /* week */ + 28 /* month */
            case 'week':
                return 0 /* hour */ + 0 /* day */ + 24 /* week */ + 28 /* month */
            default:
                return 0 /* hour */ + 0 /* day */ + 0 /* week */ + 28 /* month */
        }
    }, [timeScale])

    return (
        <div
            ref={containerRef}
            className={`date-header date-header-${timeScale}`}
            style={{ height: dynamicHeight }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {/* Weekend highlight removed from header; handled by canvas grid for perfect sync */}

            {/* Bands: month > week > day > hour */}
            <div className="date-header-bands" style={{ position: 'absolute', inset: 0 }}>
                {/* Month band */}
                <div className="date-band" style={{ height: 28 }}>
                    {months.map((m, idx) => (
                        <div key={`mon-${idx}`} className="date-sublabel" style={{ left: `${m.x}px` }}>
                            {m.text}
                        </div>
                    ))}
                </div>
                {/* Week band */}
                {['week', 'day', 'hour'].includes(timeScale) && (
                    <div className="date-band" style={{ height: 24 }}>
                        {weeks.map((w, idx) => (
                            <div key={`wk-${idx}`} className="date-label major" style={{ left: `${w.x}px` }}>
                                <span className="date-label-text">{w.text}</span>
                                <div className="date-tick" />
                            </div>
                        ))}
                    </div>
                )}
                {/* Day band */}
                {['day', 'hour'].includes(timeScale) && (
                    <div className="date-band" style={{ height: 24 }}>
                        {days.map((d, idx) => (
                            <div key={`day-${idx}`} className="date-label" style={{ left: `${d.x}px` }}>
                                <span className="date-label-text">{d.text}</span>
                                <div className="date-tick" />
                            </div>
                        ))}
                    </div>
                )}
                {/* Hour band */}
                {timeScale === 'hour' && (
                    <div className="date-band" style={{ height: 32 }}>
                        {hours.map((h, idx) => (
                            <div key={`hr-${idx}`} className="date-label" style={{ left: `${h.x}px` }}>
                                <span className="date-label-text">{h.text}</span>
                                <div className="date-tick" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Zoom indicator */}
            <div className="zoom-indicator">
                <span className="zoom-level">
                    {Math.round(viewport.zoom * 100)}%
                </span>
                <span className="time-scale">
                    {timeScale}
                </span>
            </div>

            {/* Today marker */}
            <div className="today-marker" style={{ position: 'absolute', top: 0, left: todayMarkerX, width: 2, height: '100%' }} />
            <div className="today-label" style={{ position: 'absolute', top: 0, left: todayMarkerX + 4 }}>Today</div>
        </div>
    )
}
