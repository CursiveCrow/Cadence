import { store } from '@state/store'
import { setStaffs } from '@state/slices/staffsSlice'
import { setTasks } from '@state/slices/tasksSlice'
import type { Staff, Task } from '../../types'
import { TaskStatus } from '../../types'

// Initialize demo data if in development mode and no data exists
export function initializeDemoDataIfNeeded() {
    if (!import.meta.env.DEV) return

    const state = store.getState()

    // Seed demo staffs if none exist
    if ((state.staffs.list || []).length === 0) {
        const now = new Date().toISOString()
        const demoStaffs: Staff[] = [
            {
                id: 'treble',
                name: 'Treble',
                numberOfLines: 5,
                lineSpacing: 12,
                position: 0,
                projectId: 'demo',
                createdAt: now,
                updatedAt: now,
                timeSignature: '4/4'
            },
            {
                id: 'bass',
                name: 'Bass',
                numberOfLines: 5,
                lineSpacing: 12,
                position: 1,
                projectId: 'demo',
                createdAt: now,
                updatedAt: now,
                timeSignature: '3/4'
            },
        ]
        store.dispatch(setStaffs(demoStaffs))
    }

    // Seed demo tasks if none exist  
    if ((state.tasks.list || []).length === 0) {
        const now = new Date().toISOString()
        const demoTasks: Task[] = [
            {
                id: 't-1',
                title: 'Note A',
                startDate: '2024-01-22',
                durationDays: 3,
                status: TaskStatus.NOT_STARTED,
                staffId: 'treble',
                staffLine: 4,
                projectId: 'demo',
                createdAt: now,
                updatedAt: now
            },
            {
                id: 't-2',
                title: 'Note B',
                startDate: '2024-01-28',
                durationDays: 2,
                status: TaskStatus.IN_PROGRESS,
                staffId: 'bass',
                staffLine: 6,
                projectId: 'demo',
                createdAt: now,
                updatedAt: now
            },
        ]
        store.dispatch(setTasks(demoTasks))
    }
}







