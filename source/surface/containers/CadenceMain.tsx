import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, setSelection } from '@cadence/state'
import { useProjectTasks, useProjectDependencies, useTask, updateTask, createTask } from '@cadence/crdt'
import { TaskStatus, Task, Dependency } from '@cadence/core'
import { ProjectHeader as UIProjectHeader } from '@cadence/ui'
import { StaffManager } from './StaffManager'
import { useDemoProject } from './hooks/useDemoProject'
import { useTaskPopupPosition } from './hooks/useTaskPopupPosition'
import { Sidebar } from './Sidebar'
import { TimelineView } from './TimelineView'
import { TaskDetails } from './TaskDetails'
import { TIMELINE_CONFIG } from '@cadence/renderer'
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
  const dependenciesData = useProjectDependencies(demoProjectId)
  const [popupPosition, setPopupPosition] = useState<{ x: number, y: number } | null>(null)
  const [isDragInProgress, setIsDragInProgress] = useState(false)
  const [showStaffManager, setShowStaffManager] = useState(false)
  const { calculatePopupPosition } = useTaskPopupPosition(tasks)

  const selectedTaskId = selection.length > 0 ? selection[0] : null
  const selectedTask = useTask(demoProjectId, selectedTaskId || '')

  const handleClosePopup = useCallback(() => {
    dispatch(setSelection([]))
    setPopupPosition(null)
  }, [dispatch])

  useEffect(() => {
    if (selection.length > 0 && !isDragInProgress) {
      const last = (window as any).__CADENCE_LAST_SELECT_POS as { x: number; y: number } | undefined
      if (last && Number.isFinite(last.x) && Number.isFinite(last.y)) {
        setPopupPosition({ x: last.x, y: last.y })
      } else {
        setPopupPosition(calculatePopupPosition(selection[0]))
      }
    } else {
      setPopupPosition(null)
    }
  }, [selection, calculatePopupPosition, isDragInProgress])

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
    createTask(demoProjectId, newTask)
  }

  const handleUpdateTask = (updates: Partial<Task>) => {
    if (selectedTask) {
      updateTask(demoProjectId, selectedTask.id, updates)
    }
  }

  const dependencies: Record<string, Dependency> = Object.entries(dependenciesData).reduce((acc, [id, dep]) => {
    acc[id] = {
      ...dep,
      id,
      projectId: demoProjectId,
      createdAt: '', // These fields are not in the Yjs data, adding placeholders
      updatedAt: '',
    }
    return acc
  }, {} as Record<string, Dependency>)


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
            try { (window as any).__CADENCE_SET_VERTICAL_SCALE?.(s1) } catch { }
            dispatch({ type: 'viewport/setViewport', payload: { x: viewport.x, y: newY, zoom: viewport.zoom } })
          }}
          onChangeTimeSignature={(staffId, timeSignature) => {
            dispatch({ type: 'staffs/updateStaff', payload: { id: staffId, updates: { timeSignature } } })
          }}
        />
        <TimelineView
          projectId={demoProjectId}
          tasks={tasks}
          dependencies={dependencies}
          selection={selection}
          viewport={viewport}
          staffs={staffs}
          onDragStart={() => setIsDragInProgress(true)}
          onDragEnd={() => setIsDragInProgress(false)}
          onVerticalScaleChange={(s) => {
            setVerticalScale(s)
            dispatch({ type: 'viewport/setViewport', payload: { x: viewport.x, y: viewport.y, zoom: viewport.zoom } })
          }}
          onZoomChange={(z, anchorLocalX) => {
            const ppd0 = TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.0001, viewport.zoom)
            const ppd1 = TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.1, z)
            const anchorPxFromGrid = anchorLocalX - TIMELINE_CONFIG.LEFT_MARGIN
            const worldAtAnchor = viewport.x + (anchorPxFromGrid / ppd0)
            const newX = Math.max(0, worldAtAnchor - (anchorPxFromGrid / ppd1))
            dispatch({ type: 'viewport/setViewport', payload: { x: Math.round(newX), y: viewport.y, zoom: z } })
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
