import { Task, Staff } from '@cadence/core'

// This file is being refactored to remove type duplication.
// The types below are now imported directly from @cadence/core
// or defined inline in the components that use them if they are simple subsets.
export type TaskPopupTask = Task
export type TaskPopupStaff = Pick<Staff, 'id' | 'name' | 'numberOfLines'>

