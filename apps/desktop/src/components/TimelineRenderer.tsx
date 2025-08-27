import React from 'react'
import { useDispatch } from 'react-redux'
import { setSelection, updateViewport } from '@cadence/state'
import { TaskData, DependencyData, updateTask, createDependency } from '@cadence/crdt'
import { Staff } from '@cadence/core'
import { TimelineCanvas } from '@cadence/renderer-react'
import './TimelineRenderer.css'

interface TimelineCanvasProps {
  projectId: string
  tasks: Record<string, TaskData>
  dependencies: Record<string, DependencyData>
  selection: string[]
  viewport: { x: number; y: number; zoom: number }
  staffs: Staff[]
  onDragStart?: () => void
  onDragEnd?: () => void
}

export const TimelineRenderer: React.FC<TimelineCanvasProps> = ({
  projectId,
  tasks,
  dependencies,
  selection,
  viewport,
  staffs,
  onDragStart,
  onDragEnd
}) => {
  const dispatch = useDispatch()

    // Expose mutations for the renderer host (optional; still wired via callbacks in package)
    ; (window as any).__CADENCE_UPDATE_TASK = (pid: string, id: string, updates: Partial<any>) => updateTask(pid, id, updates as any)
    ; (window as any).__CADENCE_CREATE_DEP = (pid: string, dep: any) => createDependency(pid, dep as any)

  return (
    <div className="timeline-canvas-container">
      <TimelineCanvas
        projectId={projectId}
        tasks={tasks}
        dependencies={dependencies}
        selection={selection}
        viewport={viewport}
        staffs={staffs}
        onSelect={(ids: string[]) => dispatch(setSelection(ids))}
        onViewportChange={(v: { x: number; y: number; zoom: number }) => dispatch(updateViewport(v))}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="timeline-canvas"
      />
    </div>
  )
}