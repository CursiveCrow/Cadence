/**
 * TaskPopup Component
 * Displays detailed task information in a popup when a task is selected
 */

import React, { useState, useEffect, useRef } from 'react'
import { Task } from '../../core/domain/entities/Task'
import { TaskStatus } from '../../core/domain/value-objects/TaskStatus'
import { Staff } from '../../core/domain/entities/Staff'
import './TaskPopup.css'

export interface TaskPopupProps {
    task: Task | null
    staffs: Staff[]
    position: { x: number; y: number } | null
    onClose: () => void
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void
}

export const TaskPopup: React.FC<TaskPopupProps> = ({
    task,
    staffs,
    position,
    onClose,
    onUpdateTask
}) => {
    const popupRef = useRef<HTMLDivElement>(null)
    const [editingTitle, setEditingTitle] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')

    useEffect(() => {
        if (task) {
            setTitle(task.title)
            setDescription(task.description || '')
        }
    }, [task])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [onClose])

    if (!task || !position) return null

    const getStatusIcon = (status: TaskStatus): string => {
        switch (status) {
            case TaskStatus.COMPLETED:
                return '♮' // Natural sign
            case TaskStatus.IN_PROGRESS:
                return '♯' // Sharp sign
            case TaskStatus.BLOCKED:
                return '♭' // Flat sign
            case TaskStatus.CANCELLED:
                return '𝄪' // Double-sharp [[memory:7264396]]
            default:
                return '○' // Empty circle
        }
    }

    const getStatusColor = (status: TaskStatus): string => {
        switch (status) {
            case TaskStatus.COMPLETED:
                return '#4caf50'
            case TaskStatus.IN_PROGRESS:
                return '#2196f3'
            case TaskStatus.BLOCKED:
                return '#f44336'
            case TaskStatus.CANCELLED:
                return '#9e9e9e'
            default:
                return '#757575'
        }
    }

    const handleStatusChange = (newStatus: TaskStatus) => {
        onUpdateTask(task.id, { status: newStatus })
    }

    const handleTitleSave = () => {
        if (title !== task.title) {
            onUpdateTask(task.id, { title })
        }
        setEditingTitle(false)
    }

    const handleDescriptionSave = () => {
        if (description !== task.description) {
            onUpdateTask(task.id, { description })
        }
    }

    const handleDurationChange = (days: number) => {
        if (days > 0 && days !== task.durationDays) {
            onUpdateTask(task.id, { durationDays: days })
        }
    }

    const handleStaffChange = (staffId: string) => {
        if (staffId !== task.staffId) {
            onUpdateTask(task.id, { staffId })
        }
    }

    const staff = staffs.find(s => s.id === task.staffId)

    return (
        <div
            ref={popupRef}
            className="task-popup"
            style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 1000
            }}
        >
            <div className="task-popup-header">
                <div className="task-popup-title">
                    <span
                        className="task-status-icon"
                        style={{ color: getStatusColor(task.status) }}
                    >
                        {getStatusIcon(task.status)}
                    </span>
                    {editingTitle ? (
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleTitleSave()
                                if (e.key === 'Escape') {
                                    setTitle(task.title)
                                    setEditingTitle(false)
                                }
                            }}
                            autoFocus
                            className="task-title-input"
                        />
                    ) : (
                        <h3 onClick={() => setEditingTitle(true)}>
                            {task.title}
                        </h3>
                    )}
                </div>
                <button className="close-button" onClick={onClose}>
                    ×
                </button>
            </div>

            <div className="task-popup-content">
                {/* Status */}
                <div className="task-field">
                    <label>Status</label>
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

                {/* Duration */}
                <div className="task-field">
                    <label>Duration</label>
                    <div className="duration-input">
                        <input
                            type="number"
                            value={task.durationDays}
                            onChange={(e) => handleDurationChange(parseInt(e.target.value))}
                            min="1"
                            className="task-input"
                        />
                        <span className="duration-unit">days</span>
                    </div>
                </div>

                {/* Start Date */}
                <div className="task-field">
                    <label>Start Date</label>
                    <input
                        type="date"
                        value={task.startDate}
                        onChange={(e) => onUpdateTask(task.id, { startDate: e.target.value })}
                        className="task-input"
                    />
                </div>

                {/* Staff Assignment */}
                <div className="task-field">
                    <label>Staff</label>
                    <div className="staff-position-controls">
                        <select
                            value={task.staffId}
                            onChange={(e) => handleStaffChange(e.target.value)}
                            className="task-select"
                        >
                            {staffs.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        <span className="staff-line-indicator">
                            Line {task.staffLine + 1} of {staff?.numberOfLines || 0}
                        </span>
                    </div>
                </div>

                {/* Assignee */}
                <div className="task-field">
                    <label>Assignee</label>
                    <input
                        type="text"
                        value={task.assignee || ''}
                        onChange={(e) => onUpdateTask(task.id, { assignee: e.target.value })}
                        placeholder="Unassigned"
                        className="task-input"
                    />
                </div>

                {/* Description */}
                <div className="task-field">
                    <label>Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={handleDescriptionSave}
                        placeholder="Add a description..."
                        className="task-textarea"
                        rows={4}
                    />
                </div>

                {/* Metadata */}
                <div className="task-metadata">
                    <div className="metadata-item">
                        <span className="metadata-label">Created:</span>
                        <span className="metadata-value">
                            {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="metadata-item">
                        <span className="metadata-label">Updated:</span>
                        <span className="metadata-value">
                            {new Date(task.updatedAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
