import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, addStaff, updateStaff, deleteStaff, reorderStaffs } from '@cadence/state'
import { Staff } from '@cadence/core'
import { StaffManager as UIStaffManager, type UIStaff } from '@cadence/ui'

interface StaffManagerProps {
  isOpen: boolean
  onClose: () => void
}

export const StaffManager: React.FC<StaffManagerProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch()
  const staffs = useSelector((state: RootState) => state.staffs.list)
  const activeProjectId = useSelector((state: RootState) => state.ui.activeProjectId)

  const uiStaffs: UIStaff[] = staffs.map((s) => ({
    id: s.id,
    name: s.name,
    numberOfLines: s.numberOfLines,
    lineSpacing: s.lineSpacing,
    position: s.position,
  }))

  const handleAdd = (name: string, lines: number) => {
    if (!name.trim() || !activeProjectId) return
    const newStaff: Staff = {
      id: `staff-${Date.now()}`,
      name: name.trim(),
      numberOfLines: lines,
      lineSpacing: 12,
      position: staffs.length,
      projectId: activeProjectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    dispatch(addStaff(newStaff))
  }

  const handleUpdate = (id: string, updates: Partial<UIStaff>) => {
    const mapped: Partial<Staff> = {}
    if (typeof updates.name === 'string') mapped.name = updates.name
    if (typeof updates.numberOfLines === 'number') mapped.numberOfLines = updates.numberOfLines
    dispatch(updateStaff({ id, updates: mapped }))
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this staff? All notes on this staff will be lost.')) {
      dispatch(deleteStaff(id))
    }
  }

  const handleMoveUp = (id: string, index: number) => {
    if (index > 0) dispatch(reorderStaffs({ staffId: id, newPosition: index - 1 }))
  }

  const handleMoveDown = (id: string, index: number) => {
    if (index < staffs.length - 1) dispatch(reorderStaffs({ staffId: id, newPosition: index + 1 }))
  }

  return (
    <UIStaffManager
      isOpen={isOpen}
      staffs={uiStaffs}
      onClose={onClose}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
    />
  )
}
