/**
 * Domain Types for Cadence Project Management System
 * Based on Design.md specification
 */

export interface Project {
  id: string
  name: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  startDate: string
  durationDays: number
  status: TaskStatus
  assignee?: string
  description?: string
  staffId: string // ID of the staff this task is on
  staffLine: number // Which line on the staff (0 = bottom line, 1 = first space, etc.)
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface Milestone {
  id: string
  title: string
  date: string
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface Dependency {
  id: string
  srcTaskId: string
  dstTaskId: string
  type: DependencyType
  projectId: string
  createdAt: string
  updatedAt: string
}

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled'
}

export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
  FINISH_TO_FINISH = 'finish_to_finish',
  START_TO_FINISH = 'start_to_finish'
}

export interface Staff {
  id: string
  name: string
  numberOfLines: number
  lineSpacing: number // pixels between staff lines
  position: number // order in the score
  projectId: string
  createdAt: string
  updatedAt: string
  /** Optional musical time signature for this staff (e.g., "4/4", "3/4") */
  timeSignature?: string
}
