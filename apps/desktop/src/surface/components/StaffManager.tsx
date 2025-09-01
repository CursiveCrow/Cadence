import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@cadence/state'
import { Staff } from '@cadence/core'
import { StaffManager as UIStaffManager } from '@cadence/ui'
import { addStaff, updateStaff, deleteStaff, reorderStaffs } from '@cadence/state'

interface StaffManagerProps { isOpen: boolean; onClose: () => void }

export const StaffManager: React.FC<StaffManagerProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch()
  const staffs = useSelector((state: RootState) => state.staffs.list)
  const activeProjectId = useSelector((state: RootState) => state.ui.activeProjectId)
  const handleAdd = (name: string, lines: number) => {
    if (!name.trim() || !activeProjectId) return
    const newStaff: Staff = { id: `staff-${Date.now()}`, name: name.trim(), numberOfLines: lines, lineSpacing: 12, position: staffs.length, projectId: activeProjectId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    dispatch(addStaff(newStaff))
  }
  const handleUpdate = (id: string, updates: Partial<Staff>) => { dispatch(updateStaff({ id, updates })) }
  const handleDelete = (id: string) => { if (window.confirm('Are you sure you want to delete this staff? All notes on this staff will be lost.')) dispatch(deleteStaff(id)) }
  const handleMoveUp = (id: string, index: number) => { if (index > 0) dispatch(reorderStaffs({ staffId: id, newPosition: index - 1 })) }
  const handleMoveDown = (id: string, index: number) => { if (index < staffs.length - 1) dispatch(reorderStaffs({ staffId: id, newPosition: index + 1 })) }
  return (<UIStaffManager isOpen={isOpen} staffs={staffs} onClose={onClose} onAdd={handleAdd} onUpdate={handleUpdate} onDelete={handleDelete} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} />)
}

