/**
 * Validation schemas for Cadence Project Management System
 * Based on Design.md specification using Zod
 */

import { z } from 'zod'
import { TaskStatus, DependencyType } from './types'

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: "Start date must be before or equal to end date",
  path: ["endDate"],
})

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  startDate: z.string().datetime(),
  durationDays: z.number().min(1).max(365),
  status: z.nativeEnum(TaskStatus),
  assignee: z.string().optional(),
  laneIndex: z.number().min(0),
  projectId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const MilestoneSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  date: z.string().datetime(),
  projectId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const DependencySchema = z.object({
  id: z.string().uuid(),
  srcTaskId: z.string().uuid(),
  dstTaskId: z.string().uuid(),
  type: z.nativeEnum(DependencyType),
  projectId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).refine(data => data.srcTaskId !== data.dstTaskId, {
  message: "Source and destination tasks cannot be the same",
  path: ["dstTaskId"],
})

export const UIStateSchema = z.object({
  activeProjectId: z.string().uuid().nullable(),
  selection: z.array(z.string().uuid()),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number().min(0.1).max(10),
  }),
})

// IPC Validation Schemas
export const IPCOpenProjectSchema = z.object({
  projectId: z.string().uuid(),
})

export const IPCCreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  startDate: z.string().datetime(),
  durationDays: z.number().min(1).max(365),
  assignee: z.string().optional(),
})

export const IPCUpdateTaskSchema = z.object({
  taskId: z.string().uuid(),
  updates: z.object({
    title: z.string().min(1).max(255).optional(),
    startDate: z.string().datetime().optional(),
    durationDays: z.number().min(1).max(365).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    assignee: z.string().optional(),
    laneIndex: z.number().min(0).optional(),
  }),
})

export const IPCCreateDependencySchema = z.object({
  projectId: z.string().uuid(),
  srcTaskId: z.string().uuid(),
  dstTaskId: z.string().uuid(),
  type: z.nativeEnum(DependencyType),
}).refine(data => data.srcTaskId !== data.dstTaskId, {
  message: "Source and destination tasks cannot be the same",
  path: ["dstTaskId"],
})

// Export/Import Schemas
export const ProjectExportSchema = z.object({
  project: ProjectSchema,
  tasks: z.array(TaskSchema),
  dependencies: z.array(DependencySchema),
  milestones: z.array(MilestoneSchema),
  exportedAt: z.string().datetime(),
  version: z.string(),
})
