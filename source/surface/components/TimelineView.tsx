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
    onTaskHover,
    onTaskDragStart,
    onTaskDragEnd
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const engineRef = useRef<RenderEngine | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

    // Initialize render engine
    useEffect(() => {
        if (!canvasRef.current || isInitialized) return

        const initEngine = async () => {
            const engine = new RenderEngine({
                canvas: canvasRef.current!,
                projectId: project.id,
                config,
                plugins: []
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
            selection
        }

        engineRef.current.render(renderData, viewport)
    }, [tasks, dependencies, staffs, selection, viewport, isInitialized])

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

        // Check if clicking on a task
        const scene = engineRef.current.getScene()
        if (!scene) return

        // This would need to be implemented in the scene graph
        // to find which task is at the given position
        // For now, we'll handle general canvas interactions

        if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
            // Middle mouse or shift+left for panning
            setIsDragging(true)
        }
    }, [])

    const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!engineRef.current) return

        if (isDragging) {
            onPan(event.movementX, event.movementY)
        }

        // Handle task hover
        const rect = canvasRef.current!.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        // This would need to check which task is under the mouse
        // and call onTaskHover appropriately
    }, [isDragging, onPan, onTaskHover])

    const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(false)

        if (draggedTaskId) {
            onTaskDragEnd()
            setDraggedTaskId(null)
        }
    }, [draggedTaskId, onTaskDragEnd])

    const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
        event.preventDefault()

        const rect = canvasRef.current!.getBoundingClientRect()
        const centerX = event.clientX - rect.left
        const centerY = event.clientY - rect.top

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
                className="timeline-canvas"
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
