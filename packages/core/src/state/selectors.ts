import type { RootState } from './store'
import type { Task, Dependency, Staff } from '@cadence/core'

export const selectTaskEntities = (state: RootState): Record<string, Task> =>
    ((state as any).tasks?.entities || {}) as Record<string, Task>

export const selectDependencyEntities = (state: RootState): Record<string, Dependency> =>
    ((state as any).dependencies?.entities || {}) as Record<string, Dependency>

export const selectSelection = (state: RootState): string[] => state.selection.ids

export const selectViewport = (state: RootState): { x: number; y: number; zoom: number } => state.viewport

export const selectStaffs = (state: RootState): Staff[] => state.staffs.list


