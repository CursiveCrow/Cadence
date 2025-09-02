import React, { useState } from 'react'
import { TaskStatus } from '@cadence/core'
import { statusToAccidental } from '@cadence/renderer'
import './TaskPopup.css'
import './styles/tokens.css'
import { TaskPopupTask, TaskPopupStaff } from './types'
import { markdownToSafeHtml } from './utils/markdown'

interface TaskPopupProps {
    task: TaskPopupTask | null
    staffs: TaskPopupStaff[]
    selectedCount: number
    position: { x: number; y: number } | null
    onClose: () => void
    onChangeTitle: (title: string) => void
    onChangeStatus: (status: TaskStatus) => void
    onChangeDuration: (days: number) => void
    onChangeStartDate: (iso: string) => void
    onChangeStaff: (staffId: string) => void
    onChangeStaffLine: (staffLine: number) => void
    onChangeAssignee: (assignee: string) => void
    onChangeDescription?: (description: string) => void
}

export const TaskPopup: React.FC<TaskPopupProps> = ({ task, staffs, selectedCount, position, onClose, onChangeTitle, onChangeStatus, onChangeDuration, onChangeStartDate, onChangeStaff, onChangeStaffLine, onChangeAssignee, onChangeDescription }) => {
    const [isMinimized, setIsMinimized] = useState(false)

    if (!task || !position) return null

    const currentStaff = staffs.find((s) => s.id === task.staffId)
    const maxStaffLine = currentStaff ? (currentStaff.numberOfLines - 1) * 2 : 8

    const popupStyle: React.CSSProperties = {
        position: 'fixed',
        left: Math.min(position.x + 10, window.innerWidth - 320),
        top: Math.min(position.y + 10, window.innerHeight - (isMinimized ? 80 : 400)),
        zIndex: 1000,
    }

    const getStatusIcon = (status: string) => statusToAccidental(status) || '♪'

    const descriptionHtml = markdownToSafeHtml(task.description || '')

    return (
        <div className="task-popup" style={popupStyle}>
            <div className="task-popup-header">
                <div className="task-popup-title">
                    <span className="task-status-icon">{getStatusIcon(task.status)}</span>
                    <span>{task.title}</span>
                </div>
                <div className="task-popup-controls">
                    <button className="popup-minimize-btn" onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? 'Expand' : 'Minimize'}>
                        {isMinimized ? '▲' : '▼'}
                    </button>
                    <button className="popup-close-btn" onClick={onClose} title="Close">✕</button>
                </div>
            </div>

            {!isMinimized && (
                <div className="task-popup-content">
                    <div className="task-field">
                        <label>Title:</label>
                        <input type="text" value={task.title} onChange={(e) => onChangeTitle(e.target.value)} className="task-input" />
                    </div>

                    <div className="task-field">
                        <label>Status:</label>
                        <select value={task.status} onChange={(e) => onChangeStatus(e.target.value as TaskStatus)} className="task-select">
                            <option value={TaskStatus.NOT_STARTED}>♪ Not Started</option>
                            <option value={TaskStatus.IN_PROGRESS}>♯ In Progress</option>
                            <option value={TaskStatus.COMPLETED}>♮ Completed</option>
                            <option value={TaskStatus.BLOCKED}>♭ Blocked</option>
                            <option value={TaskStatus.CANCELLED}>𝄪 Cancelled</option>
                        </select>
                    </div>

                    <div className="task-field">
                        <label>Duration:</label>
                        <div className="duration-input">
                            <input type="number" value={task.durationDays} onChange={(e) => onChangeDuration(parseInt(e.target.value) || 1)} className="task-input" min="1" max="30" />
                            <span className="duration-unit">days</span>
                        </div>
                    </div>

                    <div className="task-field">
                        <label>Start Date:</label>
                        <input type="date" value={task.startDate} onChange={(e) => onChangeStartDate(e.target.value)} className="task-input" />
                    </div>

                    <div className="task-field">
                        <label>Staff:</label>
                        <select value={task.staffId || ''} onChange={(e) => onChangeStaff(e.target.value)} className="task-select">
                            {staffs.map((staff) => (
                                <option key={staff.id} value={staff.id}>
                                    {staff.name} ({staff.numberOfLines} lines)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="task-field">
                        <label>Position:</label>
                        <div className="staff-position-controls">
                            <select value={task.staffLine || 0} onChange={(e) => onChangeStaffLine(parseInt(e.target.value))} className="task-select">
                                {Array.from({ length: maxStaffLine + 1 }, (_, i) => (
                                    <option key={i} value={i}>{i % 2 === 0 ? `Line ${Math.floor(i / 2) + 1}` : `Space ${Math.floor(i / 2) + 1}`}</option>
                                ))}
                            </select>
                            <div className="staff-line-indicator">{task.staffLine % 2 === 0 ? '━' : '♪'}</div>
                        </div>
                    </div>

                    <div className="task-field">
                        <label>Assignee:</label>
                        <input type="text" value={task.assignee || ''} onChange={(e) => onChangeAssignee(e.target.value)} className="task-input" placeholder="Unassigned" />
                    </div>

                    <div className="task-field">
                        <label>Description:</label>
                        <div className="task-toolbar">
                            <button type="button" onClick={() => onChangeDescription && onChangeDescription(`**${task.description || ''}**`)} title="Bold">B</button>
                            <button type="button" onClick={() => onChangeDescription && onChangeDescription(`*${task.description || ''}*`)} title="Italic"><em>I</em></button>
                            <button type="button" onClick={() => onChangeDescription && onChangeDescription(`${task.description || ''}\\n\\n[link](https://example.com)`)} title="Link">🔗</button>
                            <button type="button" onClick={() => onChangeDescription && onChangeDescription(`${task.description || ''}\\n\\n\`code\``)} title="Code">{`</>`}</button>
                        </div>
                        <textarea value={task.description || ''} onChange={(e) => onChangeDescription && onChangeDescription(e.target.value)} className="task-textarea" rows={4} placeholder="Add details..." />
                        <div className="task-markdown-preview" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
                    </div>

                    {selectedCount > 1 && (
                        <div className="multi-select-info">
                            <span className="multi-count">{selectedCount}</span> notes selected
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

