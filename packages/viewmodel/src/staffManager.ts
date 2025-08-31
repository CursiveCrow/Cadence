import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { Staff } from '@cadence/core'
import { type RootState, addStaff, updateStaff, deleteStaff, reorderStaffs } from '@cadence/core/state'

export interface StaffManagerViewModel {
    staffs: Staff[]
    activeProjectId: string | null
    commands: {
        add: (name: string, lines: number) => void
        update: (id: string, updates: Partial<Staff>) => void
        remove: (id: string) => void
        moveUp: (id: string, index: number) => void
        moveDown: (id: string, index: number) => void
    }
}

export function useStaffManagerViewModel(): StaffManagerViewModel {
    const dispatch = useDispatch()
    const staffs = useSelector((state: RootState) => state.staffs.list)
    const activeProjectId = useSelector((state: RootState) => state.ui.activeProjectId)

    const add = React.useCallback((name: string, lines: number) => {
        if (!name.trim() || !activeProjectId) return
        const now = new Date().toISOString()
        const newStaff: Staff = {
            id: `staff-${Date.now()}`,
            name: name.trim(),
            numberOfLines: lines,
            lineSpacing: 12,
            position: staffs.length,
            projectId: activeProjectId,
            createdAt: now,
            updatedAt: now,
        }
        dispatch(addStaff(newStaff))
    }, [dispatch, activeProjectId, staffs.length])

    const update = React.useCallback((id: string, updates: Partial<Staff>) => {
        dispatch(updateStaff({ id, updates }))
    }, [dispatch])

    const remove = React.useCallback((id: string) => {
        dispatch(deleteStaff(id))
    }, [dispatch])

    const moveUp = React.useCallback((id: string, index: number) => {
        if (index > 0) dispatch(reorderStaffs({ staffId: id, newPosition: index - 1 }))
    }, [dispatch])

    const moveDown = React.useCallback((id: string, index: number) => {
        if (index < staffs.length - 1) dispatch(reorderStaffs({ staffId: id, newPosition: index + 1 }))
    }, [dispatch, staffs.length])

    return {
        staffs,
        activeProjectId,
        commands: { add, update, remove, moveUp, moveDown }
    }
}


