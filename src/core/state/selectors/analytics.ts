import { createSelector } from '@reduxjs/toolkit'
import { PROJECT_START_DATE } from '@config'
import { dayIndexFromISO } from '@renderer/timeline'
import type { Task } from '@types'
import { selectTasks, selectTasksByStatus, selectTasksByStaff, selectStaffs } from './tasks'
import { selectDependenciesWithTasks } from './dependencies'

// Project timeline bounds (earliest start to latest end)
export const selectProjectTimeBounds = createSelector(
  [selectTasks],
  (tasks) => {
    if (tasks.length === 0) {
      const today = dayIndexFromISO(new Date().toISOString().split('T')[0], PROJECT_START_DATE)
      return { start: today, end: today + 30 }
    }
    let earliest = Infinity
    let latest = -Infinity
    for (const t of tasks) {
      const s = dayIndexFromISO(t.startDate, PROJECT_START_DATE)
      const e = s + t.durationDays
      if (s < earliest) earliest = s
      if (e > latest) latest = e
    }
    return { start: Math.max(0, earliest), end: latest }
  }
)

// Completion statistics by status
export const selectCompletionStats = createSelector(
  [selectTasksByStatus],
  (map) => {
    const total = Array.from(map.values()).reduce((sum, arr) => sum + arr.length, 0)
    const completed = map.get('completed')?.length || 0
    const inProgress = map.get('in_progress')?.length || 0
    const notStarted = map.get('not_started')?.length || 0
    const blocked = map.get('blocked')?.length || 0
    return {
      total,
      completed,
      inProgress,
      notStarted,
      blocked,
      completionPercentage: total > 0 ? (completed / total) * 100 : 0,
    }
  }
)

// Next available tasks (no pending predecessors)
export const selectAvailableTasks = createSelector(
  [selectTasks, selectDependenciesWithTasks],
  (tasks, dependencies) => {
    const pending = new Set<string>()
    dependencies.forEach(dep => {
      const src = (dep as any).sourceTask as Task | undefined
      if (src && src.status !== 'completed') pending.add(dep.dstTaskId)
    })
    return tasks.filter(t => t.status === 'not_started' && !pending.has(t.id))
  }
)

// Staff utilization summary
export const selectStaffUtilization = createSelector(
  [selectTasksByStaff, selectStaffs],
  (byStaff, staffs) => staffs
    .map(staff => ({
      staff,
      taskCount: byStaff.get(staff.id)?.length || 0,
      utilization: (byStaff.get(staff.id)?.length || 0) / Math.max(1, staffs.length)
    }))
    .sort((a, b) => b.utilization - a.utilization)
)

// Staff workload distribution
export const selectStaffWorkload = createSelector(
  [selectTasksByStaff, selectStaffs],
  (byStaff, staffs) => staffs.map(staff => {
    const list = byStaff.get(staff.id) || []
    const totalDuration = list.reduce((s, t) => s + t.durationDays, 0)
    const completedDuration = list.filter(t => t.status === 'completed').reduce((s, t) => s + t.durationDays, 0)
    return {
      staff,
      totalTasks: list.length,
      totalDuration,
      completedDuration,
      completionRate: totalDuration > 0 ? (completedDuration / totalDuration) * 100 : 0,
      activeTasks: list.filter(t => t.status === 'in_progress').length,
    }
  })
)

