import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { Staff } from '@cadence/core'
import { selectStaffs, selectViewport } from '@cadence/core/state'
import { setViewport, updateStaff } from '@cadence/core/state'
import type { AppDispatch } from '@cadence/core/state'

export interface StaffSidebarViewModel {
    projectId: string
    staffs: Staff[]
    viewport: { x: number; y: number; zoom: number }
    commands: {
        setViewport: (v: { x: number; y: number; zoom: number }) => void
        changeTimeSignature: (staffId: string, timeSignature: string) => void
    }
}

export function useStaffSidebarViewModel(projectId: string): StaffSidebarViewModel {
    const dispatch = useDispatch<AppDispatch>()
    const staffs = useSelector(selectStaffs)
    const viewport = useSelector(selectViewport)

    const setViewportCommand = React.useCallback((v: { x: number; y: number; zoom: number }) => {
        dispatch(setViewport(v))
    }, [dispatch])

    const changeTimeSignature = React.useCallback((staffId: string, timeSignature: string) => {
        dispatch(updateStaff({ id: staffId, updates: { timeSignature } }))
    }, [dispatch])

    return {
        projectId,
        staffs,
        viewport,
        commands: { setViewport: setViewportCommand, changeTimeSignature }
    }
}


