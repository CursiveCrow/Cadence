import { useState, useEffect } from 'react'
import type { ProjectSnapshot } from '../../../application/ports/PersistencePort'
import { useApplicationPorts } from '../../../application/context/ApplicationPortsContext'

export function useProjectSnapshot(projectId: string): ProjectSnapshot {
    const { persistence } = useApplicationPorts()
    const [snapshot, setSnapshot] = useState<ProjectSnapshot>({ tasks: {}, dependencies: {} })
    useEffect(() => persistence.subscribeProject(projectId, setSnapshot), [persistence, projectId])
    return snapshot
}
