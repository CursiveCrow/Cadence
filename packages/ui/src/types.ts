import { TaskStatus } from '@cadence/core';

export interface UIStaff {
  id: string
  name: string
  numberOfLines: number
  lineSpacing: number
  position: number
}

export interface TaskPopupStaff {
  id: string
  name: string
  numberOfLines: number
}
export interface TaskPopupTask {
  id: string
  title: string
  startDate: string
  durationDays: number
  status: TaskStatus
  staffId: string
  staffLine: number
  assignee?: string
  description?: string
}

