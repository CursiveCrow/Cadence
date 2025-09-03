import React from 'react'
import { useDispatch } from 'react-redux'
import { setSelectionWithAnchor, updateViewport } from '../../infrastructure/persistence'
import { updateTask, createDependency } from '@cadence/crdt'
import { Staff, Task, Dependency, DependencyType } from '@cadence/core'
import { TimelineCanvas, type TimelineCanvasHandle } from '../components/renderer-react'
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
  timelineRef?: React.Ref<TimelineCanvasHandle>
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
  onVerticalScaleChange,
  timelineRef,
}) => {
  const dispatch = useDispatch()

  return (
    <div className="timeline-canvas-container">
      <TimelineCanvas
        ref={timelineRef as any}
        projectId={projectId}
        tasks={tasks}
        dependencies={dependencies}
        selection={selection}
        viewport={viewport}
        staffs={staffs}
        onSelect={(payload: { ids: string[]; anchor?: { x: number; y: number } }) => dispatch(setSelectionWithAnchor(payload))}
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
