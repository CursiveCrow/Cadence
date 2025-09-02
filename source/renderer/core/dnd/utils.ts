import { TimelineSceneManager } from '../scene'
import { DataProviders, Utils as DndUtils } from './types'

export function findNearestStaffLineScaled(y: number, scaled: { TOP_MARGIN: number; STAFF_SPACING: number; STAFF_LINE_SPACING: number }, data: DataProviders): { staff: any; staffLine: number; centerY: number } | null {
    const staffs = data.getStaffs()
    if (!staffs || staffs.length === 0) return null
    let closest: { staff: any; staffLine: number; centerY: number } | null = null
    let minDistance = Infinity
    const halfStep = scaled.STAFF_LINE_SPACING / 2
    for (let i = 0; i < staffs.length; i++) {
        const staff = staffs[i]
        const staffStartY = scaled.TOP_MARGIN + i * scaled.STAFF_SPACING
        const maxIndex = (staff.numberOfLines - 1) * 2
        for (let idx = 0; idx <= maxIndex; idx++) {
            const centerY = staffStartY + idx * halfStep
            const dist = Math.abs(y - centerY)
            if (dist < minDistance) {
                minDistance = dist
                closest = { staff, staffLine: idx, centerY }
            }
        }
    }
    return closest
}

export function findTaskAtGlobal(global: { x: number; y: number }, scene: TimelineSceneManager, excludeId?: string): string | null {
    const local = scene.layers.viewport ? scene.layers.viewport.toLocal(global as any) : global
    return (scene as any).findTaskAtViewportPoint?.(local.x, local.y, excludeId) || null
}

export function resolveTaskIdFromHit(hit: any, scene: TimelineSceneManager): string | null {
    let current: any = hit
    while (current) {
        for (const [taskId, cont] of scene.taskContainers.entries()) {
            if (current === cont) return taskId
        }
        current = current.parent
    }
    return null
}

export function computeMinAllowedDayIndex(taskId: string, data: DataProviders, utils: DndUtils): number {
    try {
        const deps = data.getDependencies()
        const tasks = data.getTasks()
        let minIdx = 0
        for (const dep of Object.values(deps)) {
            if (dep.dstTaskId === taskId) {
                const src = tasks[dep.srcTaskId]
                if (!src) continue
                const start = new Date(src.startDate)
                const projStart = utils.getProjectStartDate()
                const srcDayIndex = Math.floor((start.getTime() - projStart.getTime()) / (1000 * 60 * 60 * 24))
                const requiredIdx = srcDayIndex + (src as any).durationDays
                if (requiredIdx > minIdx) minIdx = requiredIdx
            }
        }
        return minIdx
    } catch {
        return 0
    }
}
