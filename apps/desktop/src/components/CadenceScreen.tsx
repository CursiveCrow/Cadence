import React, { useEffect, useState, useCallback, useRef } from 'react'
// no redux dispatch needed here; commands come from ViewModels
import { TaskStatus, type Task, type Dependency } from '@cadence/core'
import { StaffManager } from './StaffManager'
import { useDemoProject } from '../hooks/useDemoProject'
import { useTaskPopupPosition, CadenceMain as ViewCadenceMain } from '@cadence/view'
import { TIMELINE_CONFIG, PROJECT_START_DATE } from '@cadence/viewmodel'
import { DebugService } from '../utils/DebugService'
import { useTimelineViewModel, useStaffSidebarViewModel, useTaskDetailsViewModel } from '@cadence/viewmodel'
import './CadenceScreen.css'

export const CadenceScreen: React.FC<{ projectId?: string }> = ({ projectId }) => {
    const [verticalScale, setVerticalScale] = useState(1)
    const verticalZoomSession = useRef<{ startZoom: number; startViewportY: number; anchorPx: number } | null>(null)

    const { demoProjectId } = useDemoProject()
    const effectiveProjectId = projectId || demoProjectId
    const vm = useTimelineViewModel(effectiveProjectId)
    const staffVM = useStaffSidebarViewModel(effectiveProjectId)
    const [popupPosition, setPopupPosition] = useState<{ x: number, y: number } | null>(null)
    const [isDragInProgress, setIsDragInProgress] = useState(false)
    const [showStaffManager, setShowStaffManager] = useState(false)
    const { calculatePopupPosition } = useTaskPopupPosition(
        vm.tasks,
        staffVM.staffs,
        {
            LEFT_MARGIN: TIMELINE_CONFIG.LEFT_MARGIN,
            DAY_WIDTH: TIMELINE_CONFIG.DAY_WIDTH,
            STAFF_SPACING: TIMELINE_CONFIG.STAFF_SPACING,
            TOP_MARGIN: TIMELINE_CONFIG.TOP_MARGIN,
            STAFF_LINE_SPACING: TIMELINE_CONFIG.STAFF_LINE_SPACING,
        },
        PROJECT_START_DATE,
        { zoom: vm.viewport.zoom, verticalScale }
    )

    const selectedTaskId = vm.selection.length > 0 ? vm.selection[0] : null
    const detailsVM = useTaskDetailsViewModel(effectiveProjectId, selectedTaskId)
    const selectedTask: Task | null = detailsVM.task ?? null

    const handleClosePopup = useCallback(() => {
        vm.commands.select([])
        setPopupPosition(null)
    }, [vm])

    useEffect(() => {
        if (vm.selection.length > 0 && !isDragInProgress) {
            const last = DebugService.getLastSelectPos()
            if (last && Number.isFinite(last.x) && Number.isFinite(last.y)) {
                setPopupPosition({ x: last.x, y: last.y })
            } else {
                setPopupPosition(calculatePopupPosition(vm.selection[0]))
            }
        } else {
            setPopupPosition(null)
        }
    }, [vm.selection, calculatePopupPosition, isDragInProgress])

    const addNewTask = () => {
        const randomStaff = vm.staffs[Math.floor(Math.random() * vm.staffs.length)] || vm.staffs[0]
        const randomLine = Math.floor(Math.random() * (randomStaff?.numberOfLines * 2 - 1 || 9))
        const newTask: Task = {
            id: `task-${Date.now()}`,
            title: 'New Note',
            startDate: '2024-01-08',
            durationDays: 2,
            status: TaskStatus.NOT_STARTED,
            staffId: randomStaff?.id || 'staff-treble',
            staffLine: randomLine,
            projectId: effectiveProjectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        vm.commands.createTask(newTask)
    }

    // detailsVM update is handled via onUpdateTask prop pass-through

    const dependencies: Record<string, Dependency> = vm.dependencies as any

    return (
        <ViewCadenceMain
            projectId={effectiveProjectId}
            projectName="Score Name"
            tasks={vm.tasks}
            dependencies={dependencies}
            selection={vm.selection}
            viewport={vm.viewport}
            staffs={vm.staffs}
            verticalScale={verticalScale}
            projectStart={PROJECT_START_DATE}
            leftMargin={TIMELINE_CONFIG.LEFT_MARGIN}
            dayWidth={TIMELINE_CONFIG.DAY_WIDTH}
            popupPosition={popupPosition}
            selectedTask={selectedTask}
            selectionCount={detailsVM.selectionCount}
            onOpenStaffManager={() => setShowStaffManager(true)}
            onClosePopup={handleClosePopup}
            onAddNote={addNewTask}
            onOpenMenu={() => {
                const el = document.querySelector('.menu-btn') as HTMLButtonElement | null
                if (el) el.click()
            }}
            onSelect={(ids: string[]) => vm.commands.select(ids)}
            onViewportChange={(v) => vm.commands.setViewport(v)}
            onVerticalZoomChange={(newZoom: number, anchorLocalY: number = 0, startZoom: number = verticalScale) => {
                const header = 32
                const s1 = Math.max(0.5, Math.min(3, newZoom))
                if (!verticalZoomSession.current || verticalZoomSession.current.startZoom !== startZoom) {
                    verticalZoomSession.current = { startZoom: startZoom || verticalScale || 1, startViewportY: vm.viewport.y, anchorPx: Math.max(0, anchorLocalY - header) }
                }
                const s0 = verticalZoomSession.current.startZoom
                const startY = verticalZoomSession.current.startViewportY
                const anchorPx = verticalZoomSession.current.anchorPx
                const ratio = s1 / s0
                const newY = Math.max(0, Math.round(ratio * startY + (ratio - 1) * anchorPx))
                setVerticalScale(s1)
                DebugService.setVerticalScale(s1)
                vm.commands.setViewport({ x: vm.viewport.x, y: newY, zoom: vm.viewport.zoom })
            }}
            onUpdateTask={(id, updates) => vm.commands.updateTask(id, updates)}
            onCreateDependency={(dep) => vm.commands.createDependency(dep as any)}
            onZoomChange={(z: number, anchorLocalX: number) => {
                const ppd0 = TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.0001, vm.viewport.zoom)
                const ppd1 = TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.1, z)
                const anchorPxFromGrid = anchorLocalX - TIMELINE_CONFIG.LEFT_MARGIN
                const worldAtAnchor = vm.viewport.x + (anchorPxFromGrid / ppd0)
                const newX = Math.max(0, worldAtAnchor - (anchorPxFromGrid / ppd1))
                vm.commands.setViewport({ x: Math.round(newX), y: vm.viewport.y, zoom: z })
            }}
            onChangeTimeSignature={(staffId, timeSignature) => {
                staffVM.commands.changeTimeSignature(staffId, timeSignature)
            }}
            onDragStart={() => setIsDragInProgress(true)}
            onDragEnd={() => setIsDragInProgress(false)}
            renderStaffManager={<StaffManager isOpen={showStaffManager} onClose={() => setShowStaffManager(false)} />}
        />
    )
}


