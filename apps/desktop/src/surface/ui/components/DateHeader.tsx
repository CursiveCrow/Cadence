import React, { useMemo, useRef } from 'react'
import '../styles/tokens.css'
import '../styles/ui.css'
import { DAY_THRESHOLD, HOUR_THRESHOLD, computeDateHeaderHeight, computeDateHeaderViewModel } from '@cadence/renderer'
import type { DateHeaderViewModel } from '@cadence/renderer'

export { computeDateHeaderHeight }

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
  const containerRef = useRef<HTMLDivElement>(null)
  const dynamicHeight = Math.max(height, computeDateHeaderHeight(zoom))
  const containerStyle: React.CSSProperties = { height: `${dynamicHeight}px`, width: '100%', position: 'relative', overflow: 'hidden', border: 'none', zIndex: 2 }
  const { monthLabels, monthTickXs, dayLabels, hourLabels, dayTickXs, hourTickXs } = useMemo<DateHeaderViewModel>(() => {
    const w = containerRef.current?.clientWidth ?? window.innerWidth ?? 1200
    return computeDateHeaderViewModel({ viewport, projectStart: startDate, leftMargin, dayWidth, width: w })
  }, [viewport.x, zoom, leftMargin, dayWidth, startDate])
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => { if (e.button !== 1) return; try { e.preventDefault() } catch {}; try { e.stopPropagation() } catch {}; try { (e.currentTarget as any).setPointerCapture?.(e.pointerId) } catch {}; dragRef.current.active = true; const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); dragRef.current.originLocalX = e.clientX - rect.left; dragRef.current.startZoom = viewport.zoom || 1 }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => { if (!dragRef.current.active) return; if (!onZoomChange) return; try { e.preventDefault() } catch {}; const start = dragRef.current.startZoom; const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const currentLocalX = e.clientX - rect.left; const dx = currentLocalX - dragRef.current.originLocalX; const factor = Math.pow(1.01, dx); const next = Math.max(0.1, Math.min(20, Math.round(start * factor * 100) / 100)); onZoomChange(next, dragRef.current.originLocalX) }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => { dragRef.current.active = false; try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}; try { e.preventDefault() } catch {} }
  const onPointerLeave = () => { dragRef.current.active = false }
  const daysProgress = Math.max(0, Math.min(1, (zoom - DAY_THRESHOLD) / 0.25))
  const hoursProgress = Math.max(0, Math.min(1, (zoom - HOUR_THRESHOLD) / 0.5))
  const bandH = 24; const monthTop = 0; const dayTop = bandH * daysProgress; const hourTop = bandH + bandH * hoursProgress
  return (
    <div ref={containerRef} className="ui-datehdr ui-text" style={containerStyle} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerLeave}>
      <div className="ui-absolute ui-datehdr-band" style={{ left: 0, right: 0, top: monthTop }}>
        <div className="ui-datehdr-sep" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
        {monthLabels.map((d, i) => (<div key={`m-${i}`} className="ui-absolute ui-datehdr-label ui-datehdr-month ui-font-700" style={{ top: '50%', left: `${d.x}px`, transform: 'translateY(-50%)', whiteSpace: 'nowrap' }}>{d.text}</div>))}
        {monthTickXs.map((x, i) => (<div key={`mt-${i}`} className="ui-datehdr-tick ui-datehdr-tick-strong" style={{ left: `${x}px` }} />))}
      </div>
      <div className="ui-absolute ui-datehdr-band" style={{ left: 0, right: 0, top: dayTop, opacity: daysProgress }}>
        <div className="ui-datehdr-sep" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
        {dayLabels.map((d, i) => (<div key={`d-${i}`} className="ui-absolute ui-datehdr-label ui-datehdr-day" style={{ top: '50%', left: `${d.x}px`, transform: 'translateY(-50%)', whiteSpace: 'nowrap' }}>{d.text}</div>))}
        {dayTickXs.map((x, i) => (<div key={`dt-${i}`} className="ui-datehdr-tick" style={{ left: `${x}px` }} />))}
      </div>
      <div className="ui-absolute ui-datehdr-band" style={{ left: 0, right: 0, top: hourTop, opacity: hoursProgress }}>
        <div className="ui-datehdr-sep" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
        {hourLabels.map((d, i) => (<div key={`h-${i}`} className="ui-absolute ui-datehdr-label ui-datehdr-hour" style={{ top: '50%', left: `${d.x}px`, transform: 'translateY(-50%)', whiteSpace: 'nowrap' }}>{d.text}</div>))}
        {hourTickXs.map((x, i) => (<div key={`ht-${i}`} className="ui-datehdr-tick" style={{ left: `${x}px` }} />))}
      </div>
    </div>
  )
}

