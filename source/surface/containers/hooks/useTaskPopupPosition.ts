import { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../state'
import { TIMELINE_CONFIG } from '@cadence/renderer'
import { PROJECT_START_DATE } from '../../../config'
import type { TaskData } from '../../../application/ports/PersistencePort'

export function useTaskPopupPosition(tasks: Record<string, TaskData>) {
  const staffs = useSelector((state: RootState) => state.staffs.list)

  const calculatePopupPosition = useCallback((taskId: string) => {
    const task = tasks[taskId]
    if (!task) return null

    const dayWidth = TIMELINE_CONFIG.DAY_WIDTH
    const leftMargin = TIMELINE_CONFIG.LEFT_MARGIN
    const staffSpacing = TIMELINE_CONFIG.STAFF_SPACING
    const staffStartY = TIMELINE_CONFIG.TOP_MARGIN

    const staffIndex = staffs.findIndex((staff: any) => staff.id === task.staffId)
    if (staffIndex === -1) return null

    const projectStart = PROJECT_START_DATE
    const taskStart = new Date(task.startDate)
    const dayIndex = Math.floor((taskStart.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
    const taskX = leftMargin + dayIndex * dayWidth

    const staffY = staffStartY + staffIndex * staffSpacing
    const STAFF_LINE_SPACING = TIMELINE_CONFIG.STAFF_LINE_SPACING
    const taskY = staffY + (task.staffLine * STAFF_LINE_SPACING / 2)

    return { x: taskX + 100, y: taskY - 50 }
  }, [tasks, staffs])

  return { calculatePopupPosition }
}
