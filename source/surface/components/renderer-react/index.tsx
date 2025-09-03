import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Application, TimelineRendererEngine, TIMELINE_CONFIG, findNearestStaffLineAt, snapXToDayWithConfig, dayIndexToIsoDateUTC } from '@cadence/renderer'
import { PROJECT_START_DATE } from '../../../config'
import type { Task, Dependency, Staff, DependencyType } from '@cadence/core'

export interface RendererReactProps {
    projectId: string
    tasks: Record<string, Task>
    dependencies: Record<string, Dependency>
    selection: string[]
    viewport: { x: number; y: number; zoom: number }
    staffs: Staff[]
    onSelect: (payload: { ids: string[]; anchor?: { x: number; y: number } }) => void
    onViewportChange: (v: { x: number; y: number; zoom: number }) => void
    onDragStart?: () => void
    onDragEnd?: () => void
    onUpdateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void
    onCreateDependency: (projectId: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }) => void
    onVerticalScaleChange?: (scale: number) => void
    className?: string
}

export type TimelineCanvasHandle = {
    setVerticalScale: (s: number) => void
    setViewport: (v: { x: number; y: number; zoom: number }) => void
}

export const TimelineCanvas = forwardRef<TimelineCanvasHandle, RendererReactProps>(({ 
    projectId,
    tasks,
    dependencies,
    selection,
    viewport,
    staffs,
    onSelect,
    onViewportChange,
    onDragStart,
    onDragEnd,
    onUpdateTask,
    onCreateDependency,
    onVerticalScaleChange,
    className,
}, ref) => {
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

    useEffect(() => {
        let mounted = true
        let raf = 0
        const init = async () => {
            if (initializingRef.current || engineRef.current) return
            const canvas = canvasRef.current
            if (!canvas) return
            initializingRef.current = true
            try {
                const engine = new TimelineRendererEngine({
                    canvas,
                    projectId,
                    config: TIMELINE_CONFIG as any,
                    utils: {
                        getProjectStartDate: () => PROJECT_START_DATE,
                        findNearestStaffLine: (y: number) => findNearestStaffLineAt(y, staffsRef.current, TIMELINE_CONFIG as any),
                        snapXToDay: (x: number) => snapXToDayWithConfig(x, TIMELINE_CONFIG as any),
                        dayIndexToIsoDate: (d: number) => dayIndexToIsoDateUTC(d, PROJECT_START_DATE)
                    },
                    callbacks: ({
                        select: onSelect as any,
                        onDragStart,
                        onDragEnd,
                        updateTask: (pid: string, id: string, updates: Partial<Task>) => {
                            try { onUpdateTask(pid, id, updates) } catch { }
                        },
                        createDependency: (pid: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }) => {
                            try { onCreateDependency(pid, dep) } catch { }
                        },
                        onViewportChange: onViewportChange,
                        onVerticalScaleChange: (s: number) => {
                            try { onVerticalScaleChange?.(s) } catch { }
                        }
                    } as any)
                })
                await engine.init()
                engineRef.current = engine
                appRef.current = engine.getApplication() as any
                if (mounted) setReady(true)
            } finally {
                initializingRef.current = false
            }
        }
        // Defer to next frame to ensure DOM layout is finalized so Pixi can size correctly
        raf = requestAnimationFrame(() => { if (mounted) void init() })
        return () => {
            mounted = false
            try { cancelAnimationFrame(raf) } catch { }
            try { engineRef.current?.destroy() } catch { }
            engineRef.current = null
            appRef.current = null
            setReady(false)
        }
    }, [projectId])

    useImperativeHandle(ref, () => ({
        setVerticalScale: (s: number) => {
            try { engineRef.current?.setVerticalScale(s) } catch { }
        },
        setViewport: (v: { x: number; y: number; zoom: number }) => {
            try { engineRef.current && engineRef.current.render({ tasks: tasksRef.current, dependencies: depsRef.current, staffs: staffsRef.current, selection: [] }, v) } catch { }
        }
    }), [])

    useEffect(() => {
        if (!ready || !engineRef.current) return
        engineRef.current.render({ tasks, dependencies, staffs, selection }, viewport)
    }, [tasks, dependencies, staffs, selection, viewport, ready])

    return (
        <canvas ref={canvasRef} className={className} style={{ display: 'block', width: '100%', height: '100%' }} />
    )
})
