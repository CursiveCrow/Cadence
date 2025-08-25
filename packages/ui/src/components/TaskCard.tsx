/**
 * TaskCard component for displaying task information
 */

import React from 'react'
import { Task, TaskStatus } from '@cadence/core'

export interface TaskCardProps {
  task: Task
  onSelect?: (taskId: string) => void
  onEdit?: (taskId: string) => void
  selected?: boolean
  className?: string
}

export function TaskCard({
  task,
  onSelect,
  onEdit,
  selected = false,
  className = '',
}: TaskCardProps) {
  const statusColors = {
    [TaskStatus.NOT_STARTED]: 'bg-gray-100 text-gray-800',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
    [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
    [TaskStatus.BLOCKED]: 'bg-red-100 text-red-800',
    [TaskStatus.CANCELLED]: 'bg-gray-100 text-gray-600',
  }

  const baseClasses = 'border rounded-lg p-4 cursor-pointer transition-colors'
  const selectedClasses = selected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
  
  const classes = [baseClasses, selectedClasses, className].join(' ')

  const handleClick = () => {
    if (onSelect) {
      onSelect(task.id)
    }
  }

  const handleDoubleClick = () => {
    if (onEdit) {
      onEdit(task.id)
    }
  }

  return (
    <div 
      className={classes}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">
            {task.title}
          </h3>
          <div className="text-sm text-gray-600 mb-2">
            <div>Start: {new Date(task.startDate).toLocaleDateString()}</div>
            <div>Duration: {task.durationDays} days</div>
            {task.assignee && <div>Assignee: {task.assignee}</div>}
          </div>
        </div>
        <div className="ml-4">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[task.status as TaskStatus]}`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Lane: {task.laneIndex}
      </div>
    </div>
  )
}
