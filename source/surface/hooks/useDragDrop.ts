/**
 * useDragDrop Hook
 * Manages drag and drop interactions for tasks and dependencies
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { Task } from '../../core/domain/entities/Task'
import { DependencyType } from '../../core/domain/value-objects/DependencyType'
import { CONSTANTS } from '../../config/constants'

export interface DragDropCallbacks {
    onTaskMove?: (taskId: string, newStaffId: string, newStaffLine: number, newStartDate: string) => void
    onTaskResize?: (taskId: string, newDuration: number) => void
    onDependencyCreate?: (srcTaskId: string, dstTaskId: string, type: DependencyType) => void
    onSelect?: (taskIds: string[]) => void
    onDragStart?: () => void
    onDragEnd?: () => void
}

export interface DragDropOptions {
    snapToGrid?: boolean
    gridSnapSize?: number
    projectStartDate: Date
    dayWidth: number
    staffs: Array<{ id: string; numberOfLines: number }>
    tasks: Record<string, Task>
}

interface DragState {
    isDragging: boolean
    isResizing: boolean
    isCreatingDependency: boolean
    draggedTaskId: string | null
    dragStartX: number
    dragStartY: number
    offsetX: number
    offsetY: number
    initialDuration: number
    dependencySourceId: string | null
    resizeEdge: 'left' | 'right' | null
}

export interface UseDragDropResult {
    // State
    isDragging: boolean
    isResizing: boolean
    isCreatingDependency: boolean
    draggedTaskId: string | null
    dependencySourceId: string | null
    dragPreview: { x: number; y: number; width?: number } | null

    // Handlers
    handleTaskMouseDown: (e: React.MouseEvent, task: Task) => void
    handleTaskMouseEnter: (e: React.MouseEvent, task: Task) => void
    handleTaskMouseLeave: (e: React.MouseEvent) => void
    handleCanvasMouseMove: (e: React.MouseEvent) => void
    handleCanvasMouseUp: (e: React.MouseEvent) => void
    handleCanvasMouseLeave: (e: React.MouseEvent) => void

    // Utilities
    getCursorForTask: (e: React.MouseEvent, task: Task) => string
    isNearEdge: (e: React.MouseEvent, task: Task, edge: 'left' | 'right') => boolean
}

export function useDragDrop(
    options: DragDropOptions,
    callbacks: DragDropCallbacks = {}
): UseDragDropResult {
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        isResizing: false,
        isCreatingDependency: false,
        draggedTaskId: null,
        dragStartX: 0,
        dragStartY: 0,
        offsetX: 0,
        offsetY: 0,
        initialDuration: 0,
        dependencySourceId: null,
        resizeEdge: null
    })

    const [dragPreview, setDragPreview] = useState<{ x: number; y: number; width?: number } | null>(null)
    const dragStateRef = useRef(dragState)

    // Update ref when state changes
    useEffect(() => {
        dragStateRef.current = dragState
    }, [dragState])

    /**
     * Check if mouse is near task edge
     */
    const isNearEdge = useCallback((e: React.MouseEvent, task: Task, edge: 'left' | 'right'): boolean => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const threshold = 8

        if (edge === 'left') {
            return x < threshold
        } else {
            return x > rect.width - threshold
        }
    }, [])

    /**
     * Get cursor style for task
     */
    const getCursorForTask = useCallback((e: React.MouseEvent, task: Task): string => {
        if (isNearEdge(e, task, 'left') || isNearEdge(e, task, 'right')) {
            return 'ew-resize'
        }
        return 'grab'
    }, [isNearEdge])

    /**
     * Convert screen coordinates to timeline coordinates
     */
    const screenToTimeline = useCallback((screenX: number, screenY: number) => {
        const dayIndex = Math.floor((screenX - CONSTANTS.DEFAULT_LEFT_MARGIN) / options.dayWidth)
        const date = new Date(options.projectStartDate)
        date.setDate(date.getDate() + dayIndex)

        // Find nearest staff line
        const staffY = screenY - CONSTANTS.DEFAULT_TOP_MARGIN
        const staffIndex = Math.floor(staffY / CONSTANTS.DEFAULT_STAFF_SPACING)
        const staff = options.staffs[Math.max(0, Math.min(staffIndex, options.staffs.length - 1))]

        const relativeY = staffY - (staffIndex * CONSTANTS.DEFAULT_STAFF_SPACING)
        const staffLine = Math.round(relativeY / CONSTANTS.DEFAULT_STAFF_LINE_SPACING)

        return {
            date: date.toISOString().split('T')[0],
            staffId: staff?.id,
            staffLine: Math.max(0, Math.min(staffLine, (staff?.numberOfLines || 1) - 1)),
            dayIndex
        }
    }, [options])

    /**
     * Handle task mouse down
     */
    const handleTaskMouseDown = useCallback((e: React.MouseEvent, task: Task) => {
        e.preventDefault()
        e.stopPropagation()

        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left

        // Check for right click (dependency creation)
        if (e.button === 2) {
            setDragState(prev => ({
                ...prev,
                isCreatingDependency: true,
                dependencySourceId: task.id
            }))
            callbacks.onDragStart?.()
            return
        }

        // Check for resize
        if (isNearEdge(e, task, 'left')) {
            setDragState(prev => ({
                ...prev,
                isResizing: true,
                draggedTaskId: task.id,
                dragStartX: e.clientX,
                dragStartY: e.clientY,
                initialDuration: task.durationDays,
                resizeEdge: 'left'
            }))
            callbacks.onDragStart?.()
        } else if (isNearEdge(e, task, 'right')) {
            setDragState(prev => ({
                ...prev,
                isResizing: true,
                draggedTaskId: task.id,
                dragStartX: e.clientX,
                dragStartY: e.clientY,
                initialDuration: task.durationDays,
                resizeEdge: 'right'
            }))
            callbacks.onDragStart?.()
        } else {
            // Regular drag
            setDragState(prev => ({
                ...prev,
                isDragging: true,
                draggedTaskId: task.id,
                dragStartX: e.clientX,
                dragStartY: e.clientY,
                offsetX: x,
                offsetY: e.clientY - rect.top
            }))
            callbacks.onSelect?.([task.id])
            callbacks.onDragStart?.()
        }
    }, [callbacks, isNearEdge])

    /**
     * Handle task mouse enter
     */
    const handleTaskMouseEnter = useCallback((e: React.MouseEvent, task: Task) => {
        // If creating dependency, this could be the target
        if (dragStateRef.current.isCreatingDependency &&
            dragStateRef.current.dependencySourceId &&
            dragStateRef.current.dependencySourceId !== task.id) {
            // Visual feedback could be added here
        }
    }, [])

    /**
     * Handle task mouse leave
     */
    const handleTaskMouseLeave = useCallback((e: React.MouseEvent) => {
        // Reset cursor or visual feedback
    }, [])

    /**
     * Handle canvas mouse move
     */
    const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
        const state = dragStateRef.current

        if (state.isDragging && state.draggedTaskId) {
            // Calculate new position
            const newX = e.clientX - state.offsetX
            const newY = e.clientY - state.offsetY

            const timeline = screenToTimeline(newX, newY)

            // Update preview
            setDragPreview({
                x: newX,
                y: newY
            })
        } else if (state.isResizing && state.draggedTaskId) {
            const task = options.tasks[state.draggedTaskId]
            if (!task) return

            const deltaX = e.clientX - state.dragStartX
            const daysDelta = Math.round(deltaX / options.dayWidth)

            if (state.resizeEdge === 'right') {
                const newDuration = Math.max(1, state.initialDuration + daysDelta)
                setDragPreview({
                    x: 0,
                    y: 0,
                    width: newDuration * options.dayWidth
                })
            } else if (state.resizeEdge === 'left') {
                const newDuration = Math.max(1, state.initialDuration - daysDelta)
                const startDate = new Date(task.startDate)
                startDate.setDate(startDate.getDate() + daysDelta)

                setDragPreview({
                    x: daysDelta * options.dayWidth,
                    y: 0,
                    width: newDuration * options.dayWidth
                })
            }
        } else if (state.isCreatingDependency && state.dependencySourceId) {
            // Update dependency preview line
            setDragPreview({
                x: e.clientX,
                y: e.clientY
            })
        }
    }, [options, screenToTimeline])

    /**
     * Handle canvas mouse up
     */
    const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
        const state = dragStateRef.current

        if (state.isDragging && state.draggedTaskId) {
            // Complete the drag
            const newX = e.clientX - state.offsetX
            const newY = e.clientY - state.offsetY
            const timeline = screenToTimeline(newX, newY)

            if (timeline.staffId) {
                callbacks.onTaskMove?.(
                    state.draggedTaskId,
                    timeline.staffId,
                    timeline.staffLine,
                    timeline.date
                )
            }
        } else if (state.isResizing && state.draggedTaskId) {
            const task = options.tasks[state.draggedTaskId]
            if (!task) return

            const deltaX = e.clientX - state.dragStartX
            const daysDelta = Math.round(deltaX / options.dayWidth)

            if (state.resizeEdge === 'right') {
                const newDuration = Math.max(1, state.initialDuration + daysDelta)
                callbacks.onTaskResize?.(state.draggedTaskId, newDuration)
            } else if (state.resizeEdge === 'left') {
                const newDuration = Math.max(1, state.initialDuration - daysDelta)
                const startDate = new Date(task.startDate)
                startDate.setDate(startDate.getDate() + daysDelta)

                callbacks.onTaskMove?.(
                    state.draggedTaskId,
                    task.staffId,
                    task.staffLine,
                    startDate.toISOString().split('T')[0]
                )
                callbacks.onTaskResize?.(state.draggedTaskId, newDuration)
            }
        } else if (state.isCreatingDependency && state.dependencySourceId) {
            // Check if over a task
            const element = document.elementFromPoint(e.clientX, e.clientY)
            const taskElement = element?.closest('[data-task-id]')
            if (taskElement) {
                const targetId = taskElement.getAttribute('data-task-id')
                if (targetId && targetId !== state.dependencySourceId) {
                    callbacks.onDependencyCreate?.(
                        state.dependencySourceId,
                        targetId,
                        DependencyType.FINISH_TO_START
                    )
                }
            }
        }

        // Reset state
        setDragState({
            isDragging: false,
            isResizing: false,
            isCreatingDependency: false,
            draggedTaskId: null,
            dragStartX: 0,
            dragStartY: 0,
            offsetX: 0,
            offsetY: 0,
            initialDuration: 0,
            dependencySourceId: null,
            resizeEdge: null
        })

        setDragPreview(null)
        callbacks.onDragEnd?.()
    }, [callbacks, options, screenToTimeline])

    /**
     * Handle canvas mouse leave
     */
    const handleCanvasMouseLeave = useCallback((e: React.MouseEvent) => {
        // Could cancel the operation or complete it
    }, [])

    return {
        isDragging: dragState.isDragging,
        isResizing: dragState.isResizing,
        isCreatingDependency: dragState.isCreatingDependency,
        draggedTaskId: dragState.draggedTaskId,
        dependencySourceId: dragState.dependencySourceId,
        dragPreview,
        handleTaskMouseDown,
        handleTaskMouseEnter,
        handleTaskMouseLeave,
        handleCanvasMouseMove,
        handleCanvasMouseUp,
        handleCanvasMouseLeave,
        getCursorForTask,
        isNearEdge
    }
}
