/**
 * TimelineView Component
 * Main timeline visualization component
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { RenderEngine } from '../../renderer/core/RenderEngine'
import type { TimelineConfig } from '../../infrastructure/persistence/redux/slices/timelineSlice'
import type { CreateTaskDTO, UpdateTaskDTO, CreateDependencyDTO } from '../../core/use-cases/dto/TaskDTO'
import './TimelineView.css'

export interface TimelineViewProps {
    project: any
    tasks: any[]
    dependencies: any[]
    staffs: any[]
    selection: string[]
    viewport: { x: number; y: number; zoom: number }
    config: TimelineConfig
    onCreateTask: (dto: CreateTaskDTO) => Promise<any>
    onUpdateTask: (taskId: string, updates: UpdateTaskDTO) => Promise<any>
    onDeleteTask: (taskId: string) => Promise<void>
    onCreateDependency: (dto: CreateDependencyDTO) => Promise<any>
    onDeleteDependency: (dependencyId: string) => Promise<void>
    onSelectTasks: (taskIds: string[]) => void
    onClearSelection: () => void
    onViewportChange: (viewport: { x?: number; y?: number; zoom?: number }) => void
    onPan: (dx: number, dy: number) => void
    onZoom: (delta: number, centerX?: number, centerY?: number) => void
    onVerticalScale?: (factor: number, anchorY: number) => void
    onTaskHover: (taskId: string | null) => void
    onTaskDragStart: (taskId: string) => void
    onTaskDragEnd: () => void
}

export const TimelineView: React.FC<TimelineViewProps> = ({
    project,
    tasks,
    dependencies,
    staffs,
    selection,
    viewport,
    config,
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
    onCreateDependency,
    onDeleteDependency,
    onSelectTasks,
    onClearSelection,
    onViewportChange,
    onPan,
    onZoom,
    onVerticalScale,
    onTaskHover,
    onTaskDragStart,
    onTaskDragEnd
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const engineRef = useRef<RenderEngine | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
    const [depSourceTaskId, setDepSourceTaskId] = useState<string | null>(null)
    const [resizeEdge, setResizeEdge] = useState<'left' | 'right' | null>(null)

    // Initialize render engine
    useEffect(() => {
        if (!canvasRef.current || isInitialized) return

        const initEngine = async () => {
            const engine = new RenderEngine({
                canvas: canvasRef.current!,
                config,
                preferWebGPU: true,
                taskInteractions: {
                    onPointerEnter: ({ taskId }) => {
                        onTaskHover(taskId)
                    },
                    onPointerLeave: () => {
                        onTaskHover(null)
                    },
                    onPointerDown: ({ taskId, button, localX, layoutWidth }) => {
                        onSelectTasks([taskId])
                        if (button === 2) {
                            // Right click: begin dependency creation (handled later on pointer up)
                            setIsDragging(false)
                            setDepSourceTaskId(taskId)
                            return
                        }
                        // Edge detection for resize
                        const threshold = 10
                        if (typeof localX === 'number' && typeof layoutWidth === 'number') {
                            if (localX <= threshold) {
                                setResizeEdge('left')
                            } else if (layoutWidth - localX <= threshold) {
                                setResizeEdge('right')
                            } else {
                                setResizeEdge(null)
                            }
                        } else {
                            setResizeEdge(null)
                        }
                        onTaskDragStart(taskId)
                        setIsDragging(true)
                        setDraggedTaskId(taskId)
                    },
                    onPointerUp: async ({ taskId, globalX, globalY }) => {
                        // Complete drag: compute new timeline position and update task
                        if (!project?.startDate || !taskId) {
                            onTaskDragEnd()
                            setIsDragging(false)
                            setDraggedTaskId(null)
                            setDepSourceTaskId(null)
                            setResizeEdge(null)
                            return
                        }

                        // If right-click dependency creation was initiated
                        if (depSourceTaskId && depSourceTaskId !== taskId) {
                            try {
                                await onCreateDependency({
                                    srcTaskId: depSourceTaskId,
                                    dstTaskId: taskId,
                                    type: 'finish_to_start',
                                    projectId: project.id
                                } as any)
                            } finally {
                                onTaskDragEnd()
                                setDepSourceTaskId(null)
                            }
                            return
                        }

                        const projectStart = new Date(project.startDate)
                        const dayWidth = (config.DAY_WIDTH || 30) * (viewport.zoom || 1)
                        const leftMargin = config.LEFT_MARGIN || 120
                        const minDuration = 1

                        // Resize case
                        if (resizeEdge && draggedTaskId) {
                            const t = tasks.find(t => t.id === draggedTaskId)
                            if (t) {
                                const startDayIndex = Math.floor((new Date(t.startDate).getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
                                const mouseDayIndex = Math.round(((globalX - leftMargin - (viewport.x || 0)) / Math.max(1, dayWidth)))
                                if (resizeEdge === 'right') {
                                    const newDuration = Math.max(minDuration, mouseDayIndex - startDayIndex)
                                    await onUpdateTask(draggedTaskId, { durationDays: newDuration })
                                } else if (resizeEdge === 'left') {
                                    const newStartIndex = Math.max(0, mouseDayIndex)
                                    const delta = startDayIndex - newStartIndex
                                    const newDuration = Math.max(minDuration, (t.durationDays || 1) + delta)
                                    const newStart = new Date(projectStart)
                                    newStart.setDate(newStart.getDate() + newStartIndex)
                                    await onUpdateTask(draggedTaskId, { startDate: newStart.toISOString().split('T')[0], durationDays: newDuration })
                                }
                            }
                            onTaskDragEnd()
                            setIsDragging(false)
                            setDraggedTaskId(null)
                            setResizeEdge(null)
                            return
                        }

                        const effectiveDayWidth = dayWidth
                        const topMargin = (config.TOP_MARGIN || 60) * (1)
                        const staffSpacing = (config.STAFF_SPACING || 120) * (1)
                        const lineSpacing = (config.STAFF_LINE_SPACING || 24) * (1)

                        // Convert global canvas coords into world coordinates (stage is not transformed)
                        const x = globalX
                        const y = globalY

                        // Compute new day index, considering left margin and viewport pan
                        const dayIndex = Math.max(0, Math.round(((x - leftMargin - (viewport.x || 0))) / Math.max(1, effectiveDayWidth)))
                        const newStart = new Date(projectStart)
                        newStart.setDate(newStart.getDate() + dayIndex)
                        const newStartIso = newStart.toISOString().split('T')[0]

                        // Compute staff and line from y considering viewport pan (grid renderer adds viewport.y)
                        const yWorld = y - viewport.y
                        const staffIndex = Math.max(0, Math.min(staffs.length - 1, Math.floor((yWorld - (config.TOP_MARGIN || 60)) / Math.max(1, (config.STAFF_SPACING || 120)))))
                        const staff = staffs[staffIndex]
                        const withinStaffY = yWorld - (config.TOP_MARGIN || 60) - staffIndex * (config.STAFF_SPACING || 120)
                        const staffLine = Math.max(0, Math.min((staff?.numberOfLines || 1) - 1, Math.round(withinStaffY / Math.max(1, (config.STAFF_LINE_SPACING || 24)))))

                        if (staff && draggedTaskId) {
                            // Move task to computed position
                            await onUpdateTask(draggedTaskId, {
                                staffId: staff.id,
                                staffLine,
                                startDate: newStartIso
                            })
                        }

                        onTaskDragEnd()
                        setIsDragging(false)
                        setDraggedTaskId(null)
                        setDepSourceTaskId(null)
                        setResizeEdge(null)
                    }
                }
            })

            await engine.init()
            engineRef.current = engine
            setIsInitialized(true)
        }

        initEngine()

        return () => {
            if (engineRef.current) {
                engineRef.current.destroy()
                engineRef.current = null
                setIsInitialized(false)
            }
        }
    }, [project.id, config])

    // Render timeline
    useEffect(() => {
        if (!engineRef.current || !isInitialized) return

        const renderData = {
            tasks: tasks.reduce((acc, task) => {
                acc[task.id] = task
                return acc
            }, {} as Record<string, any>),
            dependencies: dependencies.reduce((acc, dep) => {
                acc[dep.id] = dep
                return acc
            }, {} as Record<string, any>),
            staffs,
            selection,
            projectStartDate: project?.startDate ? new Date(project.startDate) : new Date()
        }

        engineRef.current.render(renderData, viewport)
    }, [tasks, dependencies, staffs, selection, viewport, isInitialized, project])

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (!engineRef.current || !canvasRef.current) return

            const parent = canvasRef.current.parentElement
            if (!parent) return

            const width = parent.clientWidth
            const height = parent.clientHeight

            engineRef.current.resize(width, height)
        }

        window.addEventListener('resize', handleResize)
        handleResize() // Initial resize

        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [isInitialized])

    // Mouse interaction handlers
    const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!engineRef.current) return

        const rect = canvasRef.current!.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        // For now, we'll handle general canvas interactions
        // Task selection would be handled through PixiJS event system

        if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
            // Middle mouse or shift+left for panning
            setIsDragging(true)
        }
    }, [])

    const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!engineRef.current) return

        if (isDragging && !draggedTaskId) {
            onPan(event.movementX, event.movementY)
        }

        // Handle task hover and preview overlays
        const rect = canvasRef.current!.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        // Drag-resize/drag move preview
        if (draggedTaskId) {
            const projectStart = new Date(project.startDate)
            const dayWidth = (config.DAY_WIDTH || 30) * (viewport.zoom || 1)
            const leftMargin = config.LEFT_MARGIN || 120
            const height = (config.TASK_HEIGHT || 20)
            const dayIndex = Math.max(0, Math.round(((x - leftMargin - (viewport.x || 0))) / Math.max(1, dayWidth)))
            const startX = leftMargin + dayIndex * dayWidth + (viewport.x || 0)
            if (resizeEdge === 'right' || resizeEdge === 'left') {
                // Compute preview width from original task
                const t = tasks.find(t => t.id === draggedTaskId)
                if (t) {
                    const startIndex = Math.floor((new Date(t.startDate).getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
                    let previewStartIndex = startIndex
                    let previewDuration = Math.max(1, t.durationDays || 1)
                    if (resizeEdge === 'right') {
                        previewDuration = Math.max(1, dayIndex - startIndex)
                    } else {
                        previewStartIndex = Math.max(0, dayIndex)
                        const delta = startIndex - previewStartIndex
                        previewDuration = Math.max(1, (t.durationDays || 1) + delta)
                    }
                    const pxStart = leftMargin + previewStartIndex * dayWidth + (viewport.x || 0)
                    const pxWidth = Math.max(dayWidth, previewDuration * dayWidth)
                    const anchors = engineRef.current.getTaskAnchors(draggedTaskId)
                    const yTop = anchors ? anchors.leftCenterY - height / 2 : y - height / 2
                    engineRef.current.showDragPreview(pxStart, yTop, pxWidth, height)
                }
            } else {
                const anchors = engineRef.current.getTaskAnchors(draggedTaskId)
                const yTop = anchors ? anchors.leftCenterY - height / 2 : y - height / 2
                engineRef.current.showDragPreview(startX, yTop, Math.max(dayWidth, (tasks.find(t => t.id === draggedTaskId)?.durationDays || 1) * dayWidth), height)
            }
        } else if (depSourceTaskId) {
            engineRef.current.showDependencyPreview(depSourceTaskId, x, y)
        } else {
            engineRef.current.clearOverlayPreviews()
        }
    }, [isDragging, draggedTaskId, resizeEdge, depSourceTaskId, onPan, project.startDate, config, viewport, tasks])

    const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(false)

        if (draggedTaskId) {
            onTaskDragEnd()
            setDraggedTaskId(null)
        }
        engineRef.current?.clearOverlayPreviews()
    }, [draggedTaskId, onTaskDragEnd])

    const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
        event.preventDefault()

        const rect = canvasRef.current!.getBoundingClientRect()
        const centerX = event.clientX - rect.left
        const centerY = event.clientY - rect.top

        // Ctrl + wheel => vertical scale
        if (event.ctrlKey && typeof onVerticalScale === 'function') {
            const factor = event.deltaY * -0.001
            onVerticalScale(factor, centerY)
            return
        }

        const delta = event.deltaY * -0.001
        onZoom(delta, centerX, centerY)
    }, [onZoom])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'Delete':
                    if (selection.length > 0) {
                        // Delete selected tasks
                        selection.forEach(taskId => onDeleteTask(taskId))
                    }
                    break
                case 'Escape':
                    onClearSelection()
                    break
                case 'a':
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault()
                        // Select all tasks
                        const allTaskIds = tasks.map(t => t.id)
                        onSelectTasks(allTaskIds)
                    }
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selection, tasks, onDeleteTask, onClearSelection, onSelectTasks])

    return (
        <div className="timeline-view">
            <canvas
                ref={canvasRef}
                className={`timeline-canvas${isDragging ? ' dragging' : ''}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={(e) => e.preventDefault()}
            />
            {!isInitialized && (
                <div className="timeline-loading">
                    <div className="loading-spinner">Loading timeline...</div>
                </div>
            )}
        </div>
    )
}
