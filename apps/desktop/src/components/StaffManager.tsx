import React from 'react'
import { StaffManagerView } from '@cadence/view'
import { useStaffManagerViewModel } from '@cadence/viewmodel'
import type { Staff } from '@cadence/core'

interface StaffManagerProps {
  isOpen: boolean
  onClose: () => void
}

export const StaffManager: React.FC<StaffManagerProps> = ({ isOpen, onClose }) => {
  const vm = useStaffManagerViewModel()

  return (
    <StaffManagerView
      isOpen={isOpen}
      staffs={vm.staffs}
      onClose={onClose}
      onAdd={(name: string, lines: number) => vm.commands.add(name, lines)}
      onUpdate={(id: string, updates: Partial<Staff>) => vm.commands.update(id, updates)}
      onDelete={(id: string) => vm.commands.remove(id)}
      onMoveUp={(id: string, index: number) => vm.commands.moveUp(id, index)}
      onMoveDown={(id: string, index: number) => vm.commands.moveDown(id, index)}
    />
  )
}
