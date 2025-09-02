import type { Task } from '@cadence/core'

export interface DndState {
    isDragging: boolean
    isResizing: boolean
    isCreatingDependency: boolean
    dragPending: boolean
    stageDownOnEmpty?: boolean
    draggedTaskId: string | null
    draggedTask: Task | null
    dragStartX: number
    dragStartY: number
    offsetX: number
    offsetY: number
    clickLocalX?: number
    clickLocalY?: number
    initialDuration: number
    snapDayIndex?: number
    snapStaffId?: string
    snapStaffLine?: number
    snapSnappedX?: number
    dropProcessed?: boolean
    dependencySourceTaskId?: string | null
    dependencyHoverTargetId?: string | null
    minAllowedDayIndex?: number
    pointerDownOnStage?: boolean
}

export function createInitialState(): DndState {
    return {
        isDragging: false,
        isResizing: false,
        isCreatingDependency: false,
        dragPending: false,
        stageDownOnEmpty: false,
        draggedTaskId: null,
        draggedTask: null,
        dragStartX: 0,
        dragStartY: 0,
        offsetX: 0,
        offsetY: 0,
        clickLocalX: undefined,
        clickLocalY: undefined,
        initialDuration: 0,
        snapDayIndex: undefined,
        snapStaffId: undefined,
        snapStaffLine: undefined,
        snapSnappedX: undefined,
        dropProcessed: false,
        dependencySourceTaskId: null,
        dependencyHoverTargetId: null,
        minAllowedDayIndex: undefined,
        pointerDownOnStage: false
    }
}
