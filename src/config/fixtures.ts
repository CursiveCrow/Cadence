import { TaskStatus, DependencyType } from '@types'
import type { Task, Dependency } from '@types'

export function seedDemoProject(
  demoProjectId: string,
  fns: {
    createTask: (projectId: string, task: Omit<Task, 'projectId' | 'createdAt' | 'updatedAt'>) => void,
    createDependency: (projectId: string, dep: Omit<Dependency, 'projectId' | 'createdAt' | 'updatedAt'>) => void,
  },
  isSeeded: () => boolean
) {
  if (!isSeeded()) {
    fns.createTask(demoProjectId, { id: 'task-1', title: 'Intro Theme', startDate: '2024-01-01', durationDays: 3, status: TaskStatus.IN_PROGRESS, staffId: 'staff-treble', staffLine: 4 })
    fns.createTask(demoProjectId, { id: 'task-2', title: 'Main Melody', startDate: '2024-01-03', durationDays: 4, status: TaskStatus.NOT_STARTED, staffId: 'staff-treble', staffLine: 8 })
    fns.createTask(demoProjectId, { id: 'task-3', title: 'Bass Line', startDate: '2024-01-02', durationDays: 3, status: TaskStatus.IN_PROGRESS, staffId: 'staff-bass', staffLine: 0 })
    fns.createTask(demoProjectId, { id: 'task-4', title: 'Harmony Section', startDate: '2024-01-05', durationDays: 2, status: TaskStatus.NOT_STARTED, staffId: 'staff-bass', staffLine: 4 })
    fns.createTask(demoProjectId, { id: 'task-5', title: 'Bridge', startDate: '2024-01-04', durationDays: 2, status: TaskStatus.COMPLETED, staffId: 'staff-treble', staffLine: 2 })
    fns.createTask(demoProjectId, { id: 'task-6', title: 'Solo Section', startDate: '2024-01-07', durationDays: 3, status: TaskStatus.BLOCKED, staffId: 'staff-treble', staffLine: 6 })

    fns.createTask(demoProjectId, { id: 'task-7', title: 'Harmony Part A', startDate: '2024-01-10', durationDays: 2, status: TaskStatus.IN_PROGRESS, staffId: 'staff-treble', staffLine: 6 })
    fns.createTask(demoProjectId, { id: 'task-8', title: 'Harmony Part B', startDate: '2024-01-10', durationDays: 2, status: TaskStatus.IN_PROGRESS, staffId: 'staff-treble', staffLine: 2 })
    fns.createTask(demoProjectId, { id: 'task-9', title: 'Harmony Part C', startDate: '2024-01-10', durationDays: 2, status: TaskStatus.COMPLETED, staffId: 'staff-bass', staffLine: 4 })

    fns.createTask(demoProjectId, { id: 'task-10', title: 'Finale Upper', startDate: '2024-01-13', durationDays: 1, status: TaskStatus.BLOCKED, staffId: 'staff-treble', staffLine: 8 })
    fns.createTask(demoProjectId, { id: 'task-11', title: 'Finale Lower', startDate: '2024-01-13', durationDays: 1, status: TaskStatus.BLOCKED, staffId: 'staff-bass', staffLine: 0 })

    fns.createTask(demoProjectId, { id: 'task-12', title: 'Dropped Feature', startDate: '2024-01-06', durationDays: 1, status: TaskStatus.CANCELLED, staffId: 'staff-bass', staffLine: 2 })
  }

  setTimeout(() => {
    fns.createDependency(demoProjectId, { id: 'dep-1', srcTaskId: 'task-1', dstTaskId: 'task-2', type: DependencyType.FINISH_TO_START })
    fns.createDependency(demoProjectId, { id: 'dep-2', srcTaskId: 'task-3', dstTaskId: 'task-4', type: DependencyType.FINISH_TO_START })
  }, 50)
}
