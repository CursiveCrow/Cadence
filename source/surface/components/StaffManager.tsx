/**
 * StaffManager Component
 * Manages staff (timeline lanes) configuration
 */

import React, { useState, useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '../../infrastructure/persistence/redux/store'
import { selectStaffsByProject } from '../../infrastructure/persistence/redux/store'
import { upsertStaff, deleteStaff } from '../../infrastructure/persistence/redux/slices/staffsSlice'
import './StaffManager.css'

export interface StaffManagerProps {
    projectId: string
}

export const StaffManager: React.FC<StaffManagerProps> = ({ projectId }) => {
    const dispatch = useAppDispatch()
    const staffs = useAppSelector(selectStaffsByProject(projectId))
    const [isOpen, setIsOpen] = useState(false)
    const [isAddingStaff, setIsAddingStaff] = useState(false)
    const [newStaffName, setNewStaffName] = useState('')
    const [newStaffLines, setNewStaffLines] = useState(5)
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null)

    const sortedStaffs = React.useMemo(() => {
        return Object.values(staffs).sort((a, b) => a.position - b.position)
    }, [staffs])

    const handleOpen = useCallback(() => {
        setIsOpen(true)
    }, [])

    const handleClose = useCallback(() => {
        setIsOpen(false)
        setIsAddingStaff(false)
        setEditingStaffId(null)
        setNewStaffName('')
        setNewStaffLines(5)
    }, [])

    const handleAddStaff = useCallback(() => {
        if (!newStaffName) return

        const newStaff = {
            id: `staff-${Date.now()}`,
            name: newStaffName,
            numberOfLines: newStaffLines,
            lineSpacing: 24,
            position: sortedStaffs.length,
            projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        dispatch(upsertStaff({ projectId, staff: newStaff }))

        setNewStaffName('')
        setNewStaffLines(5)
        setIsAddingStaff(false)
    }, [newStaffName, newStaffLines, sortedStaffs.length, projectId, dispatch])

    const handleDeleteStaff = useCallback((staffId: string) => {
        if (confirm('Are you sure you want to delete this staff? Tasks on this staff will need to be reassigned.')) {
            dispatch(deleteStaff({ projectId, staffId }))
        }
    }, [projectId, dispatch])

    const handleUpdateStaff = useCallback((staffId: string, updates: any) => {
        const staff = staffs[staffId]
        if (!staff) return

        dispatch(upsertStaff({
            projectId,
            staff: {
                ...staff,
                ...updates,
                updatedAt: new Date().toISOString()
            }
        }))
    }, [staffs, projectId, dispatch])

    const handleMoveStaff = useCallback((staffId: string, direction: 'up' | 'down') => {
        const currentIndex = sortedStaffs.findIndex(s => s.id === staffId)
        if (currentIndex === -1) return

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (newIndex < 0 || newIndex >= sortedStaffs.length) return

        // Swap positions
        const updatedStaffs = [...sortedStaffs]
        const temp = updatedStaffs[currentIndex]
        updatedStaffs[currentIndex] = updatedStaffs[newIndex]
        updatedStaffs[newIndex] = temp

        // Update positions
        updatedStaffs.forEach((staff, index) => {
            handleUpdateStaff(staff.id, { position: index })
        })
    }, [sortedStaffs, handleUpdateStaff])

    if (!isOpen) {
        return (
            <button
                className="staff-manager-toggle"
                onClick={handleOpen}
                title="Manage Staffs"
            >
                ♪
            </button>
        )
    }

    return (
        <div className="staff-manager-overlay">
            <div className="staff-manager">
                <div className="staff-manager-header">
                    <h3>Staff Manager</h3>
                    <button className="close-btn" onClick={handleClose}>×</button>
                </div>

                <div className="staff-manager-content">
                    <div className="staff-list">
                        {sortedStaffs.map((staff, index) => (
                            <div key={staff.id} className="staff-item">
                                {editingStaffId === staff.id ? (
                                    <div className="staff-edit">
                                        <input
                                            type="text"
                                            value={staff.name}
                                            onChange={(e) => handleUpdateStaff(staff.id, { name: e.target.value })}
                                            className="staff-input"
                                        />
                                        <input
                                            type="number"
                                            value={staff.numberOfLines}
                                            onChange={(e) => handleUpdateStaff(staff.id, { numberOfLines: parseInt(e.target.value) })}
                                            className="staff-input-small"
                                            min="1"
                                            max="20"
                                        />
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => setEditingStaffId(null)}
                                        >
                                            Done
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="staff-info">
                                            <span className="staff-name">{staff.name}</span>
                                            <span className="staff-lines">{staff.numberOfLines} lines</span>
                                        </div>
                                        <div className="staff-actions">
                                            <button
                                                className="staff-action"
                                                onClick={() => handleMoveStaff(staff.id, 'up')}
                                                disabled={index === 0}
                                                title="Move Up"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                className="staff-action"
                                                onClick={() => handleMoveStaff(staff.id, 'down')}
                                                disabled={index === sortedStaffs.length - 1}
                                                title="Move Down"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                className="staff-action"
                                                onClick={() => setEditingStaffId(staff.id)}
                                                title="Edit"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                className="staff-action staff-action-delete"
                                                onClick={() => handleDeleteStaff(staff.id)}
                                                title="Delete"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}

                        {sortedStaffs.length === 0 && !isAddingStaff && (
                            <div className="empty-state">
                                <p>No staffs configured</p>
                                <p className="empty-hint">Add a staff to organize your tasks</p>
                            </div>
                        )}

                        {isAddingStaff && (
                            <div className="staff-add">
                                <input
                                    type="text"
                                    value={newStaffName}
                                    onChange={(e) => setNewStaffName(e.target.value)}
                                    placeholder="Staff name"
                                    className="staff-input"
                                    autoFocus
                                />
                                <input
                                    type="number"
                                    value={newStaffLines}
                                    onChange={(e) => setNewStaffLines(parseInt(e.target.value))}
                                    placeholder="Lines"
                                    className="staff-input-small"
                                    min="1"
                                    max="20"
                                />
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={handleAddStaff}
                                    disabled={!newStaffName}
                                >
                                    Add
                                </button>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setIsAddingStaff(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="staff-manager-footer">
                    {!isAddingStaff && (
                        <button
                            className="btn btn-primary btn-block"
                            onClick={() => setIsAddingStaff(true)}
                        >
                            + Add Staff
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
