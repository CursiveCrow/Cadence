import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@cadence/core/state'

const DEMO_PROJECT_ID = 'demo-project'

export function useDemoProject() {
  const [isInitialized, setIsInitialized] = useState(false)

  const activeProjectId = useSelector((state: RootState) => state.ui.activeProjectId)
  const tasks = useSelector((state: RootState) => (state as any).tasks.entities as Record<string, any>)

  // Active project and seeding are now handled in RepositoriesProvider
  useEffect(() => {
    if (activeProjectId === DEMO_PROJECT_ID && !isInitialized) {
      setIsInitialized(Object.keys(tasks).length > 0)
    }
  }, [activeProjectId, tasks, isInitialized])

  // No-op: previously performed seeding here

  return {
    demoProjectId: DEMO_PROJECT_ID,
    isDemoProjectInitialized: isInitialized
  }
}

