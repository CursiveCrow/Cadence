import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@app/store/store'
import { setStaffs } from '@app/store/staffs'
import { setTasks } from '@app/store/tasks'
import { TaskStatus } from '@types'

export function useDemoProject() {
  const dispatch = useDispatch()
  const staffs = useSelector((s: RootState) => s.staffs.list)
  const tasks = useSelector((s: RootState) => s.tasks.list)

  useEffect(() => {
    const now = new Date().toISOString()
    // Ensure staffs exist
    if (staffs.length === 0) {
      dispatch(setStaffs([
        { id: 'treble', name: 'Treble', numberOfLines: 5, lineSpacing: 12, position: 0, projectId: 'demo', createdAt: now, updatedAt: now, timeSignature: '4/4' },
        { id: 'bass', name: 'Bass', numberOfLines: 5, lineSpacing: 12, position: 1, projectId: 'demo', createdAt: now, updatedAt: now, timeSignature: '3/4' },
      ] as any))
    }
    // Seed demo tasks if missing
    if (tasks.length === 0) {
      const trebleId = staffs.find(s => s.name.toLowerCase().includes('treble'))?.id || 'treble'
      const bassId = staffs.find(s => s.name.toLowerCase().includes('bass'))?.id || 'bass'
      dispatch(setTasks([
        { id: 't-1', title: 'Note A', startDate: '2024-01-22', durationDays: 3, status: TaskStatus.NOT_STARTED, staffId: trebleId, staffLine: 4, projectId: 'demo', createdAt: now, updatedAt: now },
        { id: 't-2', title: 'Note B', startDate: '2024-01-28', durationDays: 2, status: TaskStatus.IN_PROGRESS, staffId: bassId, staffLine: 6, projectId: 'demo', createdAt: now, updatedAt: now },
      ] as any))
    }
  }, [dispatch, staffs, tasks.length])
}
