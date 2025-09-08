export * from './selectionSlice'
export * from './staffsSlice'
export * from './uiSlice'
export * from './viewportSlice'
export * from './tasksSlice'
export * from './dependenciesSlice'
export * from './projectsSlice'
export * from './uiDialogsSlice'

export { default as tasks } from './tasksSlice'
export { default as dependencies } from './dependenciesSlice'
export { default as projects } from './projectsSlice'
export { default as uiDialogs } from './uiDialogsSlice'

// Local type-only imports to describe state shapes without creating runtime deps
import tasksReducer from './tasksSlice'
import dependenciesReducer from './dependenciesSlice'
import projectsReducer from './projectsSlice'
import uiDialogsReducer from './uiDialogsSlice'

export type __CadenceStateSlices = {
    tasks: ReturnType<typeof tasksReducer>
    dependencies: ReturnType<typeof dependenciesReducer>
    projects: ReturnType<typeof projectsReducer>
    uiDialogs: ReturnType<typeof uiDialogsReducer>
}
