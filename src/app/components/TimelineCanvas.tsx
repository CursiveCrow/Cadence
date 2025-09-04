import React, { useEffect, useRef, useState } from 'react'
import type { ViewportState } from '@app/store/ui'
import type { Staff, Task, Dependency } from '@types'
import { Renderer } from '@renderer/Renderer'
import { TIMELINE } from '@renderer/utils'
import { useDispatch } from 'react-redux'
import { addTask, updateTask } from '@app/store/tasks'
import { addDependency } from '@app/store/dependencies'

interface Props {
  viewport: ViewportState
  staffs: Staff[]
  tasks: Task[]
  dependencies: Dependency[]
  selection: string[]
  onViewportChange: (v: ViewportState) => void
  onSelect: (ids: string[], anchor?: { x: number; y: number }) => void
  verticalScale?: number
  onVerticalScaleChange?: (s: number) => void
}

const TimelineCanvas: React.FC<Props> = ({ viewport, staffs, tasks, dependencies, selection, onViewportChange, onSelect, verticalScale = 1, onVerticalScaleChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const dispatch = useDispatch()
  const [drag, setDrag] = useState<null | { startX: number; startY: number; startV: ViewportState }>(null)
  const viewportRef = useRef(viewport)
  useEffect(() => { viewportRef.current = viewport }, [viewport])
  const taskOpRef = useRef<{ mode: 'none' | 'move' | 'resize' | 'dep'; taskId?: string; clickOffsetX?: number; initialDuration?: number; sourceRect?: { x: number; y: number; w: number; h: number }; startX?: number; startY?: number }>({ mode: 'none' })

  useEffect(() => {
    if (!canvasRef.current) return
    if (!rendererRef.current) {
      rendererRef.current = new Renderer(canvasRef.current)
    }
    const r = rendererRef.current
    r.setData({ staffs, tasks, dependencies, selection })
    r.setViewport(viewport)
    try { (r as any).setVerticalScale?.(verticalScale) } catch { }
    r.render()
  }, [viewport, staffs, tasks, dependencies, selection, verticalScale])

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
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    const r = rendererRef.current
    const hit = r?.hitTest(localX, localY) || null
    if (e.button === 2) {
      if (hit && r) {
        taskOpRef.current = { mode: 'dep', taskId: hit, sourceRect: r.getTaskRect(hit) || undefined }
      }
      e.preventDefault()
      return
    }
    if (e.button === 0 && hit && r) {
      const rectTask = r.getTaskRect(hit)
      if (rectTask && localX >= rectTask.x + rectTask.w - 10) {
        const t = tasks.find(t => t.id === hit)
        taskOpRef.current = { mode: 'resize', taskId: hit, initialDuration: Math.max(1, t?.durationDays || 1), startX: localX, startY: localY }
      } else {
        taskOpRef.current = { mode: 'move', taskId: hit, clickOffsetX: rectTask ? (localX - rectTask.x) : 0, startX: localX, startY: localY }
      }
      return
    }
    // default panning when not interacting with a task
    setDrag({ startX: e.clientX, startY: e.clientY, startV: { ...viewport } })
  }

  const onPointerMove: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    try { rendererRef.current?.setHover?.(localX, localY); rendererRef.current?.render() } catch { }
    const op = taskOpRef.current
    const r = rendererRef.current
    // hover handled in renderer via setHover
    if (op.mode === 'dep' && r) {
      if (op.sourceRect) r.drawDependencyPreview(op.sourceRect, { x: localX, y: localY })
      return
    }
    if (op.mode === 'resize' && r) {
      const t = tasks.find(tt => tt.id === op.taskId)
      if (!t) return
      const ppd = pxPerDay(viewport.zoom)
      // compute start day index
      const startDate = new Date(Date.UTC(2024, 0, 1))
      const parts = t.startDate.split('-').map(Number)
      const startMs = Date.UTC(parts[0]!, (parts[1]! - 1), parts[2]!)
      const dayIndex = Math.max(0, Math.round((startMs - startDate.getTime()) / (24 * 3600 * 1000)))
      const worldAtX = Math.max(0, viewport.x + Math.max(0, localX - TIMELINE.LEFT_MARGIN) / ppd)
      const rightIndex = Math.max(dayIndex + 1, Math.round(worldAtX))
      const newDur = Math.max(1, rightIndex - dayIndex)
      const xStartPx = TIMELINE.LEFT_MARGIN + (dayIndex - viewport.x) * ppd
      const metrics = r.getMetrics()
      const rectTask = r.getTaskRect(t.id)
      const hpx = Math.max(12, Math.min(18, Math.floor((metrics.staffBlocks[0]?.lineSpacing || 18) / 2)))
      r.drawDragPreview(xStartPx, (rectTask?.y || 0), newDur * ppd, hpx)
      return
    }
    if (op.mode === 'move' && r) {
      const t = tasks.find(tt => tt.id === op.taskId)
      if (!t) return
      const ppd = pxPerDay(viewport.zoom)
      const snappedLocalStart = Math.max(0, (localX - (op.clickOffsetX || 0) - TIMELINE.LEFT_MARGIN))
      const dayIndex = Math.max(0, Math.round(viewport.x + snappedLocalStart / ppd))
      // clamp by incoming dependencies
      let minIdx = 0
      for (const d of dependencies) {
        if (d.dstTaskId === t.id) {
          const src = tasks.find(tsk => tsk.id === d.srcTaskId)
          if (src) {
            const parts = src.startDate.split('-').map(Number)
            const base = Date.UTC(2024, 0, 1)
            const sidx = Math.max(0, Math.round((Date.UTC(parts[0]!, (parts[1]! - 1), parts[2]!) - base) / (24 * 3600 * 1000)))
            const req = sidx + src.durationDays
            if (req > minIdx) minIdx = req
          }
        }
      }
      const clampedDay = Math.max(dayIndex, minIdx)
      const m = r.getMetrics()
      const sb = m.staffBlocks.find(b => localY >= b.yTop && localY <= b.yBottom) || m.staffBlocks[0]
      const lineStep = (sb?.lineSpacing || 18) / 2
      const lineIndex = Math.max(0, Math.round(((localY) - (sb?.yTop || 0)) / Math.max(1, lineStep)))
      const hpx = Math.max(12, Math.min(18, Math.floor(lineStep)))
      const xStartPx = TIMELINE.LEFT_MARGIN + (clampedDay - viewport.x) * ppd
      const yTop = (sb?.yTop || 0) + lineIndex * lineStep - hpx / 2
      const wpx = Math.max(ppd * (t.durationDays || 1), 4)
      r.drawDragPreview(xStartPx, yTop, wpx, hpx)
      return
    }
    // no active drag operation, ensure preview cleared
    try { r?.clearPreview() } catch { }
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    const ppd = pxPerDay(drag.startV.zoom)
    // use fractional viewport values for smooth panning; avoid rounding
    const newX = Math.max(0, (drag.startV.x - dx / ppd))
    const newY = Math.max(0, (drag.startV.y - dy))
    if (newX !== viewportRef.current.x || newY !== viewportRef.current.y) {
      onViewportChange({ x: newX, y: newY, zoom: drag.startV.zoom })
    }
  }

  const onPointerUp: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    ; (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId)
    const r = rendererRef.current
    const op = taskOpRef.current
    if (op.mode === 'dep' && r && op.taskId) {
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top
      const hit = r.hitTest(localX, localY)
      r.clearDependencyPreview()
      if (hit && hit !== op.taskId) {
        const srcTask = tasks.find(t => t.id === op.taskId)
        const dstTask = tasks.find(t => t.id === hit)
        if (srcTask && dstTask) {
          // ensure direction is from earlier start to later start
          const toMs = (iso: string) => {
            const p = iso.split('-').map(Number); return Date.UTC(p[0]!, (p[1]! - 1), p[2]!)
          }
          const [src, dst] = toMs(srcTask.startDate) <= toMs(dstTask.startDate) ? [srcTask, dstTask] : [dstTask, srcTask]
          const now = new Date().toISOString()
          const dep = { id: `dep-${Date.now()}`, srcTaskId: src.id, dstTaskId: dst.id, type: 'finish_to_start' as any, projectId: 'demo', createdAt: now, updatedAt: now }
          try { (dispatch as any)(addDependency(dep)) } catch { }
        }
      }
      taskOpRef.current = { mode: 'none' }
      return
    }
    if (op.mode === 'resize' && op.taskId) {
      const t = tasks.find(tt => tt.id === op.taskId)
      if (t) {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
        const localX = e.clientX - rect.left
        const ppd = pxPerDay(viewport.zoom)
        const startDate = new Date(Date.UTC(2024, 0, 1))
        const parts = t.startDate.split('-').map(Number)
        const startMs = Date.UTC(parts[0]!, (parts[1]! - 1), parts[2]!)
        const dayIndex = Math.max(0, Math.round((startMs - startDate.getTime()) / (24 * 3600 * 1000)))
        const worldAtX = Math.max(0, viewport.x + Math.max(0, localX - TIMELINE.LEFT_MARGIN) / ppd)
        const rightIndex = Math.max(dayIndex + 1, Math.round(worldAtX))
        const newDur = Math.max(1, rightIndex - dayIndex)
        dispatch(updateTask({ id: t.id, updates: { durationDays: newDur } }))
      }
      r?.clearPreview()
      taskOpRef.current = { mode: 'none' }
      return
    }
    if (op.mode === 'move' && op.taskId) {
      const t = tasks.find(tt => tt.id === op.taskId)
      if (t && r) {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
        const localX = e.clientX - rect.left
        const localY = e.clientY - rect.top
        const moved = Math.hypot(localX - (op.startX || localX), localY - (op.startY || localY))
        if (moved < 5) {
          // Treat as click selection
          if (e.ctrlKey || e.metaKey || e.shiftKey) {
            const exists = selection.includes(t.id)
            const next = exists ? selection.filter(id => id !== t.id) : selection.concat(t.id)
            onSelect(next, { x: localX, y: localY })
          } else {
            onSelect([t.id], { x: localX, y: localY })
          }
          r?.clearPreview()
          taskOpRef.current = { mode: 'none' }
          return
        }
        const ppd = pxPerDay(viewport.zoom)
        const snappedLocalStart = Math.max(0, (localX - (op.clickOffsetX || 0) - TIMELINE.LEFT_MARGIN))
        const initialDay = Math.max(0, Math.round(viewport.x + snappedLocalStart / ppd))
        let minIdx = 0
        for (const d of dependencies) {
          if (d.dstTaskId === t.id) {
            const src = tasks.find(tsk => tsk.id === d.srcTaskId)
            if (src) {
              const parts = src.startDate.split('-').map(Number)
              const base = Date.UTC(2024, 0, 1)
              const sidx = Math.max(0, Math.round((Date.UTC(parts[0]!, (parts[1]! - 1), parts[2]!) - base) / (24 * 3600 * 1000)))
              const req = sidx + src.durationDays
              if (req > minIdx) minIdx = req
            }
          }
        }
        const dayIndex = Math.max(initialDay, minIdx)
        const m = r.getMetrics()
        const sb = m.staffBlocks.find(b => localY >= b.yTop && b.yBottom >= localY) || m.staffBlocks[0]
        const lineStep = (sb?.lineSpacing || 18) / 2
        const staffLine = Math.max(0, Math.round(((localY) - (sb?.yTop || 0)) / Math.max(1, lineStep)))
        const base = new Date(Date.UTC(2024, 0, 1))
        const start = new Date(base.getTime())
        start.setUTCDate(start.getUTCDate() + dayIndex)
        const yyyy = start.getUTCFullYear()
        const mm = String(start.getUTCMonth() + 1).padStart(2, '0')
        const dd = String(start.getUTCDate()).padStart(2, '0')
        dispatch(updateTask({ id: t.id, updates: { startDate: `${yyyy}-${mm}-${dd}`, staffId: (sb as any)?.id || t.staffId, staffLine } }))
      }
      r?.clearPreview()
      taskOpRef.current = { mode: 'none' }
      return
    }
    // simple click selection if minimal movement
    if (drag) {
      const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY)
      if (moved < 5 && rendererRef.current) {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
        const localX = e.clientX - rect.left
        const localY = e.clientY - rect.top
        const hit = rendererRef.current.hitTest(localX, localY)
        if (hit) {
          if (e.ctrlKey || e.metaKey || e.shiftKey) {
            const exists = selection.includes(hit)
            const next = exists ? selection.filter(id => id !== hit) : selection.concat(hit)
            onSelect(next, { x: localX, y: localY })
          } else {
            onSelect([hit], { x: localX, y: localY })
          }
        } else {
          onSelect([], { x: localX, y: localY })
        }
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
        const z1 = Math.max(0.1, Math.min(20, z0 * factor))
        const ppd0 = pxPerDay(z0)
        const ppd1 = pxPerDay(z1)
        const rect = el.getBoundingClientRect()
        const localX = e.clientX - rect.left
        const anchorPxFromGrid = Math.max(0, localX - TIMELINE.LEFT_MARGIN)
        const worldAtAnchor = vp.x + anchorPxFromGrid / ppd0
        const newX = Math.max(0, (worldAtAnchor - anchorPxFromGrid / ppd1))
        onViewportChange({ x: newX, y: vp.y, zoom: z1 })
      } else if (e.shiftKey) {
        const factor = Math.exp(-e.deltaY * 0.001)
        const newS = Math.max(0.5, Math.min(3, (verticalScale || 1) * factor))
        onVerticalScaleChange?.(newS)
      } else {
        const ppd = pxPerDay(vp.zoom)
        const newX = Math.max(0, (vp.x + e.deltaX / ppd))
        const newY = Math.max(0, (vp.y + e.deltaY))
        onViewportChange({ x: newX, y: newY, zoom: vp.zoom })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => { el.removeEventListener('wheel', onWheel as any) }
  }, [onViewportChange, verticalScale, onVerticalScaleChange])

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
    <>
      <canvas
        ref={canvasRef}
        className="canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => { e.preventDefault() }}
        onPointerLeave={() => { try { rendererRef.current?.setHover?.(null, null); rendererRef.current?.render() } catch { } }}
      />
    </>
  )
}

export default TimelineCanvas
