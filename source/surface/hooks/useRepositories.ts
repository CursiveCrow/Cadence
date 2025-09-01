/**
 * useRepositories Hook
 * Provides access to repository instances
 */

import { useMemo } from 'react'
import { useStore } from 'react-redux'
import { ReduxTaskRepository } from '../../infrastructure/persistence/redux/repositories/TaskRepository'
import { ReduxDependencyRepository } from '../../infrastructure/persistence/redux/repositories/DependencyRepository'
import { ReduxStaffRepository } from '../../infrastructure/persistence/redux/repositories/StaffRepository'
import { ReduxProjectRepository } from '../../infrastructure/persistence/redux/repositories/ProjectRepository'

export interface Repositories {
    taskRepository: ReduxTaskRepository
    dependencyRepository: ReduxDependencyRepository
    staffRepository: ReduxStaffRepository
    projectRepository: ReduxProjectRepository
}

export function useRepositories(): Repositories {
    const store = useStore()

    return useMemo(() => ({
        taskRepository: new ReduxTaskRepository(store),
        dependencyRepository: new ReduxDependencyRepository(store),
        staffRepository: new ReduxStaffRepository(store),
        projectRepository: new ReduxProjectRepository(store)
    }), [store])
}
