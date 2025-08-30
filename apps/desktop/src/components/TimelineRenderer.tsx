import React from 'react'
import { useDispatch } from 'react-redux'
import { setSelection, updateViewport } from '@cadence/state'
import { updateTask, createDependency } from '@cadence/crdt'
import { Staff, Task, Dependency, DependencyType } from '@cadence/core'
import { TimelineCanvas } from '@cadence/renderer-react'
import './TimelineRenderer.css'

interface TimelineCanvasProps {
  projectId: string
  tasks: Record<string, Task>
  dependencies: Record<string, Dependency>
  selection: string[]
  viewport: { x: number; y: number; zoom: number }
  staffs: Staff[]
  onDragStart?: () => void
  onDragEnd?: () => void
  onVerticalScaleChange?: (s: number) => void
}

export const TimelineRenderer: React.FC<TimelineCanvasProps> = ({
  projectId,
  tasks,
  dependencies,
  selection,
  viewport,
  staffs,
  onDragStart,
  onDragEnd,
  onVerticalScaleChange
}) => {
  const dispatch = useDispatch()

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
        onVerticalScaleChange={(s: number) => {
          try { onVerticalScaleChange?.(s) } catch { }
          // Trigger a re-render for any components depending on viewport while engine already applied vertical scale
          dispatch(updateViewport({ ...viewport }))
        }}
        onUpdateTask={(pid: string, id: string, updates: Partial<Task>) => updateTask(pid, id, updates as any)}
        onCreateDependency={(pid: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }) => createDependency(pid, dep as any)}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="timeline-canvas"
      />
    </div>
  )
}
