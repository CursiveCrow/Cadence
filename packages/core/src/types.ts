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
  laneIndex: number
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

export interface UIState {
  activeProjectId: string | null
  selection: string[] // Array of selected Task IDs
  viewport: { x: number; y: number; zoom: number }
}
