import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, setSelection } from '@cadence/state'
import { useProjectTasks, useProjectDependencies, useTask, updateTask, createTask } from '@cadence/crdt'
import { TaskStatus } from '@cadence/core'
import { TimelineRenderer } from './TimelineRenderer'
import {
  StaffSidebar as UIStaffSidebar,
  DateHeader as UIDateHeader,
  TaskPopup as UITaskPopup,
  TaskPopupTask,
  TaskPopupStaff
} from '@cadence/ui'
import { TIMELINE_CONFIG, PROJECT_START_DATE } from '@cadence/renderer'
import { ProjectHeader as UIProjectHeader } from '@cadence/ui'
import { computeDateHeaderHeight } from '@cadence/ui'
import { StaffManager } from './StaffManager'
import { useResizableSidebar } from '../hooks/useResizableSidebar'
import { useDemoProject } from '../hooks/useDemoProject'
import { useTaskPopupPosition } from '../hooks/useTaskPopupPosition'
import './CadenceMain.css'

export const CadenceMain: React.FC = () => {
  const dispatch = useDispatch()
  const selection = useSelector((state: RootState) => state.selection.ids)
  const viewport = useSelector((state: RootState) => state.viewport)
  const staffs = useSelector((state: RootState) => state.staffs.list)
  const [verticalScale, setVerticalScale] = useState(1)
  const verticalZoomSession = useRef<{ startZoom: number; startViewportY: number; anchorPx: number } | null>(null)

  const { demoProjectId } = useDemoProject()
  const tasks = useProjectTasks(demoProjectId)
  const dependencies = useProjectDependencies(demoProjectId)
  const [popupPosition, setPopupPosition] = useState<{ x: number, y: number } | null>(null)
  const [isDragInProgress, setIsDragInProgress] = useState(false)
  const [showStaffManager, setShowStaffManager] = useState(false)
  const { sidebarWidth, resizerRef, beginResize, resetSidebarWidth } = useResizableSidebar()
  const { calculatePopupPosition } = useTaskPopupPosition(tasks)

  // State for the selected task popup
  const selectedTaskId = selection.length > 0 ? selection[0] : null
  const selectedTask = useTask(demoProjectId, selectedTaskId || '')

  const handleClosePopup = useCallback(() => {
    dispatch(setSelection([]))
    setPopupPosition(null)
  }, [dispatch])

  const handleDragStart = useCallback(() => { setIsDragInProgress(true) }, [])
  const handleDragEnd = useCallback(() => { setIsDragInProgress(false) }, [])

  useEffect(() => {
    if (selection.length > 0 && !isDragInProgress) {
      const position = calculatePopupPosition(selection[0])
      setPopupPosition(position)
    } else {
      setPopupPosition(null)
    }
  }, [selection, calculatePopupPosition, isDragInProgress])

  const addNewTask = () => {
    const taskId = `task-${Date.now()}`
    const randomStaff = staffs[Math.floor(Math.random() * staffs.length)] || staffs[0]
    const randomLine = Math.floor(Math.random() * (randomStaff?.numberOfLines * 2 - 1 || 9))
    const newTask = {
      id: taskId,
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
    console.log('Creating new task:', newTask)
    createTask(demoProjectId, newTask)
  }

  return (
    <div className="cadence-main">
      <UIProjectHeader
        projectName="Score Name"
        onAddTask={addNewTask}
        onOpenStaffManager={() => setShowStaffManager(true)}
      />

      <div className="cadence-content">
        <div className="staff-sidebar" style={{ width: `${sidebarWidth}px` }}>
          <UIStaffSidebar
            staffs={staffs}
            viewport={viewport}
            width={sidebarWidth}
            topMargin={Math.round(TIMELINE_CONFIG.TOP_MARGIN * verticalScale)}
            staffSpacing={Math.max(20, Math.round(TIMELINE_CONFIG.STAFF_SPACING * verticalScale))}
            staffLineSpacing={Math.max(8, Math.round(TIMELINE_CONFIG.STAFF_LINE_SPACING * verticalScale))}
            headerHeight={computeDateHeaderHeight(viewport.zoom || 1)}
            verticalScale={verticalScale}
            onAddNote={addNewTask}
            onOpenMenu={() => {
              const el = document.querySelector('.menu-btn') as HTMLButtonElement | null
              if (el) el.click()
            }}
            onVerticalZoomChange={(newZoom, anchorLocalY, startZoom) => {
              // Keep the pixel under the initial click fixed while scaling vertically.
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
              try { (window as any).__CADENCE_SET_VERTICAL_SCALE?.(s1) } catch { }
              dispatch({ type: 'viewport/setViewport', payload: { x: viewport.x, y: newY, zoom: viewport.zoom } })
            }}
          />
        </div>
        <div className="vertical-resizer" ref={resizerRef} onMouseDown={beginResize} onDoubleClick={resetSidebarWidth} />
        <div className="main-column">
          <UIDateHeader
            viewport={viewport}
            projectStart={PROJECT_START_DATE}
            leftMargin={TIMELINE_CONFIG.LEFT_MARGIN}
            dayWidth={TIMELINE_CONFIG.DAY_WIDTH}
            onZoomChange={(z, anchorLocalX) => {
              // Anchor at the initial click position in header space.
              // Convert anchor from pixels to days using current and next zooms, accounting for LEFT_MARGIN.
              const ppd0 = TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.0001, viewport.zoom)
              const ppd1 = TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.1, z)
              const anchorPxFromGrid = anchorLocalX - TIMELINE_CONFIG.LEFT_MARGIN
              const worldAtAnchor = viewport.x + (anchorPxFromGrid / ppd0)
              const newX = Math.max(0, worldAtAnchor - (anchorPxFromGrid / ppd1))
              dispatch({ type: 'viewport/setViewport', payload: { x: Math.round(newX), y: viewport.y, zoom: z } })
            }}
          />
          <div className="timeline-container full-width">
            <TimelineRenderer
              projectId={demoProjectId}
              tasks={tasks}
              dependencies={dependencies}
              selection={selection}
              viewport={viewport}
              staffs={staffs}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onVerticalScaleChange={(s: number) => {
                setVerticalScale(s)
                // Keep viewport.y anchored at current center during engine-driven change: recompute so center remains stable
                dispatch({ type: 'viewport/setViewport', payload: { x: viewport.x, y: viewport.y, zoom: viewport.zoom } })
              }}
            />
          </div>
        </div>
      </div>

      {selectedTask && popupPosition && (
        <UITaskPopup
          task={selectedTask as TaskPopupTask}
          staffs={staffs as TaskPopupStaff[]}
          selectedCount={selection.length}
          position={popupPosition}
          onClose={handleClosePopup}
          onChangeTitle={(title) => updateTask(demoProjectId, selectedTask.id, { title })}
          onChangeStatus={(status) => updateTask(demoProjectId, selectedTask.id, { status: status as TaskStatus })}
          onChangeDuration={(days) => updateTask(demoProjectId, selectedTask.id, { durationDays: days })}
          onChangeStartDate={(iso) => updateTask(demoProjectId, selectedTask.id, { startDate: iso })}
          onChangeStaff={(staffId) => updateTask(demoProjectId, selectedTask.id, { staffId })}
          onChangeStaffLine={(staffLine) => updateTask(demoProjectId, selectedTask.id, { staffLine })}
          onChangeAssignee={(assignee) => updateTask(demoProjectId, selectedTask.id, { assignee })}
          onChangeDescription={(description) => updateTask(demoProjectId, selectedTask.id, { description })}
        />
      )}
      <StaffManager isOpen={showStaffManager} onClose={() => setShowStaffManager(false)} />
    </div>
  )
}
