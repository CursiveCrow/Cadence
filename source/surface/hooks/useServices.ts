/**
 * useServices Hook
 * Provides access to domain service instances
 */

import { useMemo } from 'react'
import { TaskService } from '../../core/domain/services/TaskService'
import { DependencyService } from '../../core/domain/services/DependencyService'
import { SchedulingService } from '../../core/domain/services/SchedulingService'
import { ValidationService } from '../../core/domain/services/ValidationService'
import { InMemoryEventBus } from '../../core/domain/events/TaskEvents'

export interface Services {
    taskService: TaskService
    dependencyService: DependencyService
    schedulingService: SchedulingService
    validationService: ValidationService
    eventBus: InMemoryEventBus
}

export function useServices(): Services {
    return useMemo(() => {
        const taskService = new TaskService()
        const dependencyService = new DependencyService()
        const schedulingService = new SchedulingService(dependencyService, taskService)
        const validationService = new ValidationService()
        const eventBus = new InMemoryEventBus()

        return {
            taskService,
            dependencyService,
            schedulingService,
            validationService,
            eventBus
        }
    }, [])
}
