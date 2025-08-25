import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@cadence/state'
import { Staff } from '@cadence/core'
import { addStaff, updateStaff, deleteStaff, reorderStaffs } from '@cadence/state'
import './StaffManager.css'

interface StaffManagerProps {
  isOpen: boolean
  onClose: () => void
}

export const StaffManager: React.FC<StaffManagerProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch()
  const staffs = useSelector((state: RootState) => state.ui.staffs)
  const activeProjectId = useSelector((state: RootState) => state.ui.activeProjectId)
  
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffLines, setNewStaffLines] = useState(5)
  const [editingStaff, setEditingStaff] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAddStaff = () => {
    if (!newStaffName.trim() || !activeProjectId) return

    const newStaff: Staff = {
      id: `staff-${Date.now()}`,
      name: newStaffName.trim(),
      numberOfLines: newStaffLines,
      lineSpacing: 12,
      position: staffs.length,
      projectId: activeProjectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    dispatch(addStaff(newStaff))
    setNewStaffName('')
    setNewStaffLines(5)
  }

  const handleUpdateStaff = (staffId: string, updates: Partial<Staff>) => {
    dispatch(updateStaff({ id: staffId, updates }))
    setEditingStaff(null)
  }

  const handleDeleteStaff = (staffId: string) => {
    if (window.confirm('Are you sure you want to delete this staff? All notes on this staff will be lost.')) {
      dispatch(deleteStaff(staffId))
    }
  }

  const handleMoveUp = (staffId: string, currentPosition: number) => {
    if (currentPosition > 0) {
      dispatch(reorderStaffs({ staffId, newPosition: currentPosition - 1 }))
    }
  }

  const handleMoveDown = (staffId: string, currentPosition: number) => {
    if (currentPosition < staffs.length - 1) {
      dispatch(reorderStaffs({ staffId, newPosition: currentPosition + 1 }))
    }
  }

  return (
    <div className="staff-manager-overlay">
      <div className="staff-manager">
        <div className="staff-manager-header">
          <h3>Staff Management</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="staff-list">
          {staffs.map((staff, index) => (
            <div key={staff.id} className="staff-item">
              <div className="staff-info">
                {editingStaff === staff.id ? (
                  <div className="staff-edit">
                    <input
                      type="text"
                      defaultValue={staff.name}
                      placeholder="Staff name"
                      onBlur={(e) => handleUpdateStaff(staff.id, { name: e.target.value })}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateStaff(staff.id, { name: (e.target as HTMLInputElement).value })
                        }
                      }}
                      autoFocus
                    />
                    <input
                      type="number"
                      min="1"
                      max="11"
                      defaultValue={staff.numberOfLines}
                      onChange={(e) => handleUpdateStaff(staff.id, { numberOfLines: parseInt(e.target.value) })}
                    />
                    <span className="lines-label">lines</span>
                  </div>
                ) : (
                  <div className="staff-display">
                    <span className="staff-name">{staff.name}</span>
                    <span className="staff-details">({staff.numberOfLines} lines)</span>
                  </div>
                )}
              </div>

              <div className="staff-controls">
                <button 
                  onClick={() => handleMoveUp(staff.id, index)}
                  disabled={index === 0}
                  className="move-btn"
                >
                  ↑
                </button>
                <button 
                  onClick={() => handleMoveDown(staff.id, index)}
                  disabled={index === staffs.length - 1}
                  className="move-btn"
                >
                  ↓
                </button>
                <button 
                  onClick={() => setEditingStaff(editingStaff === staff.id ? null : staff.id)}
                  className="edit-btn"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDeleteStaff(staff.id)}
                  className="delete-btn"
                  disabled={staffs.length <= 1}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="add-staff-form">
          <h4>Add New Staff</h4>
          <div className="form-row">
            <input
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="Staff name (e.g., Violin, Piano)"
              className="staff-name-input"
            />
            <input
              type="number"
              value={newStaffLines}
              onChange={(e) => setNewStaffLines(parseInt(e.target.value))}
              min="1"
              max="11"
              className="staff-lines-input"
            />
            <span>lines</span>
          </div>
          <button onClick={handleAddStaff} disabled={!newStaffName.trim()}>
            Add Staff
          </button>
        </div>
      </div>
    </div>
  )
}
