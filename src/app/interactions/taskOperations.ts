import { store, RootState } from '../../state/store'
import { dayIndexFromISO, isoFromDayIndex } from '../../renderer/utils'
import { PROJECT_START_DATE } from '../../config'
import { updateTask } from '../../state/tasks'
import { addDependency } from '../../state/dependencies'
import type { Staff, Task, Dependency, DependencyType } from '../../types'
import { TaskStatus } from '../../types'

// Task validation utilities
export function getMinAllowedStartDayForTask(taskId: string, s: RootState): number {
    let minIdx = 0
    for (const d of s.dependencies.list) {
        if (d.dstTaskId === taskId) {
            const src = s.tasks.list.find(tsk => tsk.id === d.srcTaskId)
            if (src) {
                const sidx = Math.max(0, dayIndexFromISO(src.startDate, PROJECT_START_DATE))
                const req = sidx + src.durationDays
                if (req > minIdx) minIdx = req
            }
        }
    }
    return minIdx
}

// Staff geometry utilities
interface StaffBlock {
    id: string
    yTop: number
    yBottom: number
    lineSpacing: number
}

export function findStaffBlockAtY(staffBlocks: StaffBlock[], y: number) {
    return staffBlocks.find(b => y >= b.yTop && y <= b.yBottom) || staffBlocks[0]
}

// Time signature utilities
export function getTimeSignature(staffId: string): { n: number; d: number } {
    const s = store.getState() as RootState
    const ts = (s.staffs.list.find((st) => st.id === staffId)?.timeSignature || '4/4').split('/')
    const n = Math.max(1, parseInt(ts[0] || '4', 10) || 4)
    const d = Math.max(1, parseInt(ts[1] || '4', 10) || 4)
    return { n, d }
}

// Day counting and availability utilities
export function countNotesOnDay(staffId: string, dayIndex: number, ignoreTaskId?: string): number {
    const s = store.getState() as RootState
    let count = 0
    for (const t of s.tasks.list) {
        if (ignoreTaskId && t.id === ignoreTaskId) continue
        if (t.staffId !== staffId) continue
        const di = Math.max(0, dayIndexFromISO(t.startDate, PROJECT_START_DATE))
        if (di === dayIndex) count++
    }
    return count
}

export function findAvailableDay(staffId: string, desiredDay: number, ignoreTaskId?: string): number {
    const { n, d } = getTimeSignature(staffId)
    let measureStart = Math.floor(Math.max(0, desiredDay) / d) * d
    let relative = Math.max(0, desiredDay) - measureStart
    for (let attempts = 0; attempts < 64; attempts++) {
        for (let i = 0; i < d; i++) {
            const cand = measureStart + ((relative + i) % d)
            if (countNotesOnDay(staffId, cand, ignoreTaskId) < n) return cand
        }
        measureStart += d
        relative = 0
    }
    return Math.max(0, desiredDay)
}

// Task creation operations
export function createNewTask(staffs: Staff[]): Task {
    const randomStaff = staffs[Math.floor(Math.random() * staffs.length)] || staffs[0]
    const now = new Date().toISOString()
    return {
        id: `task-${Date.now()}`,
        title: 'New Note',
        startDate: '2024-01-08',
        durationDays: 2,
        status: TaskStatus.NOT_STARTED,
        staffId: randomStaff?.id || 'treble',
        staffLine: 4,
        projectId: 'demo',
        createdAt: now,
        updatedAt: now
    }
}

// Task update operations
export function moveTask(taskId: string, newStaffId: string, newStaffLine: number, newDay: number) {
    const allowedDay = Math.max(0, findAvailableDay(newStaffId, newDay, taskId))
    const iso = isoFromDayIndex(allowedDay, PROJECT_START_DATE)

    store.dispatch(updateTask({
        id: taskId,
        updates: {
            startDate: iso,
            staffId: newStaffId,
            staffLine: newStaffLine
        }
    }))
}

export function resizeTask(taskId: string, newDuration: number) {
    store.dispatch(updateTask({
        id: taskId,
        updates: {
            durationDays: Math.max(1, newDuration)
        }
    }))
}

// Dependency operations
export function createDependencyBetweenTasks(srcTask: Task, dstTask: Task) {
    const toMs = (iso: string) => {
        const p = iso.split('-').map(Number)
        return Date.UTC(p[0]!, (p[1]! - 1), p[2]!)
    }

    const [src, dst] = toMs(srcTask.startDate) <= toMs(dstTask.startDate) ? [srcTask, dstTask] : [dstTask, srcTask]
    const now = new Date().toISOString()

    const dep: Dependency = {
        id: `dep-${Date.now()}`,
        srcTaskId: src.id,
        dstTaskId: dst.id,
        type: 'finish_to_start' as DependencyType,
        projectId: 'demo',
        createdAt: now,
        updatedAt: now
    }

    store.dispatch(addDependency(dep))
}

export function createLinkDependency(selectedTasks: string[]) {
    if (selectedTasks.length !== 2) return

    const now = new Date().toISOString()
    const dep: Dependency = {
        id: `dep-${Date.now()}`,
        srcTaskId: selectedTasks[0],
        dstTaskId: selectedTasks[1],
        type: 'finish_to_start' as DependencyType,
        projectId: 'demo',
        createdAt: now,
        updatedAt: now
    }

    store.dispatch(addDependency(dep))
}

// Task operation helpers
export function shouldTreatAsClick(startX: number, startY: number, endX: number, endY: number): boolean {
    const moved = Math.hypot(endX - startX, endY - startY)
    return moved < 5
}

export function calculateTaskDurationFromResize(
    taskStartDate: string,
    resizeEndX: number,
    viewport: { x: number; y: number; zoom: number },
    leftMargin: number,
    dayWidth: number,
    screenXToWorldDays: (localX: number, viewport: any, leftMargin: number, dayWidth: number) => number
): number {
    const dayIndex = Math.max(0, dayIndexFromISO(taskStartDate, PROJECT_START_DATE))
    const worldAtX = screenXToWorldDays(resizeEndX, viewport, leftMargin, dayWidth)
    const rightIndex = Math.max(dayIndex + 1, Math.round(worldAtX))
    return Math.max(1, rightIndex - dayIndex)
}

export function calculateTaskPositionFromMove(
    localX: number,
    localY: number,
    clickOffsetX: number,
    viewport: { x: number; y: number; zoom: number },
    leftMargin: number,
    dayWidth: number,
    staffBlocks: StaffBlock[],
    lineSpacing: number,
    screenXToWorldDays: (localX: number, viewport: any, leftMargin: number, dayWidth: number) => number
): {
    dayIndex: number
    staffId: string
    staffLine: number
} {
    const snappedLocalStart = Math.max(0, (localX - clickOffsetX))
    const initialDay = Math.max(0, Math.round(screenXToWorldDays(snappedLocalStart, viewport, leftMargin, dayWidth)))

    const sb = findStaffBlockAtY(staffBlocks, localY)
    const lineStep = lineSpacing / 2
    const staffLine = Math.max(0, Math.round(((localY) - (sb?.yTop || 0)) / Math.max(1, lineStep)))

    return {
        dayIndex: initialDay,
        staffId: (sb as any)?.id || 'treble',
        staffLine
    }
}
