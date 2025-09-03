import React from 'react'
import { useDispatch } from 'react-redux'
import { setSelectionWithAnchor, updateViewport } from '../state'
import { Staff, Task, DependencyType } from '@cadence/core'
import { TimelineCanvas, type TimelineCanvasHandle } from '../components/renderer-react'
import './TimelineRenderer.css'
import { useApplicationPorts } from '../../application/context/ApplicationPortsContext'
import type { ProjectSnapshot } from '../../application/ports/PersistencePort'

interface TimelineCanvasProps {
  projectId: string
  snapshot: ProjectSnapshot
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
  snapshot,
  selection,
  viewport,
  staffs,
  onDragStart,
  onDragEnd,
  onVerticalScaleChange,
  timelineRef,
}) => {
  const dispatch = useDispatch()
  const { persistence } = useApplicationPorts()

  return (
    <div className="timeline-canvas-container">
      <TimelineCanvas
        ref={timelineRef as any}
        projectId={projectId}
        snapshot={snapshot}
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
        onUpdateTask={(pid: string, id: string, updates: Partial<Task>) => persistence.updateTask(pid, id, updates as any)}
        onCreateDependency={(pid: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }) => persistence.createDependency(pid, dep as any)}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="timeline-canvas"
      />
    </div>
  )
}
