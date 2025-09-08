import { useCallback } from 'react'
import type { Task, Staff } from '@cadence/core'
import { computeTaskLayout, computeEffectiveConfig } from '@cadence/core/renderer'

export interface PopupPositionConfig {
    LEFT_MARGIN: number
    DAY_WIDTH: number
    STAFF_SPACING: number
    TOP_MARGIN: number
    STAFF_LINE_SPACING: number
    TASK_HEIGHT?: number
}

export function useTaskPopupPosition(
    tasks: Record<string, Task>,
    staffs: Staff[],
    baseConfig: PopupPositionConfig,
    projectStart: Date,
    opts?: { zoom?: number; verticalScale?: number }
) {
    const calculatePopupPosition = useCallback((taskId: string) => {
        const task = tasks[taskId]
        if (!task) return null

        const zoom = Math.max(0.0001, opts?.zoom || 1)
        const verticalScale = Math.max(0.1, opts?.verticalScale || 1)
        const eff = computeEffectiveConfig(baseConfig as any, zoom, verticalScale) as any
        const layout = computeTaskLayout(eff, task as any, projectStart, staffs)
        // Position popup slightly above the task center, near its start
        const x = Math.round(layout.startX + Math.max(16, Math.min(layout.width / 2, 120)))
        const y = Math.round(layout.topY - Math.max(24, (eff.TASK_HEIGHT || 16)))
        return { x, y }
    }, [tasks, staffs, baseConfig, projectStart, opts?.zoom, opts?.verticalScale])

    return { calculatePopupPosition }
}


