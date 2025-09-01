import React, { useEffect, useRef, useState } from 'react'
import { Application, TimelineRendererEngine, TIMELINE_CONFIG, PROJECT_START_DATE, findNearestStaffLineAt, snapXToDayWithConfig, dayIndexToIsoDateUTC, StatusGlyphPlugin } from '@cadence/renderer'
import type { Task, Dependency, Staff, DependencyType } from '@cadence/core'

export interface RendererReactProps {
  projectId: string
  tasks: Record<string, Task>
  dependencies: Record<string, Dependency>
  selection: string[]
  viewport: { x: number; y: number; zoom: number }
  staffs: Staff[]
  verticalScale?: number
  onSelect: (ids: string[]) => void
  onViewportChange: (v: { x: number; y: number; zoom: number }) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  onUpdateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void
  onCreateDependency: (projectId: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }) => void
  onVerticalScaleChange?: (scale: number) => void
  className?: string
}

export const TimelineCanvas: React.FC<RendererReactProps> = ({ projectId, tasks, dependencies, selection, viewport, staffs, onSelect, onViewportChange, onDragStart, onDragEnd, onUpdateTask, onCreateDependency, onVerticalScaleChange, className, verticalScale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<Application | null>(null)
  const engineRef = useRef<TimelineRendererEngine | null>(null)
  const [ready, setReady] = useState(false)
  const initializingRef = useRef(false)
  const tasksRef = useRef<Record<string, Task>>(tasks)
  const depsRef = useRef<Record<string, Dependency>>(dependencies)
  const staffsRef = useRef<Staff[]>(staffs)
  const viewportRef = useRef(viewport)
  useEffect(() => { tasksRef.current = tasks }, [tasks])
  useEffect(() => { depsRef.current = dependencies }, [dependencies])
  useEffect(() => { staffsRef.current = staffs }, [staffs])
  useEffect(() => { viewportRef.current = viewport }, [viewport])
  useEffect(() => { if (!engineRef.current || typeof verticalScale !== 'number') return; try { engineRef.current.setVerticalScale(verticalScale) } catch {} }, [verticalScale])
  useEffect(() => {
    let mounted = true; let raf = 0
    const init = async () => {
      if (initializingRef.current || engineRef.current) return
      const canvas = canvasRef.current; if (!canvas) return
      initializingRef.current = true
      try {
        const engine = new TimelineRendererEngine({
          canvas, projectId, config: TIMELINE_CONFIG as any, plugins: [StatusGlyphPlugin],
          utils: {
            getProjectStartDate: () => PROJECT_START_DATE,
            findNearestStaffLine: (y: number) => findNearestStaffLineAt(y, staffsRef.current, TIMELINE_CONFIG as any),
            snapXToDay: (x: number) => snapXToDayWithConfig(x, TIMELINE_CONFIG as any),
            snapXToTime: (x: number) => {
              const z = (engineRef.current as any)?.getViewportScale?.() || (viewportRef.current?.zoom || 1)
              const dayWidth = (TIMELINE_CONFIG as any).DAY_WIDTH * z
              const relative = (x - (TIMELINE_CONFIG as any).LEFT_MARGIN) / Math.max(dayWidth, 0.0001)
              const dayIndex = Math.round(relative)
              const snappedX = (TIMELINE_CONFIG as any).LEFT_MARGIN + dayIndex * dayWidth
              return { snappedX, dayIndex }
            },
            dayIndexToIsoDate: (d: number) => dayIndexToIsoDateUTC(d, PROJECT_START_DATE)
          },
          callbacks: ({
            select: onSelect, onDragStart, onDragEnd,
            updateTask: (pid: string, id: string, updates: Partial<Task>) => { try { onUpdateTask(pid, id, updates) } catch {} },
            createDependency: (pid: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }) => { try { onCreateDependency(pid, dep) } catch {} },
            onViewportChange, onVerticalScaleChange: (s: number) => { try { onVerticalScaleChange?.(s) } catch {} }
          } as any)
        })
        await engine.init(); engineRef.current = engine; appRef.current = engine.getApplication() as any
        setReady(true)
      } finally { initializingRef.current = false }
    }
    raf = requestAnimationFrame(() => { if (mounted) void init() })
    return () => { mounted = false; try { cancelAnimationFrame(raf) } catch {}; try { engineRef.current?.destroy() } catch {}; engineRef.current = null; appRef.current = null; setReady(false) }
  }, [projectId])
  useEffect(() => { if (!ready || !engineRef.current) return; engineRef.current.render({ tasks, dependencies, staffs, selection }, viewport) }, [tasks, dependencies, staffs, selection, viewport, ready])
  return (<canvas ref={canvasRef} className={className} style={{ display: 'block', width: '100%', height: '100%' }} />)
}

export default TimelineCanvas
export * from './errors'

