import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../state'
import { setSelection, setViewport } from '../state'
import { updateStaff } from '../state'
import { useProjectSnapshot } from './hooks/crdt'
import { TaskStatus, Task } from '@cadence/core'
import { ProjectHeader as UIProjectHeader } from '@cadence/ui'
import { StaffManager } from './StaffManager'
import { useDemoProject } from './hooks/useDemoProject'
import { useTaskPopupPosition } from './hooks/useTaskPopupPosition'
import { Sidebar } from './Sidebar'
import { TimelineView } from './TimelineView'
import type { TimelineCanvasHandle } from '../components/renderer-react'
import { TaskDetails } from './TaskDetails'
import { TIMELINE_CONFIG } from '@cadence/renderer'
import './CadenceMain.css'
import { useApplicationPorts } from '../../application/context/ApplicationPortsContext'

export const CadenceMain: React.FC = () => {
    const dispatch = useDispatch()
    const selection = useSelector((state: RootState) => state.ui.selection)
    const selectionAnchor = useSelector((state: RootState) => state.ui.selectionAnchor)
    const viewport = useSelector((state: RootState) => state.ui.viewport)
    const staffs = useSelector((state: RootState) => state.staffs.list)
    const [verticalScale, setVerticalScale] = useState(1)
    const verticalZoomSession = useRef<{ startZoom: number; startViewportY: number; anchorPx: number } | null>(null)
    const { persistence } = useApplicationPorts()

    const { demoProjectId } = useDemoProject()
    const snapshot = useProjectSnapshot(demoProjectId)
    const [popupPosition, setPopupPosition] = useState<{ x: number, y: number } | null>(null)
    const [isDragInProgress, setIsDragInProgress] = useState(false)
    const [showStaffManager, setShowStaffManager] = useState(false)
    const { calculatePopupPosition } = useTaskPopupPosition(snapshot.tasks)
    const timelineRef = useRef<TimelineCanvasHandle | null>(null)

    const selectedTaskId = selection.length > 0 ? selection[0] : null
    const selectedTask = selectedTaskId ? (snapshot.tasks[selectedTaskId] as unknown as Task | undefined) : null

    const handleClosePopup = useCallback(() => {
        dispatch(setSelection([]))
        setPopupPosition(null)
    }, [dispatch])

    useEffect(() => {
        if (selection.length > 0 && !isDragInProgress) {
            if (selectionAnchor && Number.isFinite(selectionAnchor.x) && Number.isFinite(selectionAnchor.y)) {
                setPopupPosition({ x: selectionAnchor.x, y: selectionAnchor.y })
            } else {
                setPopupPosition(calculatePopupPosition(selection[0]))
            }
        } else {
            setPopupPosition(null)
        }
    }, [selection, selectionAnchor, calculatePopupPosition, isDragInProgress])

    const addNewTask = () => {
        const randomStaff = staffs[Math.floor(Math.random() * staffs.length)] || staffs[0]
        const randomLine = Math.floor(Math.random() * (randomStaff?.numberOfLines * 2 - 1 || 9))
        const newTask: Task = {
            id: `task-${Date.now()}`,
            title: 'New Note',
            startDate: '2024-01-08',
            durationDays: 2,
            status: TaskStatus.NOT_STARTED,
            staffId: randomStaff?.id || 'staff-treble',
            staffLine: randomLine,
            projectId: demoProjectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
        persistence.createTask(demoProjectId, newTask)
    }

    const handleUpdateTask = (updates: Partial<Task>) => {
        if (selectedTask) {
            persistence.updateTask(demoProjectId, selectedTask.id, updates)
        }
    }

    return (
        <div className="cadence-main">
            <UIProjectHeader
                projectName="Score Name"
                onOpenStaffManager={() => setShowStaffManager(true)}
            />

            <div className="cadence-content">
                <Sidebar
                    staffs={staffs}
                    viewport={viewport}
                    verticalScale={verticalScale}
                    onAddNote={addNewTask}
                    onOpenMenu={() => {
                        const el = document.querySelector('.menu-btn') as HTMLButtonElement | null
                        if (el) el.click()
                    }}
                    onVerticalZoomChange={(newZoom, anchorLocalY, startZoom) => {
                        const header = 32
                        const s1 = Math.max(0.5, Math.min(3, newZoom))
                        if (!verticalZoomSession.current || verticalZoomSession.current.startZoom !== startZoom) {
                            verticalZoomSession.current = { startZoom: startZoom || verticalScale || 1, startViewportY: viewport.y, anchorPx: Math.max(0, anchorLocalY - header) }
                        }
                        const s0 = verticalZoomSession.current.startZoom
                        const startY = verticalZoomSession.current.startViewportY
                        const anchorPx = verticalZoomSession.current.anchorPx
                        const ratio = s1 / s0
                        const newY = Math.max(0, Math.round(ratio * startY + (ratio - 1) * anchorPx))
                        setVerticalScale(s1)
                        try { timelineRef.current?.setVerticalScale(s1) } catch { }
                        dispatch(setViewport({ x: viewport.x, y: newY, zoom: viewport.zoom }))
                    }}
                    onChangeTimeSignature={(staffId, timeSignature) => {
                        dispatch(updateStaff({ id: staffId, updates: { timeSignature } } as any))
                    }}
                />
                <TimelineView
                    timelineRef={timelineRef}
                    projectId={demoProjectId}
                    snapshot={snapshot}
                    selection={selection}
                    viewport={viewport}
                    staffs={staffs}
                    onDragStart={() => setIsDragInProgress(true)}
                    onDragEnd={() => setIsDragInProgress(false)}
                    onVerticalScaleChange={(s) => {
                        setVerticalScale(s)
                        dispatch(setViewport({ x: viewport.x, y: viewport.y, zoom: viewport.zoom }))
                    }}
                    onZoomChange={(z, anchorLocalX) => {
                        const ppd0 = TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.0001, viewport.zoom)
                        const ppd1 = TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.1, z)
                        const anchorPxFromGrid = anchorLocalX - TIMELINE_CONFIG.LEFT_MARGIN
                        const worldAtAnchor = viewport.x + (anchorPxFromGrid / ppd0)
                        const newX = Math.max(0, worldAtAnchor - (anchorPxFromGrid / ppd1))
                        dispatch(setViewport({ x: Math.round(newX), y: viewport.y, zoom: z }))
                    }}
                />
            </div>

            {selectedTask && popupPosition && (
                <TaskDetails
                    task={selectedTask}
                    staffs={staffs}
                    selectionCount={selection.length}
                    position={popupPosition}
                    onClose={handleClosePopup}
                    onUpdateTask={handleUpdateTask}
                />
            )}
            <StaffManager isOpen={showStaffManager} onClose={() => setShowStaffManager(false)} />
        </div>
    )
}
