import React from 'react'
import { useTask, updateTask } from '@cadence/crdt'
import { TaskStatus } from '@cadence/core'
import './TaskPanel.css'

interface TaskPanelProps {
  projectId: string
  selectedTaskIds: string[]
}

export const TaskPanel: React.FC<TaskPanelProps> = ({
  projectId,
  selectedTaskIds
}) => {
  // For now, just show the first selected task
  const taskId = selectedTaskIds[0]
  const task = useTask(projectId, taskId)

  if (!task) {
    return (
      <div className="task-panel">
        <h3>No Task Selected</h3>
      </div>
    )
  }

  const handleTitleChange = (newTitle: string) => {
    updateTask(projectId, taskId, { title: newTitle })
  }

  const handleStatusChange = (newStatus: string) => {
    updateTask(projectId, taskId, { status: newStatus })
  }

  const handleDurationChange = (newDuration: number) => {
    updateTask(projectId, taskId, { durationDays: newDuration })
  }

  return (
    <div className="task-panel">
      <h3>Task Details</h3>
      
      <div className="task-field">
        <label>Title:</label>
        <input
          type="text"
          value={task.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="task-input"
        />
      </div>

      <div className="task-field">
        <label>Status:</label>
        <select
          value={task.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="task-select"
        >
          <option value={TaskStatus.NOT_STARTED}>Not Started</option>
          <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
          <option value={TaskStatus.COMPLETED}>Completed</option>
          <option value={TaskStatus.BLOCKED}>Blocked</option>
          <option value={TaskStatus.CANCELLED}>Cancelled</option>
        </select>
      </div>

      <div className="task-field">
        <label>Duration (days):</label>
        <input
          type="number"
          value={task.durationDays}
          onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)}
          className="task-input"
          min="1"
        />
      </div>

      <div className="task-field">
        <label>Start Date:</label>
        <input
          type="date"
          value={task.startDate}
          onChange={(e) => updateTask(projectId, taskId, { startDate: e.target.value })}
          className="task-input"
        />
      </div>

      <div className="task-field">
        <label>Lane:</label>
        <input
          type="number"
          value={task.laneIndex}
          onChange={(e) => updateTask(projectId, taskId, { laneIndex: parseInt(e.target.value) || 0 })}
          className="task-input"
          min="0"
        />
      </div>

      <div className="task-field">
        <label>Assignee:</label>
        <input
          type="text"
          value={task.assignee || ''}
          onChange={(e) => updateTask(projectId, taskId, { assignee: e.target.value })}
          className="task-input"
          placeholder="Unassigned"
        />
      </div>

      {selectedTaskIds.length > 1 && (
        <div className="multi-select-info">
          {selectedTaskIds.length} tasks selected
        </div>
      )}
    </div>
  )
}
