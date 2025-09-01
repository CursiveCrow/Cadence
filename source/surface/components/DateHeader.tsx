/**
 * DateHeader Component
 * Displays timeline date headers with zoom-aware granularity
 */

import React, { useRef, useMemo } from 'react'
import { CONSTANTS } from '../../config/constants'
import './DateHeader.css'

export interface DateHeaderProps {
    projectStartDate: string
    viewport: { x: number; y: number; zoom: number }
    width: number
    height?: number
    onZoomChange?: (newZoom: number, anchorX: number) => void
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
    onZoomChange
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
    const visibleDates = useMemo(() => {
        const startDate = new Date(projectStartDate)
        const dayWidth = CONSTANTS.DEFAULT_DAY_WIDTH * viewport.zoom
        const leftMargin = CONSTANTS.DEFAULT_LEFT_MARGIN

        // Calculate visible range
        const startDay = Math.floor(-viewport.x / dayWidth) - 1
        const endDay = Math.ceil((-viewport.x + width) / dayWidth) + 1

        const dates: Array<{
            label: string
            sublabel?: string
            x: number
            isMajor: boolean
        }> = []

        if (timeScale === 'hour') {
            // Show hours
            for (let day = startDay; day <= endDay; day++) {
                const date = new Date(startDate)
                date.setDate(date.getDate() + day)

                for (let hour = 0; hour < 24; hour += 3) {
                    const x = leftMargin + (day * 24 + hour) * (dayWidth / 24) + viewport.x
                    dates.push({
                        label: `${hour}:00`,
                        sublabel: hour === 0 ? date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                        }) : undefined,
                        x,
                        isMajor: hour === 0
                    })
                }
            }
        } else if (timeScale === 'day') {
            // Show days
            for (let day = startDay; day <= endDay; day++) {
                const date = new Date(startDate)
                date.setDate(date.getDate() + day)
                const x = leftMargin + day * dayWidth + viewport.x

                dates.push({
                    label: date.getDate().toString(),
                    sublabel: date.getDate() === 1 ? date.toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric'
                    }) : undefined,
                    x,
                    isMajor: date.getDate() === 1
                })
            }
        } else if (timeScale === 'week') {
            // Show weeks
            let currentDate = new Date(startDate)
            currentDate.setDate(currentDate.getDate() + startDay * 7)

            for (let week = 0; week <= Math.ceil((endDay - startDay) / 7) + 1; week++) {
                const weekStart = new Date(currentDate)
                weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week

                const x = leftMargin +
                    Math.floor((weekStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) *
                    dayWidth + viewport.x

                dates.push({
                    label: `Week ${Math.ceil((weekStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7))}`,
                    sublabel: weekStart.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    }),
                    x,
                    isMajor: weekStart.getMonth() !== currentDate.getMonth()
                })

                currentDate.setDate(currentDate.getDate() + 7)
            }
        } else {
            // Show months
            let currentDate = new Date(startDate)
            currentDate.setMonth(currentDate.getMonth() + Math.floor(startDay / 30))

            for (let month = 0; month <= Math.ceil((endDay - startDay) / 30) + 1; month++) {
                const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

                const x = leftMargin +
                    Math.floor((monthStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) *
                    dayWidth + viewport.x

                dates.push({
                    label: monthStart.toLocaleDateString('en-US', { month: 'short' }),
                    sublabel: monthStart.getMonth() === 0 ? monthStart.getFullYear().toString() : undefined,
                    x,
                    isMajor: monthStart.getMonth() === 0
                })

                currentDate.setMonth(currentDate.getMonth() + 1)
            }
        }

        return dates.filter(d => d.x >= -100 && d.x <= width + 100)
    }, [projectStartDate, viewport, width, timeScale])

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
    const dynamicHeight = useMemo(() => {
        if (timeScale === 'hour') return 72
        if (timeScale === 'day') return 48
        if (timeScale === 'week') return 56
        return 64
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
            {/* Main labels */}
            <div className="date-header-main">
                {visibleDates.map((date, index) => (
                    <div
                        key={`${date.label}-${index}`}
                        className={`date-label ${date.isMajor ? 'major' : ''}`}
                        style={{ left: `${date.x}px` }}
                    >
                        <span className="date-label-text">{date.label}</span>
                        {date.x > 0 && date.x < width && (
                            <div className="date-tick" />
                        )}
                    </div>
                ))}
            </div>

            {/* Sub-labels (months/years) */}
            <div className="date-header-sub">
                {visibleDates
                    .filter(d => d.sublabel)
                    .map((date, index) => (
                        <div
                            key={`sub-${date.sublabel}-${index}`}
                            className="date-sublabel"
                            style={{ left: `${date.x}px` }}
                        >
                            {date.sublabel}
                        </div>
                    ))}
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
        </div>
    )
}
