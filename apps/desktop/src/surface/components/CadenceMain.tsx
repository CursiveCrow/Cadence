import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@cadence/state'
import { makeSelectSelectedTask, selectTasksByProject, selectDependenciesByProject } from '@cadence/state'
import { upsertTask, updateTask as rdxUpdateTask, upsertDependency } from '@cadence/state'
import { TaskStatus, Task, Dependency, Staff } from '@cadence/core'
import { ProjectHeader as UIProjectHeader } from '@cadence/ui'
import { StaffManager } from './StaffManager'
import { TaskDetails } from './TaskDetails'
import { useDemoProject } from '../hooks/useDemoProject'
import { useTaskPopupPosition } from '../hooks/useTaskPopupPosition'
import { Sidebar } from './Sidebar'
import { TimelineView } from './TimelineView'
import { TIMELINE_CONFIG } from '@cadence/renderer'
import { setVerticalScale, setSelection, updateStaff, setViewport, updateViewport } from '@cadence/state'
import { TimelineContext } from '../context/TimelineContext'
import '../styles/CadenceMain.css'

export interface RendererViewProps {
  projectId: string
  tasks: Record<string, Task>
  dependencies: Record<string, Dependency>
  selection: string[]
  viewport: { x: number; y: number; zoom: number }
  staffs: Staff[]
  verticalScale?: number
  onSelect: (ids: string[]) => void
  onViewportChange: (v: { x: number; y: number; zoom: number }) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  onUpdateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void
  onCreateDependency: (projectId: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: any }) => void
  onVerticalScaleChange?: (scale: number) => void
  className?: string
}

export interface CadenceMainProps { RendererView: React.ComponentType<RendererViewProps> }

export const CadenceMain: React.FC<CadenceMainProps> = ({ RendererView }) => {
  const dispatch = useDispatch()
  const selection = useSelector((state: RootState) => state.selection.ids)
  const viewport = useSelector((state: RootState) => state.viewport)
  const staffs = useSelector((state: RootState) => state.staffs.list)
  const verticalScaleValue = useSelector((state: RootState) => state.verticalScale)
  const verticalZoomSession = useRef<{ startZoom: number; startViewportY: number; anchorPx: number } | null>(null)

  const { demoProjectId } = useDemoProject()
  const tasks = useSelector(selectTasksByProject(demoProjectId))
  const dependenciesData = useSelector(selectDependenciesByProject(demoProjectId))
  const [popupPosition, setPopupPosition] = useState<{ x: number, y: number } | null>(null)
  const [isDragInProgress, setIsDragInProgress] = useState(false)
  const [showStaffManager, setShowStaffManager] = useState(false)
  const { calculatePopupPosition } = useTaskPopupPosition(tasks)

  const selectSelectedTask = React.useMemo(() => makeSelectSelectedTask(), [])
  const selectedTask = useSelector((state: RootState) => selectSelectedTask(state, demoProjectId))

  const handleClosePopup = useCallback(() => { dispatch(setSelection([])); setPopupPosition(null) }, [dispatch])

  useEffect(() => {
    if (selection.length > 0 && !isDragInProgress) {
      const last = (window as any).__CADENCE_LAST_SELECT_POS as { x: number; y: number } | undefined
      if (last && Number.isFinite(last.x) && Number.isFinite(last.y)) setPopupPosition({ x: last.x, y: last.y })
      else setPopupPosition(calculatePopupPosition(selection[0]))
    } else setPopupPosition(null)
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
    dispatch(upsertTask({ projectId: demoProjectId, task: newTask }))
  }

  const handleUpdateTask = (updates: Partial<Task>) => { if (selectedTask) dispatch(rdxUpdateTask({ projectId: demoProjectId, taskId: selectedTask.id, updates })) }

  const dependencies: Record<string, Dependency> = dependenciesData

  return (
    <div className="cadence-main">
      <UIProjectHeader projectName="Score Name" onOpenStaffManager={() => setShowStaffManager(true)} />
      <div className="cadence-content">
        <Sidebar
          staffs={staffs}
          viewport={viewport}
          verticalScale={verticalScaleValue}
          onAddNote={addNewTask}
          onOpenMenu={() => { const el = document.querySelector('.menu-btn') as HTMLButtonElement | null; if (el) el.click() }}
          onVerticalZoomChange={(newZoom, anchorLocalY, startZoom) => {
            const header = 32
            const s1 = Math.max(0.5, Math.min(3, newZoom))
            if (!verticalZoomSession.current || verticalZoomSession.current.startZoom !== startZoom) {
              verticalZoomSession.current = { startZoom: startZoom || verticalScaleValue || 1, startViewportY: viewport.y, anchorPx: Math.max(0, anchorLocalY - header) }
            }
            const s0 = verticalZoomSession.current.startZoom
            const startY = verticalZoomSession.current.startViewportY
            const anchorPx = verticalZoomSession.current.anchorPx
            const ratio = s1 / s0
            const newY = Math.max(0, Math.round(ratio * startY + (ratio - 1) * anchorPx))
            dispatch(setVerticalScale(s1))
            dispatch(setViewport({ x: viewport.x, y: newY, zoom: viewport.zoom }))
          }}
          onChangeTimeSignature={(staffId, timeSignature) => { dispatch(updateStaff({ id: staffId, updates: { timeSignature } as any })) }}
        />
        <TimelineContext.Provider value={{
          onSelect: (ids) => dispatch(setSelection(ids)),
          onViewportChange: (v) => dispatch(updateViewport(v)),
          onDragStart: () => setIsDragInProgress(true),
          onDragEnd: () => setIsDragInProgress(false),
          onUpdateTask: (pid, id, updates) => dispatch(rdxUpdateTask({ projectId: pid, taskId: id, updates })),
          onCreateDependency: (pid, dep) => dispatch(upsertDependency({ projectId: pid, dependency: dep as any })),
          onVerticalScaleChange: (s) => { dispatch(setVerticalScale(s)); dispatch(setViewport({ x: viewport.x, y: viewport.y, zoom: viewport.zoom })) },
        }}>
          <TimelineView
            RendererView={RendererView}
            projectId={demoProjectId}
            tasks={tasks}
            dependencies={dependencies}
            selection={selection}
            viewport={viewport}
            staffs={staffs}
            verticalScale={verticalScaleValue}
            onZoomChange={(z, anchorLocalX) => {
              const ppd0 = TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.0001, viewport.zoom)
              const ppd1 = TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.1, z)
              const anchorPxFromGrid = anchorLocalX - TIMELINE_CONFIG.LEFT_MARGIN
              const worldAtAnchor = viewport.x + (anchorPxFromGrid / ppd0)
              const newX = Math.max(0, worldAtAnchor - (anchorPxFromGrid / ppd1))
              dispatch(setViewport({ x: Math.round(newX), y: viewport.y, zoom: z }))
            }}
          />
        </TimelineContext.Provider>
      </div>
      {selectedTask && popupPosition && (
        <TaskDetails task={selectedTask} staffs={staffs} selectionCount={selection.length} position={popupPosition} onClose={handleClosePopup} onUpdateTask={handleUpdateTask} />
      )}
      <StaffManager isOpen={showStaffManager} onClose={() => setShowStaffManager(false)} />
    </div>
  )
}
