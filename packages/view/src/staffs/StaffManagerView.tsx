import React from 'react'
import type { Staff } from '@cadence/core'
import { StaffManager as UIStaffManager } from '@cadence/ui'

export interface StaffManagerViewProps {
    isOpen: boolean
    staffs: Staff[]
    onClose: () => void
    onAdd: (name: string, lines: number) => void
    onUpdate: (id: string, updates: Partial<Staff>) => void
    onDelete: (id: string) => void
    onMoveUp: (id: string, index: number) => void
    onMoveDown: (id: string, index: number) => void
}

export const StaffManagerView: React.FC<StaffManagerViewProps> = ({
    isOpen,
    staffs,
    onClose,
    onAdd,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
}) => {
    return (
        <UIStaffManager
            isOpen={isOpen}
            staffs={staffs}
            onClose={onClose}
            onAdd={onAdd}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        />
    )
}

export default StaffManagerView


