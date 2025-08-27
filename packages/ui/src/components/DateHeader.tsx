import React, { useMemo } from 'react'
import '../styles/tokens.css'

export interface DateHeaderProps {
    viewport: { x: number; y: number; zoom: number }
    projectStart: Date
    leftMargin: number
    dayWidth: number
    height?: number
}

export const DateHeader: React.FC<DateHeaderProps> = ({ viewport, projectStart, leftMargin, dayWidth, height = 32 }) => {
    const zoom = viewport.zoom || 1
    const startDate = useMemo(() => projectStart, [projectStart])

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
        const worldX = viewport.x
        const startWorld = worldX - leftMargin
        const worldDayIndex = Math.floor(startWorld / dayWidth)
        const visibleDays = Math.ceil(screenWidth / (dayWidth * zoom)) + 10
        const firstIndex = Math.max(0, worldDayIndex - 5)
        const items: { x: number; text: string }[] = []
        for (let i = 0; i < visibleDays; i++) {
            const idx = firstIndex + i
            const date = new Date(startDate)
            date.setDate(date.getDate() + idx)
            const text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const xWorld = leftMargin + idx * dayWidth
            const xScreen = (xWorld - viewport.x) * zoom
            items.push({ x: xScreen + 5, text })
        }
        return { labels: items }
    }, [viewport.x, zoom, leftMargin, dayWidth, startDate])

    return (
        <div style={containerStyle}>
            {labels.map((d, i) => (
                <div key={i} style={{ position: 'absolute', top: '50%', left: `${d.x}px`, transform: 'translateY(-50%)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {d.text}
                </div>
            ))}
        </div>
    )
}


