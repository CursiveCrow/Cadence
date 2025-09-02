import React from 'react'
import { Task, Staff, TaskStatus } from '@cadence/core'
import { TaskPopup as UITaskPopup } from '@cadence/ui'

interface TaskDetailsProps {
    task: Task
    staffs: Staff[]
    selectionCount: number
    position: { x: number; y: number }
    onClose: () => void
    onUpdateTask: (updates: Partial<Task>) => void
}

export const TaskDetails: React.FC<TaskDetailsProps> = (props) => {
    return (
        <UITaskPopup
            task={props.task}
            staffs={props.staffs}
            selectedCount={props.selectionCount}
            position={props.position}
            onClose={props.onClose}
            onChangeTitle={(title) => props.onUpdateTask({ title })}
            onChangeStatus={(status) => props.onUpdateTask({ status: status as TaskStatus })}
            onChangeDuration={(durationDays) => props.onUpdateTask({ durationDays })}
            onChangeStartDate={(startDate) => props.onUpdateTask({ startDate })}
            onChangeStaff={(staffId) => props.onUpdateTask({ staffId })}
            onChangeStaffLine={(staffLine) => props.onUpdateTask({ staffLine })}
            onChangeAssignee={(assignee) => props.onUpdateTask({ assignee })}
            onChangeDescription={(description) => props.onUpdateTask({ description })}
        />
    )
}

