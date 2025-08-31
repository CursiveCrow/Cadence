import React from 'react'
import { DateHeader as UIDateHeader } from '@cadence/ui'
import { TimelineCanvas } from '@cadence/viewmodel'
import type { Task, Dependency, Staff, DependencyType } from '@cadence/core'

export interface TimelineViewProps {
    projectId: string
    tasks: Record<string, Task>
    dependencies: Record<string, Dependency>
    selection: string[]
    viewport: { x: number; y: number; zoom: number }
    staffs: Staff[]
    projectStart: Date
    leftMargin: number
    dayWidth: number
    onSelect: (ids: string[]) => void
    onViewportChange: (v: { x: number; y: number; zoom: number }) => void
    onVerticalScaleChange: (scale: number) => void
    onUpdateTask: (projectId: string, id: string, updates: Partial<Task>) => void
    onCreateDependency: (
        projectId: string,
        dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }
    ) => void
    onDragStart?: () => void
    onDragEnd?: () => void
    onZoomChange: (zoom: number, anchorLocalX: number) => void
}

export const TimelineView: React.FC<TimelineViewProps> = (props) => {
    return (
        <div className="main-column">
            <UIDateHeader
                viewport={props.viewport}
                projectStart={props.projectStart}
                leftMargin={props.leftMargin}
                dayWidth={props.dayWidth}
                onZoomChange={props.onZoomChange}
            />
            <div className="timeline-container full-width">
                <TimelineCanvas
                    projectId={props.projectId}
                    tasks={props.tasks}
                    dependencies={props.dependencies}
                    selection={props.selection}
                    viewport={props.viewport}
                    staffs={props.staffs}
                    onSelect={props.onSelect}
                    onViewportChange={props.onViewportChange}
                    onVerticalScaleChange={props.onVerticalScaleChange}
                    onUpdateTask={props.onUpdateTask}
                    onCreateDependency={props.onCreateDependency}
                    onDragStart={props.onDragStart}
                    onDragEnd={props.onDragEnd}
                />
            </div>
        </div>
    )
}


