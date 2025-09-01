import React from 'react'
import { DateHeader as UIDateHeader } from '@cadence/ui'
import { Task, Dependency, Staff } from '@cadence/core'
import { TIMELINE_CONFIG, PROJECT_START_DATE } from '@cadence/renderer'
import type { RendererViewProps } from './CadenceMain'
import '../styles/CadenceMain.css'
import '../styles/TimelineRenderer.css'
import { useTimelineContext } from '../context/TimelineContext'

interface TimelineViewProps {
  RendererView: React.ComponentType<RendererViewProps>
  projectId: string
  tasks: Record<string, Task>
  dependencies: Record<string, Dependency>
  selection: string[]
  viewport: { x: number; y: number; zoom: number }
  staffs: Staff[]
  verticalScale: number
  onZoomChange: (zoom: number, anchorLocalX: number) => void
}

export const TimelineView: React.FC<TimelineViewProps> = (props) => {
  const RendererView = props.RendererView
  const ctx = useTimelineContext()
  return (
    <div className="main-column">
      <UIDateHeader
        viewport={props.viewport}
        projectStart={PROJECT_START_DATE}
        leftMargin={TIMELINE_CONFIG.LEFT_MARGIN}
        dayWidth={TIMELINE_CONFIG.DAY_WIDTH}
        onZoomChange={props.onZoomChange}
      />
      <div className="timeline-container full-width">
        <RendererView
          projectId={props.projectId}
          tasks={props.tasks}
          dependencies={props.dependencies}
          selection={props.selection}
          viewport={props.viewport}
          staffs={props.staffs}
          verticalScale={props.verticalScale}
          className="timeline-canvas"
          onSelect={ctx.onSelect}
          onViewportChange={ctx.onViewportChange}
          onDragStart={ctx.onDragStart}
          onDragEnd={ctx.onDragEnd}
          onVerticalScaleChange={ctx.onVerticalScaleChange}
          onUpdateTask={ctx.onUpdateTask}
          onCreateDependency={ctx.onCreateDependency as any}
        />
      </div>
    </div>
  )
}

