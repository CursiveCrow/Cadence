/**
 * Infrastructure Layer Exports
 * Central export point for technical implementations
 */

// Redux Store
export { store, useAppDispatch, useAppSelector, type RootState, type AppDispatch } from './persistence/redux/store'

// Redux Slices
export * from './persistence/redux/slices/tasksSlice'
export * from './persistence/redux/slices/dependenciesSlice'
export * from './persistence/redux/slices/staffsSlice'
export * from './persistence/redux/slices/projectsSlice'
export * from './persistence/redux/slices/uiSlice'
export * from './persistence/redux/slices/selectionSlice'
export * from './persistence/redux/slices/viewportSlice'
export * from './persistence/redux/slices/timelineSlice'

// Repositories
export { ReduxTaskRepository } from './persistence/redux/repositories/TaskRepository'
export { ReduxDependencyRepository } from './persistence/redux/repositories/DependencyRepository'
export { ReduxStaffRepository } from './persistence/redux/repositories/StaffRepository'
export { ReduxProjectRepository } from './persistence/redux/repositories/ProjectRepository'

// Platform Services
export { PlatformService } from './platform/PlatformService'
export { ElectronPlatformService } from './platform/electron/ElectronPlatform'
export { WebPlatformService } from './platform/web/WebPlatform'

// Seed Data
export { seedDemoData } from './seed/demoData'
