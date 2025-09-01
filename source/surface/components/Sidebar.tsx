/**
 * Sidebar Component
 * Project navigation and task list sidebar
 */

import React, { useState, useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../../infrastructure/persistence/redux/store'
import { selectTasksByProject, selectProjectById } from '../../infrastructure/persistence/redux/store'
import { selectTasks } from '../../infrastructure/persistence/redux/slices/selectionSlice'
import { openTaskDetails } from '../../infrastructure/persistence/redux/slices/uiSlice'
import { TaskStatus } from '../../core/domain/value-objects/TaskStatus'
import './Sidebar.css'

export interface SidebarProps {
    projectId: string
}

export const Sidebar: React.FC<SidebarProps> = ({ projectId }) => {
    const dispatch = useAppDispatch()
    const project = useAppSelector(selectProjectById(projectId))
    const tasks = useAppSelector(selectTasksByProject(projectId))
    const selectedTaskIds = useAppSelector(state => state.selection.selectedTaskIds)

    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date')

    // Filter and sort tasks
    const filteredTasks = React.useMemo(() => {
        let filtered = Object.values(tasks)

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(query) ||
                task.description?.toLowerCase().includes(query)
            )
        }

        // Apply status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(task => task.status === filterStatus)
        }

        // Sort tasks
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                case 'title':
                    return a.title.localeCompare(b.title)
                case 'status':
                    return a.status.localeCompare(b.status)
                default:
                    return 0
            }
        })

        return filtered
    }, [tasks, searchQuery, filterStatus, sortBy])

    // Group tasks by status
    const tasksByStatus = React.useMemo(() => {
        const groups: Record<string, typeof filteredTasks> = {}

        for (const task of filteredTasks) {
            if (!groups[task.status]) {
                groups[task.status] = []
            }
            groups[task.status].push(task)
        }

        return groups
    }, [filteredTasks])

    const handleTaskClick = useCallback((taskId: string, event: React.MouseEvent) => {
        if (event.ctrlKey || event.metaKey) {
            // Multi-select
            const newSelection = selectedTaskIds.includes(taskId)
                ? selectedTaskIds.filter(id => id !== taskId)
                : [...selectedTaskIds, taskId]
            dispatch(selectTasks(newSelection))
        } else if (event.shiftKey && selectedTaskIds.length > 0) {
            // Range select
            const taskList = Object.values(tasks)
            const lastSelectedIndex = taskList.findIndex(t => t.id === selectedTaskIds[selectedTaskIds.length - 1])
            const currentIndex = taskList.findIndex(t => t.id === taskId)

            if (lastSelectedIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastSelectedIndex, currentIndex)
                const end = Math.max(lastSelectedIndex, currentIndex)
                const rangeSelection = taskList.slice(start, end + 1).map(t => t.id)
                dispatch(selectTasks(rangeSelection))
            }
        } else {
            // Single select
            dispatch(selectTasks([taskId]))
        }
    }, [selectedTaskIds, tasks, dispatch])

    const handleTaskDoubleClick = useCallback((taskId: string) => {
        dispatch(openTaskDetails(taskId))
    }, [dispatch])

    const getStatusIcon = (status: TaskStatus) => {
        switch (status) {
            case TaskStatus.COMPLETED:
                return '✓'
            case TaskStatus.IN_PROGRESS:
                return '⏳'
            case TaskStatus.BLOCKED:
                return '⚠'
            case TaskStatus.CANCELLED:
                return '✗'
            case TaskStatus.NOT_STARTED:
            default:
                return '○'
        }
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
        <div className="sidebar">
            <div className="sidebar-header">
                <h3>{project?.name || 'Project'}</h3>
                <div className="sidebar-stats">
                    <span className="stat">
                        {Object.keys(tasks).length} tasks
                    </span>
                    <span className="stat">
                        {Object.values(tasks).filter(t => t.status === TaskStatus.COMPLETED).length} completed
                    </span>
                </div>
            </div>

            <div className="sidebar-search">
                <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
            </div>

            <div className="sidebar-filters">
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="filter-select"
                >
                    <option value="all">All Status</option>
                    <option value={TaskStatus.NOT_STARTED}>Not Started</option>
                    <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                    <option value={TaskStatus.COMPLETED}>Completed</option>
                    <option value={TaskStatus.BLOCKED}>Blocked</option>
                    <option value={TaskStatus.CANCELLED}>Cancelled</option>
                </select>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="filter-select"
                >
                    <option value="date">Sort by Date</option>
                    <option value="title">Sort by Title</option>
                    <option value="status">Sort by Status</option>
                </select>
            </div>

            <div className="sidebar-tasks">
                {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                    <div key={status} className="task-group">
                        <div className="task-group-header">
                            <span className="task-group-title">
                                {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                            </span>
                            <span className="task-group-count">{statusTasks.length}</span>
                        </div>

                        <div className="task-list">
                            {statusTasks.map(task => (
                                <div
                                    key={task.id}
                                    className={`task-item ${selectedTaskIds.includes(task.id) ? 'selected' : ''}`}
                                    onClick={(e) => handleTaskClick(task.id, e)}
                                    onDoubleClick={() => handleTaskDoubleClick(task.id)}
                                >
                                    <span
                                        className="task-status-icon"
                                        style={{ color: getStatusColor(task.status) }}
                                    >
                                        {getStatusIcon(task.status)}
                                    </span>
                                    <div className="task-info">
                                        <div className="task-title">{task.title}</div>
                                        <div className="task-meta">
                                            {new Date(task.startDate).toLocaleDateString()} • {task.durationDays} days
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredTasks.length === 0 && (
                    <div className="empty-state">
                        <p>No tasks found</p>
                        {searchQuery && (
                            <p className="empty-hint">Try adjusting your search</p>
                        )}
                    </div>
                )}
            </div>

            <div className="sidebar-footer">
                <button className="btn btn-primary btn-block">
                    + Add New Task
                </button>
            </div>
        </div>
    )
}
