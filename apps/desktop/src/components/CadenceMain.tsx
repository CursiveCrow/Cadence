import React, { useEffect, useState, useCallback } from 'react'
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
            topMargin={TIMELINE_CONFIG.TOP_MARGIN}
            staffSpacing={TIMELINE_CONFIG.STAFF_SPACING}
            staffLineSpacing={TIMELINE_CONFIG.STAFF_LINE_SPACING}
            onAddNote={addNewTask}
            onOpenMenu={() => {
              const el = document.querySelector('.menu-btn') as HTMLButtonElement | null
              if (el) el.click()
            }}
          />
        </div>
        <div className="vertical-resizer" ref={resizerRef} onMouseDown={beginResize} onDoubleClick={resetSidebarWidth} />
        <div className="main-column">
          <UIDateHeader viewport={viewport} projectStart={PROJECT_START_DATE} leftMargin={TIMELINE_CONFIG.LEFT_MARGIN} dayWidth={TIMELINE_CONFIG.DAY_WIDTH} />
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
        />
      )}
      <StaffManager isOpen={showStaffManager} onClose={() => setShowStaffManager(false)} />
    </div>
  )
}
