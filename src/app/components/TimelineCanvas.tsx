import React, { useEffect, useRef, useState } from 'react'
import type { ViewportState } from '@app/store/ui'
import type { Staff, Task, Dependency } from '@types'
import { Renderer } from '@renderer/Renderer'
import { TIMELINE } from '@renderer/utils'
import { useDispatch } from 'react-redux'
import { addTask } from '@app/store/tasks'

interface Props {
  viewport: ViewportState
  staffs: Staff[]
  tasks: Task[]
  dependencies: Dependency[]
  selection: string[]
  onViewportChange: (v: ViewportState) => void
  onSelect: (ids: string[], anchor?: { x: number; y: number }) => void
}

const TimelineCanvas: React.FC<Props> = ({ viewport, staffs, tasks, dependencies, selection, onViewportChange, onSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const dispatch = useDispatch()
  const [drag, setDrag] = useState<null | { startX: number; startY: number; startV: ViewportState }>(null)
  const viewportRef = useRef(viewport)
  useEffect(() => { viewportRef.current = viewport }, [viewport])

  useEffect(() => {
    if (!canvasRef.current) return
    if (!rendererRef.current) {
      rendererRef.current = new Renderer(canvasRef.current)
    }
    const r = rendererRef.current
    r.setData({ staffs, tasks, dependencies, selection })
    r.setViewport(viewport)
    r.render()
  }, [viewport, staffs, tasks, dependencies, selection])

  useEffect(() => {
    const onResize = () => {
      rendererRef.current?.resize()
      rendererRef.current?.render()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Helpers
  const pxPerDay = (z: number) => TIMELINE.DAY_WIDTH * Math.max(0.1, z)

  const onPointerDown: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    ; (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    setDrag({ startX: e.clientX, startY: e.clientY, startV: { ...viewport } })
  }

  const onPointerMove: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    try { rendererRef.current?.setHover?.(localX, localY); rendererRef.current?.render() } catch { }
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    const ppd = pxPerDay(drag.startV.zoom)
    const newX = Math.max(0, Math.round(drag.startV.x - dx / ppd))
    const newY = Math.max(0, Math.round(drag.startV.y - dy))
    onViewportChange({ x: newX, y: newY, zoom: drag.startV.zoom })
  }

  const onPointerUp: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    ; (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId)
    // simple click selection if minimal movement
    if (drag) {
      const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY)
      if (moved < 5 && rendererRef.current) {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
        const localX = e.clientX - rect.left
        const localY = e.clientY - rect.top
        const hit = rendererRef.current.hitTest(localX, localY)
        onSelect(hit ? [hit] : [], { x: localX, y: localY })
      }
    }
    setDrag(null)
  }

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const vp = viewportRef.current
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.001)
        const z0 = vp.zoom
        const z1 = Math.max(0.1, Math.min(5, z0 * factor))
        const ppd0 = pxPerDay(z0)
        const ppd1 = pxPerDay(z1)
        const rect = el.getBoundingClientRect()
        const localX = e.clientX - rect.left
        const anchorPxFromGrid = Math.max(0, localX - TIMELINE.LEFT_MARGIN)
        const worldAtAnchor = vp.x + anchorPxFromGrid / ppd0
        const newX = Math.max(0, Math.round(worldAtAnchor - anchorPxFromGrid / ppd1))
        onViewportChange({ x: newX, y: vp.y, zoom: z1 })
      } else {
        const ppd = pxPerDay(vp.zoom)
        const newX = Math.max(0, Math.round(vp.x + e.deltaX / ppd))
        const newY = Math.max(0, Math.round(vp.y + e.deltaY))
        onViewportChange({ x: newX, y: newY, zoom: vp.zoom })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => { el.removeEventListener('wheel', onWheel as any) }
  }, [onViewportChange])

  const onDoubleClick: React.MouseEventHandler<HTMLCanvasElement> = (e) => {
    if (!rendererRef.current) return
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    const m = rendererRef.current.getMetrics()
    const staff = m.staffBlocks.find(b => localY >= b.yTop && localY <= b.yBottom)
    if (!staff) return
    const lineStep = staff.lineSpacing / 2
    const lineIndex = Math.max(0, Math.round((localY - staff.yTop) / lineStep))
    const ppd = pxPerDay(viewport.zoom)
    const world = Math.max(0, viewport.x + Math.max(0, localX - TIMELINE.LEFT_MARGIN) / ppd)
    const day = Math.round(world)
    const startDate = new Date(Date.UTC(2024, 0, 1))
    startDate.setUTCDate(startDate.getUTCDate() + day)
    const yyyy = startDate.getUTCFullYear()
    const mm = String(startDate.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(startDate.getUTCDate()).padStart(2, '0')
    const now = new Date().toISOString()
    dispatch(addTask({
      id: `task-${Date.now()}`,
      title: 'New Note',
      startDate: `${yyyy}-${mm}-${dd}`,
      durationDays: 2,
      status: 'not_started' as any,
      staffId: staff.id,
      staffLine: lineIndex,
      projectId: 'demo',
      createdAt: now,
      updatedAt: now,
    }))
  }

  return (
    <canvas
      ref={canvasRef}
      className="canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
    />
  )
}

export default TimelineCanvas
