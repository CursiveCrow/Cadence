import React from 'react'
import { DateHeader as UIDateHeader } from '@cadence/ui'
import { TimelineRenderer } from './TimelineRenderer'
import { Staff } from '@cadence/core'
import { TIMELINE_CONFIG } from '@cadence/renderer'
import { PROJECT_START_DATE } from '../../config'
import type { TimelineCanvasHandle } from '../components/renderer-react'
import type { ProjectSnapshot } from '../../application/ports/PersistencePort'

interface TimelineViewProps {
    projectId: string
    snapshot: ProjectSnapshot
    selection: string[]
    viewport: { x: number; y: number; zoom: number }
    staffs: Staff[]
    onDragStart: () => void
    onDragEnd: () => void
    onVerticalScaleChange: (scale: number) => void
    onZoomChange: (zoom: number, anchorLocalX: number) => void
    timelineRef?: React.Ref<TimelineCanvasHandle>
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
                    timelineRef={props.timelineRef}
                    projectId={props.projectId}
                    snapshot={props.snapshot}
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
