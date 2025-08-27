import React, { useEffect, useRef, useState } from 'react'
import { Application, TimelineRendererEngine, TIMELINE_CONFIG, PROJECT_START_DATE, findNearestStaffLineAt, snapXToDayWithConfig, dayIndexToIsoDateUTC } from '@cadence/renderer'

export interface RendererReactProps {
    projectId: string
    tasks: Record<string, any>
    dependencies: Record<string, any>
    selection: string[]
    viewport: { x: number; y: number; zoom: number }
    staffs: any[]
    onSelect: (ids: string[]) => void
    onViewportChange: (v: { x: number; y: number; zoom: number }) => void
    onDragStart?: () => void
    onDragEnd?: () => void
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
    className,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const appRef = useRef<Application | null>(null)
    const engineRef = useRef<TimelineRendererEngine | null>(null)
    const [ready, setReady] = useState(false)
    const initializingRef = useRef(false)

    const tasksRef = useRef(tasks)
    const depsRef = useRef(dependencies)
    const staffsRef = useRef(staffs)
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
                        findNearestStaffLine: (y: number) => findNearestStaffLineAt(y, staffsRef.current as any, TIMELINE_CONFIG as any),
                        snapXToDay: (x: number) => snapXToDayWithConfig(x, TIMELINE_CONFIG as any),
                        dayIndexToIsoDate: (d: number) => dayIndexToIsoDateUTC(d, PROJECT_START_DATE)
                    },
                    callbacks: {
                        select: onSelect,
                        onDragStart,
                        onDragEnd,
                        updateTask: (pid: string, id: string, updates: Partial<any>) => {
                            try { (window as any).__CADENCE_UPDATE_TASK?.(pid, id, updates) } catch { }
                        },
                        createDependency: (pid: string, dep: any) => {
                            try { (window as any).__CADENCE_CREATE_DEP?.(pid, dep) } catch { }
                        },
                        onViewportChange: onViewportChange
                    }
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

    useEffect(() => {
        if (!ready || !engineRef.current) return
        engineRef.current.render({ tasks, dependencies, staffs, selection }, viewport)
    }, [tasks, dependencies, staffs, selection, viewport, ready])

    return (
        <canvas ref={canvasRef} className={className} style={{ display: 'block', width: '100%', height: '100%' }} />
    )
}

export default TimelineCanvas


