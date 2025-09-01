/**
 * TaskDetails Component
 * Task details panel for viewing and editing task information
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../../infrastructure/persistence/redux/store'
import { closeTaskDetails } from '../../infrastructure/persistence/redux/slices/uiSlice'
import { useTaskManagement } from '../hooks/UseTaskManagement'
import { TaskStatus } from '../../core/domain/value-objects/TaskStatus'
import './TaskDetails.css'

export interface TaskDetailsProps {
    taskId: string
}

export const TaskDetails: React.FC<TaskDetailsProps> = ({ taskId }) => {
    const dispatch = useAppDispatch()
    const tasks = useAppSelector(state => state.tasks.byProjectId)
    const staffs = useAppSelector(state => state.staffs.byProjectId)

    // Find the task
    const task = React.useMemo(() => {
        for (const projectTasks of Object.values(tasks)) {
            if (projectTasks[taskId]) {
                return projectTasks[taskId]
            }
        }
        return null
    }, [tasks, taskId])

    // Find project staffs
    const projectStaffs = React.useMemo(() => {
        if (!task) return []
        return Object.values(staffs[task.projectId] || {})
    }, [task, staffs])

    const { updateTask, changeTaskStatus } = useTaskManagement(task ? [task] : [])

    const [isEditing, setIsEditing] = useState(false)
    const [editedTask, setEditedTask] = useState(task)

    useEffect(() => {
        setEditedTask(task)
    }, [task])

    const handleClose = useCallback(() => {
        dispatch(closeTaskDetails())
    }, [dispatch])

    const handleEdit = useCallback(() => {
        setIsEditing(true)
    }, [])

    const handleSave = useCallback(async () => {
        if (!editedTask || !task) return

        try {
            await updateTask(taskId, {
                title: editedTask.title,
                description: editedTask.description,
                startDate: editedTask.startDate,
                durationDays: editedTask.durationDays,
                assignee: editedTask.assignee,
                staffId: editedTask.staffId,
                staffLine: editedTask.staffLine
            })
            setIsEditing(false)
        } catch (error) {
            console.error('Failed to update task:', error)
        }
    }, [editedTask, task, taskId, updateTask])

    const handleCancel = useCallback(() => {
        setEditedTask(task)
        setIsEditing(false)
    }, [task])

    const handleStatusChange = useCallback(async (newStatus: TaskStatus) => {
        try {
            await changeTaskStatus(taskId, newStatus)
        } catch (error) {
            console.error('Failed to change task status:', error)
        }
    }, [taskId, changeTaskStatus])

    const handleFieldChange = useCallback((field: string, value: any) => {
        setEditedTask(prev => prev ? { ...prev, [field]: value } : null)
    }, [])

    if (!task || !editedTask) {
        return (
            <div className="task-details">
                <div className="task-details-header">
                    <h3>Task not found</h3>
                    <button className="close-btn" onClick={handleClose}>×</button>
                </div>
            </div>
        )
    }

    const getStatusColor = (status: TaskStatus) => {
        switch (status) {
            case TaskStatus.COMPLETED:
                return '#4caf50'
            case TaskStatus.IN_PROGRESS:
                return '#2196f3'
            case TaskStatus.BLOCKED:
                return '#f44336'
            case TaskStatus.CANCELLED:
                return '#9e9e9e'
            case TaskStatus.NOT_STARTED:
            default:
                return '#757575'
        }
    }

    return (
        <div className="task-details">
            <div className="task-details-header">
                <h3>Task Details</h3>
                <button className="close-btn" onClick={handleClose}>×</button>
            </div>

            <div className="task-details-content">
                <div className="detail-group">
                    <label>Title</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedTask.title}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            className="detail-input"
                        />
                    ) : (
                        <div className="detail-value">{task.title}</div>
                    )}
                </div>

                <div className="detail-group">
                    <label>Status</label>
                    {isEditing ? (
                        <select
                            value={editedTask.status}
                            onChange={(e) => handleFieldChange('status', e.target.value)}
                            className="detail-select"
                        >
                            <option value={TaskStatus.NOT_STARTED}>Not Started</option>
                            <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                            <option value={TaskStatus.COMPLETED}>Completed</option>
                            <option value={TaskStatus.BLOCKED}>Blocked</option>
                            <option value={TaskStatus.CANCELLED}>Cancelled</option>
                        </select>
                    ) : (
                        <div className="detail-value">
                            <span
                                className="status-badge"
                                style={{ backgroundColor: getStatusColor(task.status as TaskStatus) }}
                            >
                                {task.status.replace('_', ' ')}
                            </span>
                        </div>
                    )}
                </div>

                <div className="detail-row">
                    <div className="detail-group">
                        <label>Start Date</label>
                        {isEditing ? (
                            <input
                                type="date"
                                value={editedTask.startDate}
                                onChange={(e) => handleFieldChange('startDate', e.target.value)}
                                className="detail-input"
                            />
                        ) : (
                            <div className="detail-value">
                                {new Date(task.startDate).toLocaleDateString()}
                            </div>
                        )}
                    </div>

                    <div className="detail-group">
                        <label>Duration (days)</label>
                        {isEditing ? (
                            <input
                                type="number"
                                value={editedTask.durationDays}
                                onChange={(e) => handleFieldChange('durationDays', parseInt(e.target.value))}
                                className="detail-input"
                                min="1"
                            />
                        ) : (
                            <div className="detail-value">{task.durationDays}</div>
                        )}
                    </div>
                </div>

                <div className="detail-group">
                    <label>Staff</label>
                    {isEditing ? (
                        <select
                            value={editedTask.staffId}
                            onChange={(e) => handleFieldChange('staffId', e.target.value)}
                            className="detail-select"
                        >
                            {projectStaffs.map(staff => (
                                <option key={staff.id} value={staff.id}>
                                    {staff.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="detail-value">
                            {projectStaffs.find(s => s.id === task.staffId)?.name || 'Unknown'}
                        </div>
                    )}
                </div>

                <div className="detail-group">
                    <label>Staff Line</label>
                    {isEditing ? (
                        <input
                            type="number"
                            value={editedTask.staffLine}
                            onChange={(e) => handleFieldChange('staffLine', parseInt(e.target.value))}
                            className="detail-input"
                            min="0"
                        />
                    ) : (
                        <div className="detail-value">{task.staffLine}</div>
                    )}
                </div>

                <div className="detail-group">
                    <label>Assignee</label>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedTask.assignee || ''}
                            onChange={(e) => handleFieldChange('assignee', e.target.value)}
                            className="detail-input"
                            placeholder="Enter assignee name"
                        />
                    ) : (
                        <div className="detail-value">{task.assignee || 'Unassigned'}</div>
                    )}
                </div>

                <div className="detail-group">
                    <label>Description</label>
                    {isEditing ? (
                        <textarea
                            value={editedTask.description || ''}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            className="detail-textarea"
                            rows={4}
                            placeholder="Enter task description"
                        />
                    ) : (
                        <div className="detail-value">
                            {task.description || <span className="empty">No description</span>}
                        </div>
                    )}
                </div>

                <div className="detail-meta">
                    <div>Created: {new Date(task.createdAt).toLocaleString()}</div>
                    <div>Updated: {new Date(task.updatedAt).toLocaleString()}</div>
                </div>
            </div>

            <div className="task-details-footer">
                {isEditing ? (
                    <>
                        <button className="btn btn-primary" onClick={handleSave}>
                            Save Changes
                        </button>
                        <button className="btn btn-secondary" onClick={handleCancel}>
                            Cancel
                        </button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-primary" onClick={handleEdit}>
                            Edit Task
                        </button>
                        <button className="btn btn-danger">
                            Delete Task
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
