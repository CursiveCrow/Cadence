import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { createRenderer, TIMELINE_CONFIG, findNearestStaffLineAt, snapXToDayWithConfig, dayIndexToIsoDateUTC } from '@cadence/renderer'
import { PROJECT_START_DATE } from '../../../config'
import type { Task, Dependency, Staff, DependencyType } from '@cadence/core'
import type { ProjectSnapshot } from '../../../application/ports/PersistencePort'

export interface RendererReactProps {
    projectId: string
    snapshot: ProjectSnapshot
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
    snapshot,
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
    const engineRef = useRef<ReturnType<typeof createRenderer> | null>(null)
    const [ready, setReady] = useState(false)
    const initializingRef = useRef(false)

    const tasksRef = useRef<Record<string, Task>>({})
    const depsRef = useRef<Record<string, Dependency>>({})
    const staffsRef = useRef<Staff[]>(staffs)
    const viewportRef = useRef(viewport)

    // Convert snapshot to renderer-friendly structures
    useEffect(() => {
        tasksRef.current = snapshot.tasks as unknown as Record<string, Task>
        depsRef.current = Object.entries(snapshot.dependencies).reduce((acc, [id, dep]) => {
            acc[id] = { ...(dep as any), id, projectId, createdAt: (dep as any).createdAt ?? '', updatedAt: (dep as any).updatedAt ?? '' }
            return acc
        }, {} as Record<string, Dependency>)
    }, [snapshot, projectId])
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
                const engine = createRenderer({
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
        const tasks = tasksRef.current
        const dependencies = depsRef.current
        engineRef.current.render({ tasks, dependencies, staffs, selection }, viewport)
    }, [snapshot, staffs, selection, viewport, ready])

    return (
        <canvas ref={canvasRef} className={className} style={{ display: 'block', width: '100%', height: '100%' }} />
    )
})
