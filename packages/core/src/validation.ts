/**
 * Validation schemas for Cadence Project Management System
 * Based on Design.md specification using Zod
 */

import { z } from 'zod'
import { TaskStatus, DependencyType } from './types'

// Relaxed formats to align with current demo data while keeping strong constraints elsewhere
const IdString = z.string().min(1)
const IsoDateOrYMD = z.string().refine((s) => /\d{4}-\d{2}-\d{2}(T.*)?$/.test(s), 'Expected YYYY-MM-DD or ISO datetime')

export const ProjectSchema = z.object({
  id: IdString,
  name: z.string().min(1).max(255),
  startDate: IsoDateOrYMD,
  endDate: IsoDateOrYMD,
  createdAt: IsoDateOrYMD,
  updatedAt: IsoDateOrYMD,
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date must be before or equal to end date',
  path: ['endDate'],
})

export const TaskSchema = z.object({
  id: IdString,
  title: z.string().min(1).max(255),
  startDate: IsoDateOrYMD,
  durationDays: z.number().min(1).max(365),
  status: z.nativeEnum(TaskStatus),
  assignee: z.string().optional(),
  projectId: IdString,
  createdAt: IsoDateOrYMD,
  updatedAt: IsoDateOrYMD,
})

export const MilestoneSchema = z.object({
  id: IdString,
  title: z.string().min(1).max(255),
  date: IsoDateOrYMD,
  projectId: IdString,
  createdAt: IsoDateOrYMD,
  updatedAt: IsoDateOrYMD,
})

export const DependencySchema = z.object({
  id: IdString,
  srcTaskId: IdString,
  dstTaskId: IdString,
  type: z.nativeEnum(DependencyType),
  projectId: IdString,
  createdAt: IsoDateOrYMD,
  updatedAt: IsoDateOrYMD,
}).refine(data => data.srcTaskId !== data.dstTaskId, {
  message: 'Source and destination tasks cannot be the same',
  path: ['dstTaskId'],
})

// This will be moved to the @cadence/state package
/*
export const UIStateSchema = z.object({
  activeProjectId: IdString.nullable(),
  selection: z.array(IdString),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number().min(0.1).max(10),
  }),
})
*/

// IPC Validation Schemas
export const IPCOpenProjectSchema = z.object({
  projectId: IdString,
})

export const IPCCreateTaskSchema = z.object({
  projectId: IdString,
  title: z.string().min(1).max(255),
  startDate: IsoDateOrYMD,
  durationDays: z.number().min(1).max(365),
  assignee: z.string().optional(),
})

export const IPCUpdateTaskSchema = z.object({
  taskId: IdString,
  updates: z.object({
    title: z.string().min(1).max(255).optional(),
    startDate: IsoDateOrYMD.optional(),
    durationDays: z.number().min(1).max(365).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    assignee: z.string().optional(),
    description: z.string().max(2000).optional(),
  }),
})

export const IPCCreateDependencySchema = z.object({
  projectId: IdString,
  srcTaskId: IdString,
  dstTaskId: IdString,
  type: z.nativeEnum(DependencyType),
}).refine(data => data.srcTaskId !== data.dstTaskId, {
  message: 'Source and destination tasks cannot be the same',
  path: ['dstTaskId'],
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
