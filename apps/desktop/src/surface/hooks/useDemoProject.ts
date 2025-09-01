import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@cadence/state'
import { useProjectTasks, createTask, createDependency } from '@cadence/state/crdt'
import { seedDemoProject } from '@cadence/fixtures'
import { Task } from '@cadence/core'
import { setActiveProject, setStaffs } from '@cadence/state'

const DEMO_PROJECT_ID = 'demo-project'

export function useDemoProject() {
  const dispatch = useDispatch()
  const [isInitialized, setIsInitialized] = useState(false)
  const activeProjectId = useSelector((state: RootState) => state.ui.activeProjectId)
  const staffs = useSelector((state: RootState) => state.staffs.list)
  const tasks = useProjectTasks(DEMO_PROJECT_ID)

  useEffect(() => {
    if (!activeProjectId) {
      dispatch(setActiveProject(DEMO_PROJECT_ID))
      if (staffs.length === 0) {
        const defaults = [
          { id: 'staff-treble', name: 'Treble', numberOfLines: 5, lineSpacing: 12, position: 0, projectId: DEMO_PROJECT_ID, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'staff-bass', name: 'Bass', numberOfLines: 5, lineSpacing: 12, position: 1, projectId: DEMO_PROJECT_ID, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ]
        dispatch(setStaffs(defaults as any))
      }
    }
  }, [activeProjectId, staffs.length, dispatch])

  useEffect(() => {
    if (activeProjectId === DEMO_PROJECT_ID && !isInitialized) {
      const timer = setTimeout(() => {
        seedDemoProject(
          DEMO_PROJECT_ID,
          { createTask: (projectId, task) => createTask(projectId, task as Task), createDependency },
          () => Object.keys(tasks).length > 0
        )
        setIsInitialized(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeProjectId, tasks, isInitialized])

  return { demoProjectId: DEMO_PROJECT_ID, isDemoProjectInitialized: isInitialized }
}

