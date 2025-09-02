import React, { useEffect, useRef, useState } from 'react'
import { Application, TimelineRendererEngine, TIMELINE_CONFIG, findNearestStaffLineAt, snapXToDayWithConfig, dayIndexToIsoDateUTC, StatusGlyphPlugin } from '@cadence/renderer'
import { PROJECT_START_DATE } from '@cadence/config'
import type { Task, Dependency, Staff, DependencyType } from '@cadence/core'

export interface RendererReactProps {
    projectId: string
    tasks: Record<string, Task>
    dependencies: Record<string, Dependency>
    selection: string[]
    viewport: { x: number; y: number; zoom: number }
    staffs: Staff[]
    onSelect: (ids: string[]) => void
    onViewportChange: (v: { x: number; y: number; zoom: number }) => void
    onDragStart?: () => void
    onDragEnd?: () => void
    onUpdateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void
    onCreateDependency: (projectId: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }) => void
    onVerticalScaleChange?: (scale: number) => void
    className?: string
}

export const TimelineCanvas: React.FC<RendererReactProps> = ({
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
}) => {
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
                    plugins: [StatusGlyphPlugin],
                    utils: {
                        getProjectStartDate: () => PROJECT_START_DATE,
                        findNearestStaffLine: (y: number) => findNearestStaffLineAt(y, staffsRef.current, TIMELINE_CONFIG as any),
                        snapXToDay: (x: number) => snapXToDayWithConfig(x, TIMELINE_CONFIG as any),
                        dayIndexToIsoDate: (d: number) => dayIndexToIsoDateUTC(d, PROJECT_START_DATE)
                    },
                    callbacks: ({
                        select: onSelect,
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
                // Expose helpers only in dev to avoid leaking globals in production
                const isDev = (() => {
                    try { return !!(import.meta as any)?.env?.DEV } catch { }
                    try {
                        const p: any = (typeof globalThis !== 'undefined') ? (globalThis as any).process : undefined
                        return !!p && p.env && p.env.NODE_ENV !== 'production'
                    } catch { }
                    return false
                })()
                if (isDev) {
                    ; (window as any).__CADENCE_SET_VIEWPORT = (v: { x: number; y: number; zoom: number }) => {
                        try { engineRef.current && engineRef.current.render({ tasks: tasksRef.current, dependencies: depsRef.current, staffs: staffsRef.current, selection: [] }, v) } catch { }
                    }
                }
                // Expose vertical scale setter in all builds; UI depends on this for sidebar vertical zoom control
                ; (window as any).__CADENCE_SET_VERTICAL_SCALE = (s: number) => {
                    try { engineRef.current?.setVerticalScale(s) } catch { }
                }
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

    useEffect(() => {
        if (!ready || !engineRef.current) return
        engineRef.current.render({ tasks, dependencies, staffs, selection }, viewport)
    }, [tasks, dependencies, staffs, selection, viewport, ready])

    return (
        <canvas ref={canvasRef} className={className} style={{ display: 'block', width: '100%', height: '100%' }} />
    )
}
