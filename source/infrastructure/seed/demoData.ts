/**
 * Demo Data Seeder
 * Seeds initial demo data for development and testing
 */

import { store } from '../persistence/redux/store'
import { upsertProject } from '../persistence/redux/slices/projectsSlice'
import { upsertTask } from '../persistence/redux/slices/tasksSlice'
import { upsertDependency } from '../persistence/redux/slices/dependenciesSlice'
import { upsertStaff } from '../persistence/redux/slices/staffsSlice'
import { TaskStatus } from '../../core/domain/value-objects/TaskStatus'
import { DependencyType } from '../../core/domain/value-objects/DependencyType'

export function seedDemoData(projectId: string): void {
    // Check if already seeded
    const state = store.getState()
    if (state.projects.byId[projectId]) {
        return // Already seeded
    }

    // Create demo project
    const project = {
        id: projectId,
        name: 'Demo Music Project',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
    store.dispatch(upsertProject(project))

    // Create staffs (musical staff metaphor)
    const trebleStaff = {
        id: 'staff-treble',
        name: 'Treble Staff',
        numberOfLines: 5,
        lineSpacing: 24,
        position: 0,
        projectId,
        timeSignature: '4/4',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    const bassStaff = {
        id: 'staff-bass',
        name: 'Bass Staff',
        numberOfLines: 5,
        lineSpacing: 24,
        position: 1,
        projectId,
        timeSignature: '4/4',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    store.dispatch(upsertStaff({ projectId, staff: trebleStaff }))
    store.dispatch(upsertStaff({ projectId, staff: bassStaff }))

    // Create demo tasks
    const tasks = [
        {
            id: 'task-1',
            title: 'Intro Theme',
            startDate: '2024-01-01',
            durationDays: 3,
            status: TaskStatus.IN_PROGRESS,
            staffId: 'staff-treble',
            staffLine: 2,
            projectId,
            description: 'Opening theme for the composition',
            assignee: 'John Composer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'task-2',
            title: 'Main Melody',
            startDate: '2024-01-04',
            durationDays: 5,
            status: TaskStatus.NOT_STARTED,
            staffId: 'staff-treble',
            staffLine: 3,
            projectId,
            description: 'Primary melodic line',
            assignee: 'Jane Musician',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'task-3',
            title: 'Bass Line',
            startDate: '2024-01-02',
            durationDays: 4,
            status: TaskStatus.IN_PROGRESS,
            staffId: 'staff-bass',
            staffLine: 1,
            projectId,
            description: 'Supporting bass accompaniment',
            assignee: 'Bob Bassist',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'task-4',
            title: 'Harmony Section',
            startDate: '2024-01-06',
            durationDays: 3,
            status: TaskStatus.NOT_STARTED,
            staffId: 'staff-bass',
            staffLine: 2,
            projectId,
            description: 'Harmonic progression',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'task-5',
            title: 'Bridge',
            startDate: '2024-01-09',
            durationDays: 2,
            status: TaskStatus.COMPLETED,
            staffId: 'staff-treble',
            staffLine: 1,
            projectId,
            description: 'Transitional bridge section',
            assignee: 'Alice Arranger',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'task-6',
            title: 'Solo Section',
            startDate: '2024-01-11',
            durationDays: 3,
            status: TaskStatus.BLOCKED,
            staffId: 'staff-treble',
            staffLine: 4,
            projectId,
            description: 'Improvised solo part - waiting for key signature decision',
            assignee: 'John Composer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'task-7',
            title: 'Finale',
            startDate: '2024-01-14',
            durationDays: 2,
            status: TaskStatus.NOT_STARTED,
            staffId: 'staff-treble',
            staffLine: 2,
            projectId,
            description: 'Closing section',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'task-8',
            title: 'Percussion Track',
            startDate: '2024-01-03',
            durationDays: 1,
            status: TaskStatus.CANCELLED,
            staffId: 'staff-bass',
            staffLine: 4,
            projectId,
            description: 'Decided not to include percussion',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ]

    // Add tasks to store
    tasks.forEach(task => {
        store.dispatch(upsertTask({ projectId, task }))
    })

    // Create dependencies
    const dependencies = [
        {
            id: 'dep-1',
            srcTaskId: 'task-1',
            dstTaskId: 'task-2',
            type: DependencyType.FINISH_TO_START,
            projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'dep-2',
            srcTaskId: 'task-3',
            dstTaskId: 'task-4',
            type: DependencyType.FINISH_TO_START,
            projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'dep-3',
            srcTaskId: 'task-2',
            dstTaskId: 'task-5',
            type: DependencyType.FINISH_TO_START,
            projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'dep-4',
            srcTaskId: 'task-5',
            dstTaskId: 'task-6',
            type: DependencyType.FINISH_TO_START,
            projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'dep-5',
            srcTaskId: 'task-6',
            dstTaskId: 'task-7',
            type: DependencyType.FINISH_TO_START,
            projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ]

    // Add dependencies to store
    setTimeout(() => {
        dependencies.forEach(dep => {
            store.dispatch(upsertDependency({ projectId, dependency: dep }))
        })
    }, 100) // Small delay to ensure tasks are loaded first
}
