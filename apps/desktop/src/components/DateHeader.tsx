import React, { useMemo } from 'react'
import { TIMELINE_CONFIG } from '@cadence/renderer'

interface DateHeaderProps {
  viewport: { x: number; y: number; zoom: number }
  projectStart?: Date
  height?: number
}

export const DateHeader: React.FC<DateHeaderProps> = ({ viewport, projectStart, height = 32 }) => {
  const zoom = viewport.zoom || 1
  const startDate = useMemo(() => projectStart || new Date('2024-01-01'), [projectStart])
  const leftMargin = TIMELINE_CONFIG.LEFT_MARGIN
  const dayWidth = TIMELINE_CONFIG.DAY_WIDTH

  const containerStyle: React.CSSProperties = {
    height: `${height}px`,
    width: '100%',
    position: 'relative',
    background: 'linear-gradient(180deg, rgba(26,26,26,1) 0%, rgba(10,10,10,1) 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    overflow: 'hidden',
    zIndex: 2
  }

  // Generate a range of visible days based on viewport and screen width.
  const { labels } = useMemo(() => {
    // assume full width; render a bit extra buffer
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
