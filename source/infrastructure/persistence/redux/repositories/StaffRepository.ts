/**
 * Redux implementation of StaffRepository
 * Handles staff persistence using Redux store
 */

import { Store } from '@reduxjs/toolkit'
import { Staff } from '../../../../core/domain/entities/Staff'
import { StaffRepository as IStaffRepository } from '../../../../core/use-cases/commands/CreateTaskCommand'

export class ReduxStaffRepository implements IStaffRepository {
    constructor(private store: Store) { }

    async findById(id: string): Promise<Staff | null> {
        const state = this.store.getState() as any
        const staffs = state.staffs?.byProjectId || {}

        for (const projectStaffs of Object.values(staffs)) {
            const projectStaffsMap = projectStaffs as Record<string, any>
            if (projectStaffsMap[id]) {
                return Staff.fromPersistence(projectStaffsMap[id])
            }
        }

        return null
    }

    async findByProject(projectId: string): Promise<Staff[]> {
        const state = this.store.getState() as any
        const projectStaffs = state.staffs?.byProjectId?.[projectId] || {}

        return Object.values(projectStaffs).map((staffData: any) =>
            Staff.fromPersistence(staffData)
        )
    }

    async save(staff: Staff): Promise<void> {
        const staffData = staff.toJSON()

        // Dispatch action to update Redux store
        this.store.dispatch({
            type: 'staffs/upsertStaff',
            payload: {
                projectId: staff.projectId,
                staff: staffData
            }
        })
    }

    async delete(id: string): Promise<void> {
        // Find the staff first to get its project ID
        const staff = await this.findById(id)
        if (!staff) return

        // Dispatch action to delete from Redux store
        this.store.dispatch({
            type: 'staffs/deleteStaff',
            payload: {
                projectId: staff.projectId,
                staffId: id
            }
        })
    }
}
