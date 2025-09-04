import React, { useMemo, useRef } from 'react'
import { computeDateHeaderViewModel, computeDateHeaderHeight } from '@renderer'
import { DAY_THRESHOLD, HOUR_THRESHOLD } from '@renderer'

interface DateHeaderProps {
  viewport: { x: number; y: number; zoom: number }
  projectStart: Date
  leftMargin: number
  dayWidth: number
  onZoomChange?: (newZoom: number, anchorLocalX: number) => void
}

const bandStyle: React.CSSProperties = { position: 'absolute', left: 0, right: 0 }

export const DateHeader: React.FC<DateHeaderProps> = ({ viewport, projectStart, leftMargin, dayWidth, onZoomChange }) => {
  const zoom = viewport.zoom || 1
  const containerRef = useRef<HTMLDivElement>(null)
  const height = computeDateHeaderHeight(zoom)

  const vm = useMemo(() => {
    const w = containerRef.current?.clientWidth ?? window.innerWidth ?? 1200
    return computeDateHeaderViewModel({ viewport, projectStart, leftMargin, dayWidth, width: w })
  }, [viewport.x, zoom, leftMargin, dayWidth, projectStart])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 1) return // middle button for zoom scrub
      ; (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const originLocalX = e.clientX - rect.left
    const startZoom = zoom
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - (rect.left + originLocalX)
      const factor = Math.pow(1.01, dx)
      const next = Math.max(0.1, Math.min(20, Math.round(startZoom * factor * 100) / 100))
      onZoomChange?.(next, originLocalX)
    }
    const onUp = (ev: PointerEvent) => {
      try { (e.currentTarget as HTMLDivElement).releasePointerCapture(ev.pointerId) } catch { }
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerup', onUp, true)
    }
    window.addEventListener('pointermove', onMove, true)
    window.addEventListener('pointerup', onUp, true)
  }

  // Slide-in transitions: days band appears after DAY_THRESHOLD; hours after HOUR_THRESHOLD
  const bandH = 24
  const daysProgress = Math.max(0, Math.min(1, (zoom - DAY_THRESHOLD) / 0.25))
  const hoursProgress = Math.max(0, Math.min(1, (zoom - HOUR_THRESHOLD) / 0.5))
  const monthTop = 0
  const dayTop = bandH * daysProgress
  const hourTop = bandH + bandH * hoursProgress

  return (
    <div ref={containerRef} className="ui-datehdr" style={{ position: 'relative', height, userSelect: 'none', overflow: 'hidden' }} onPointerDown={onPointerDown}>
      {/* Months band */}
      <div style={{ ...bandStyle, top: monthTop }}>
        {vm.monthLabels.map((d, i) => (
          <div key={`m-${i}`} className="ui-datehdr-label ui-datehdr-month" style={{ position: 'absolute', left: d.x + 6, top: 6, fontWeight: 600 }}>{d.text}</div>
        ))}
        {vm.monthTickXs.map((x, i) => (
          <div key={`mt-${i}`} className="ui-datehdr-tick ui-datehdr-tick-strong" style={{ left: x }} />
        ))}
        <div className="ui-datehdr-sep" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
      </div>

      {/* Days band */}
      <div style={{ ...bandStyle, top: dayTop, opacity: daysProgress }}>
        {vm.dayLabels.map((d, i) => (
          <div key={`d-${i}`} className="ui-datehdr-label ui-datehdr-day" style={{ position: 'absolute', left: d.x + 5, top: 0 }}>{d.text}</div>
        ))}
        {vm.dayTickXs.map((x, i) => (
          <div key={`dt-${i}`} className="ui-datehdr-tick" style={{ left: x }} />
        ))}
        <div className="ui-datehdr-sep" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
      </div>

      {/* Hours band */}
      <div style={{ ...bandStyle, top: hourTop, opacity: hoursProgress }}>
        {vm.hourLabels.map((d, i) => (
          <div key={`h-${i}`} className="ui-datehdr-label ui-datehdr-hour" style={{ position: 'absolute', left: d.x, top: 0 }}>{d.text}</div>
        ))}
        {vm.hourTickXs.map((x, i) => (
          <div key={`ht-${i}`} className="ui-datehdr-tick" style={{ left: x }} />
        ))}
      </div>
    </div>
  )
}

export { computeDateHeaderHeight }
