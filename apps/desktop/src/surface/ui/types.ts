import { Task, Staff } from '@cadence/core'
export type TaskPopupTask = Task
export type TaskPopupStaff = Pick<Staff, 'id' | 'name' | 'numberOfLines'>

