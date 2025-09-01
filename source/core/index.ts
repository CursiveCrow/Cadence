/**
 * Core Layer Exports
 * Central export point for all domain logic
 */

// Entities
export { Task, type TaskProperties } from './domain/entities/Task'
export { Dependency, type DependencyProperties } from './domain/entities/Dependency'
export { Staff, type StaffProperties } from './domain/entities/Staff'
export { Project, type ProjectProperties } from './domain/entities/Project'

// Value Objects
export { TaskStatus, TaskStatusValue, TaskStatusEnum } from './domain/value-objects/TaskStatus'
export { DependencyType, DependencyTypeValue, DependencyTypeEnum } from './domain/value-objects/DependencyType'
export { TimeRange } from './domain/value-objects/TimeRange'
export { TimeSignature } from './domain/value-objects/TimeSignature'

// Domain Services
export { TaskService } from './domain/services/TaskService'
export { DependencyService } from './domain/services/DependencyService'
export { SchedulingService } from './domain/services/SchedulingService'
export { ValidationService, type ValidationResult } from './domain/services/ValidationService'

// Events
export * from './domain/events/TaskEvents'

// Use Cases - Commands
export { CreateTaskCommand } from './use-cases/commands/CreateTaskCommand'
export { UpdateTaskCommand } from './use-cases/commands/UpdateTaskCommand'
export { CreateDependencyCommand } from './use-cases/commands/CreateDependencyCommand'

// Use Cases - Queries
export { GetTasksQuery } from './use-cases/queries/GetTasksQuery'
export { GetDependenciesQuery } from './use-cases/queries/GetDependenciesQuery'

// DTOs
export * from './use-cases/dto/TaskDTO'

// Repository Interfaces
export type { TaskRepository } from './use-cases/commands/CreateTaskCommand'
export type { DependencyRepository } from './use-cases/commands/CreateDependencyCommand'
export type { StaffRepository } from './use-cases/commands/CreateTaskCommand'
export type { ProjectRepository } from './use-cases/commands/CreateTaskCommand'
