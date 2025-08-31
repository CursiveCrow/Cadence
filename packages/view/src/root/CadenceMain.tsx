import React from 'react'
import type { Task, Dependency, Staff, DependencyType } from '@cadence/core'
import { ProjectHeader as UIProjectHeader } from '@cadence/ui'
import { StaffSidebar } from '../staffs/StaffSidebar'
import { TimelineView } from '../timeline/TimelineView'
import { TaskDetailsView } from '../task-details/TaskDetailsView'
import { useResizableSidebar } from '../hooks/useResizableSidebar'

export interface CadenceMainProps {
    projectId: string
    projectName: string
    tasks: Record<string, Task>
    dependencies: Record<string, Dependency>
    selection: string[]
    viewport: { x: number; y: number; zoom: number }
    staffs: Staff[]
    verticalScale: number
    projectStart: Date
    leftMargin: number
    dayWidth: number
    popupPosition: { x: number; y: number } | null
    selectedTask: Task | null
    selectionCount: number
    onOpenStaffManager: () => void
    onClosePopup: () => void
    onAddNote: () => void
    onOpenMenu: () => void
    onSelect: (ids: string[]) => void
    onViewportChange: (v: { x: number; y: number; zoom: number }) => void
    onVerticalZoomChange: (newZoom: number, anchorLocalY?: number, startZoom?: number) => void
    onUpdateTask: (id: string, updates: Partial<Task>) => void
    onCreateDependency: (dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }) => void
    onZoomChange: (zoom: number, anchorLocalX: number) => void
    onChangeTimeSignature: (staffId: string, timeSignature: string) => void
    renderStaffManager?: React.ReactNode
    onDragStart?: () => void
    onDragEnd?: () => void
}

export const CadenceMain: React.FC<CadenceMainProps> = (props) => {
    const { sidebarWidth, resizerRef, beginResize, resetSidebarWidth } = useResizableSidebar()

    return (
        <div className="cadence-main">
            <UIProjectHeader
                projectName={props.projectName}
                onOpenStaffManager={props.onOpenStaffManager}
            />

            <div className="cadence-content">
                <div className="staff-sidebar" style={{ width: `${sidebarWidth}px` }}>
                    <StaffSidebar
                        staffs={props.staffs}
                        viewport={props.viewport}
                        width={sidebarWidth}
                        verticalScale={props.verticalScale}
                        onAddNote={props.onAddNote}
                        onOpenMenu={props.onOpenMenu}
                        onVerticalZoomChange={props.onVerticalZoomChange}
                        onChangeTimeSignature={props.onChangeTimeSignature}
                    />
                </div>
                <div className="vertical-resizer" ref={resizerRef} onMouseDown={beginResize} onDoubleClick={resetSidebarWidth} />

                <TimelineView
                    projectId={props.projectId}
                    tasks={props.tasks}
                    dependencies={props.dependencies}
                    selection={props.selection}
                    viewport={props.viewport}
                    staffs={props.staffs}
                    projectStart={props.projectStart}
                    leftMargin={props.leftMargin}
                    dayWidth={props.dayWidth}
                    onSelect={props.onSelect}
                    onViewportChange={props.onViewportChange}
                    onVerticalScaleChange={(scale) => props.onVerticalZoomChange(scale)}
                    onUpdateTask={(_pid: string, id: string, updates: Partial<Task>) => props.onUpdateTask(id, updates)}
                    onCreateDependency={(_pid, dep) => props.onCreateDependency(dep)}
                    onDragStart={props.onDragStart}
                    onDragEnd={props.onDragEnd}
                    onZoomChange={props.onZoomChange}
                />
            </div>

            {props.selectedTask && props.popupPosition && (
                <TaskDetailsView
                    task={props.selectedTask}
                    staffs={props.staffs}
                    selectionCount={props.selectionCount}
                    position={props.popupPosition}
                    onClose={props.onClosePopup}
                    onUpdateTask={(updates) => props.onUpdateTask(props.selectedTask!.id, updates)}
                />
            )}

            {props.renderStaffManager}
        </div>
    )
}


