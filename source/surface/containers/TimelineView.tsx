import React from 'react'
import { DateHeader as UIDateHeader } from '@cadence/ui'
import { TimelineRenderer } from './TimelineRenderer'
import { Task, Dependency, Staff } from '@cadence/core'
import { TIMELINE_CONFIG, PROJECT_START_DATE } from '@cadence/renderer'

interface TimelineViewProps {
    projectId: string
    tasks: Record<string, Task>
    dependencies: Record<string, Dependency>
    selection: string[]
    viewport: { x: number; y: number; zoom: number }
    staffs: Staff[]
    onDragStart: () => void
    onDragEnd: () => void
    onVerticalScaleChange: (scale: number) => void
    onZoomChange: (zoom: number, anchorLocalX: number) => void
}

export const TimelineView: React.FC<TimelineViewProps> = (props) => {
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
                <TimelineRenderer
                    projectId={props.projectId}
                    tasks={props.tasks}
                    dependencies={props.dependencies}
                    selection={props.selection}
                    viewport={props.viewport}
                    staffs={props.staffs}
                    onDragStart={props.onDragStart}
                    onDragEnd={props.onDragEnd}
                    onVerticalScaleChange={props.onVerticalScaleChange}
                />
            </div>
        </div>
    )
}

