import React from 'react'
import { useSelector } from 'react-redux'
import { useTask, updateTask } from '@cadence/crdt'
import { TaskStatus } from '@cadence/core'
import { RootState } from '@cadence/state'
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
  const { staffs } = useSelector((state: RootState) => state.ui)

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

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateTask(projectId, taskId, { status: newStatus })
  }

  const handleDurationChange = (newDuration: number) => {
    updateTask(projectId, taskId, { durationDays: newDuration })
  }

  const handleStaffChange = (newStaffId: string) => {
    // When changing staff, reset to middle line of new staff
    const newStaff = staffs.find(s => s.id === newStaffId)
    const middleLine = newStaff ? Math.floor(newStaff.numberOfLines - 1) : 2
    updateTask(projectId, taskId, { 
      staffId: newStaffId, 
      staffLine: middleLine * 2 // Convert to line/space system
    })
  }

  const handleStaffLineChange = (newStaffLine: number) => {
    updateTask(projectId, taskId, { staffLine: newStaffLine })
  }

  // Get current staff info
  const currentStaff = staffs.find(s => s.id === task.staffId)
  const maxStaffLine = currentStaff ? (currentStaff.numberOfLines - 1) * 2 : 8

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
          onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
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
        <label>Staff:</label>
        <select
          value={task.staffId || ''}
          onChange={(e) => handleStaffChange(e.target.value)}
          className="task-select"
        >
          {staffs.map(staff => (
            <option key={staff.id} value={staff.id}>
              {staff.name} ({staff.numberOfLines} lines)
            </option>
          ))}
        </select>
      </div>

      <div className="task-field">
        <label>Staff Line:</label>
        <div className="staff-line-controls">
          <select
            value={task.staffLine || 0}
            onChange={(e) => handleStaffLineChange(parseInt(e.target.value))}
            className="task-select"
          >
            {Array.from({ length: maxStaffLine + 1 }, (_, i) => (
              <option key={i} value={i}>
                {i % 2 === 0 ? `Line ${Math.floor(i / 2) + 1}` : `Space ${Math.floor(i / 2) + 1}`}
              </option>
            ))}
          </select>
          <div className="staff-line-preview">
            {task.staffLine % 2 === 0 ? '━' : '♪'} {/* Show line or space indicator */}
          </div>
        </div>
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
