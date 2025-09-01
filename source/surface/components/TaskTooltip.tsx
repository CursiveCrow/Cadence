/**
 * TaskTooltip Component
 * Shows a tooltip with task information on hover
 */

import React from 'react'
import { Task } from '../../core/domain/entities/Task'
import { TaskStatus } from '../../core/domain/value-objects/TaskStatus'
import './TaskTooltip.css'

export interface TaskTooltipProps {
    task: Task | null
    position: { x: number; y: number } | null
    visible: boolean
}

export const TaskTooltip: React.FC<TaskTooltipProps> = ({
    task,
    position,
    visible
}) => {
    if (!visible || !task || !position) return null

    const getStatusIcon = (status: TaskStatus): string => {
        switch (status) {
            case TaskStatus.COMPLETED:
                return '♮'
            case TaskStatus.IN_PROGRESS:
                return '♯'
            case TaskStatus.BLOCKED:
                return '♭'
            case TaskStatus.CANCELLED:
                return '𝄪' // [[memory:7264396]]
            default:
                return '○'
        }
    }

    const getStatusLabel = (status: TaskStatus): string => {
        switch (status) {
            case TaskStatus.COMPLETED:
                return 'Completed'
            case TaskStatus.IN_PROGRESS:
                return 'In Progress'
            case TaskStatus.BLOCKED:
                return 'Blocked'
            case TaskStatus.CANCELLED:
                return 'Cancelled'
            default:
                return 'Not Started'
        }
    }

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const endDate = new Date(task.startDate)
    endDate.setDate(endDate.getDate() + task.durationDays)

    return (
        <div
            className="task-tooltip"
            style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y - 80}px`,
                zIndex: 9999
            }}
        >
            <div className="task-tooltip-arrow" />
            <div className="task-tooltip-content">
                <div className="task-tooltip-header">
                    <span className="task-tooltip-icon">
                        {getStatusIcon(task.status)}
                    </span>
                    <span className="task-tooltip-title">
                        {task.title}
                    </span>
                </div>
                <div className="task-tooltip-details">
                    <div className="task-tooltip-row">
                        <span className="task-tooltip-label">Status:</span>
                        <span className="task-tooltip-value">
                            {getStatusLabel(task.status)}
                        </span>
                    </div>
                    <div className="task-tooltip-row">
                        <span className="task-tooltip-label">Duration:</span>
                        <span className="task-tooltip-value">
                            {task.durationDays} {task.durationDays === 1 ? 'day' : 'days'}
                        </span>
                    </div>
                    <div className="task-tooltip-row">
                        <span className="task-tooltip-label">Start:</span>
                        <span className="task-tooltip-value">
                            {formatDate(task.startDate)}
                        </span>
                    </div>
                    <div className="task-tooltip-row">
                        <span className="task-tooltip-label">End:</span>
                        <span className="task-tooltip-value">
                            {formatDate(endDate.toISOString())}
                        </span>
                    </div>
                    {task.assignee && (
                        <div className="task-tooltip-row">
                            <span className="task-tooltip-label">Assignee:</span>
                            <span className="task-tooltip-value">
                                {task.assignee}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
