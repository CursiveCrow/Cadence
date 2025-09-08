import { createSelector } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { dayIndexFromISO, pixelsPerDay } from '@renderer/timeline'
import { TIMELINE } from '../../shared/timeline'
import { PROJECT_START_DATE } from '@config'
import type { Task } from '../../types'

// Base selectors (tasks/UI)
export const selectTasks = (state: RootState) => state.tasks.list
export const selectStaffs = (state: RootState) => state.staffs.list
export const selectSelection = (state: RootState) => state.ui.selection
export const selectViewport = (state: RootState) => state.ui.viewport
export const selectVerticalScale = (state: RootState) => state.ui.verticalScale

// Tasks grouped by staff
export const selectTasksByStaff = createSelector(
  [selectTasks, selectStaffs],
  (tasks, staffs) => {
    const tasksByStaff = new Map<string, Task[]>()
    staffs.forEach(staff => { tasksByStaff.set(staff.id, []) })
    tasks.forEach(task => {
      const list = tasksByStaff.get(task.staffId) || []
      list.push(task)
      tasksByStaff.set(task.staffId, list)
    })
    return tasksByStaff
  }
)

// Tasks sorted by start date
export const selectTasksSortedByDate = createSelector(
  [selectTasks],
  (tasks) => [...tasks].sort((a, b) => dayIndexFromISO(a.startDate, PROJECT_START_DATE) - dayIndexFromISO(b.startDate, PROJECT_START_DATE))
)

// Tasks currently visible in viewport (approximate screen width)
export const selectVisibleTasks = createSelector(
  [selectTasks, selectViewport],
  (tasks, viewport) => {
    const ppd = pixelsPerDay(viewport.zoom || 1, TIMELINE.DAY_WIDTH)
    const approxScreenWidth = 1200
    const leftWorld = viewport.x + (0 - 0) / Math.max(ppd, 1e-4)
    const rightWorld = viewport.x + (approxScreenWidth - 0) / Math.max(ppd, 1e-4)
    return tasks.filter(task => {
      const dayIndex = dayIndexFromISO(task.startDate, PROJECT_START_DATE)
      return dayIndex >= Math.floor(leftWorld) - 2 && dayIndex <= Math.ceil(rightWorld) + 2
    })
  }
)

// Selected tasks with full data
export const selectSelectedTasks = createSelector(
  [selectTasks, selectSelection],
  (tasks, selection) => tasks.filter(task => selection.includes(task.id))
)

// Tasks grouped by status
export const selectTasksByStatus = createSelector(
  [selectTasks],
  (tasks) => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const s = String(t.status)
      const arr = map.get(s) || []
      arr.push(t)
      map.set(s, arr)
    }
    return map
  }
)

// Task conflicts (overlaps or same position on same staff/line)
export const selectTaskConflicts = createSelector(
  [selectTasks],
  (tasks) => {
    const conflicts: Array<{ task1: Task; task2: Task; type: 'overlap' | 'same_position' }> = []
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const a = tasks[i], b = tasks[j]
        if (a.staffId === b.staffId && a.staffLine === b.staffLine) {
          const aStart = dayIndexFromISO(a.startDate, PROJECT_START_DATE)
          const aEnd = aStart + a.durationDays
          const bStart = dayIndexFromISO(b.startDate, PROJECT_START_DATE)
          const bEnd = bStart + b.durationDays
          if (aStart === bStart) conflicts.push({ task1: a, task2: b, type: 'same_position' })
          else if (!(aEnd <= bStart || bEnd <= aStart)) conflicts.push({ task1: a, task2: b, type: 'overlap' })
        }
      }
    }
    return conflicts
  }
)

