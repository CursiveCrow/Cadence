import React, { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, setActiveProject, initializeDefaultStaffs, setSelection } from '@cadence/state'
import { useProjectTasks, useProjectDependencies, createTask, createDependency } from '@cadence/crdt'
import { TaskStatus } from '@cadence/core'
import { TimelineCanvas } from './TimelineCanvas'
import { ProjectHeader } from './ProjectHeader'
import { TaskPopup } from './TaskPopup'
import './CadenceMain.css'

export const CadenceMain: React.FC = () => {
  const dispatch = useDispatch()
  const { activeProjectId, selection, viewport, staffs } = useSelector((state: RootState) => state.ui)
  
  // For now, create a demo project
  const demoProjectId = 'demo-project'
  const tasks = useProjectTasks(demoProjectId)
  const dependencies = useProjectDependencies(demoProjectId)
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [popupPosition, setPopupPosition] = useState<{x: number, y: number} | null>(null)
  const [isDragInProgress, setIsDragInProgress] = useState(false)

  // Calculate popup position based on selected task
  const calculatePopupPosition = useCallback((taskId: string) => {
    const task = tasks[taskId]
    if (!task) return null

    // Calculate task position on screen
    const dayWidth = 60
    const leftMargin = 80
    const staffSpacing = 120
    const staffStartY = 60

    // Find staff index
    const staffIndex = staffs.findIndex(staff => staff.id === task.staffId)
    if (staffIndex === -1) return null

    // Calculate X position (based on start date)
    const projectStart = new Date('2024-01-01')
    const taskStart = new Date(task.startDate)
    const dayIndex = Math.floor((taskStart.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
    const taskX = leftMargin + dayIndex * dayWidth

    // Calculate Y position (based on staff and line)
    const staffY = staffStartY + staffIndex * staffSpacing
    const STAFF_LINE_SPACING = 18
    const taskY = staffY + (task.staffLine * STAFF_LINE_SPACING / 2)

    // Convert to screen coordinates (approximate)
    return {
      x: taskX + 100, // Offset to avoid covering the task
      y: taskY - 50   // Offset above the task
    }
  }, [tasks, staffs])

  // Handle closing the popup
  const handleClosePopup = useCallback(() => {
    dispatch(setSelection([]))
    setPopupPosition(null)
  }, [dispatch])

  // Handle drag start/end from TimelineCanvas
  const handleDragStart = useCallback(() => {
    setIsDragInProgress(true)
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragInProgress(false)
  }, [])

  // Update popup position when selection changes
  useEffect(() => {
    if (selection.length > 0 && !isDragInProgress) {
      const position = calculatePopupPosition(selection[0])
      setPopupPosition(position)
    } else {
      setPopupPosition(null)
    }
  }, [selection, calculatePopupPosition, isDragInProgress])

  useEffect(() => {
    // Set the demo project as active on startup
    if (!activeProjectId) {
      dispatch(setActiveProject(demoProjectId))
      dispatch(initializeDefaultStaffs(demoProjectId))
    }
  }, [activeProjectId, dispatch])

  useEffect(() => {
    // Create demo tasks after a short delay to ensure Yjs is ready
    if (activeProjectId === demoProjectId && Object.keys(tasks).length === 0 && !isInitialized) {
      setTimeout(() => {
        createDemoData()
        setIsInitialized(true)
      }, 100)
    }
  }, [activeProjectId, tasks, isInitialized])

  const createDemoData = () => {
    // Create some sample tasks to match the mockup
    createTask(demoProjectId, {
      id: 'task-1',
      title: 'Intro Theme',
      startDate: '2024-01-01',
      durationDays: 3,
      status: TaskStatus.IN_PROGRESS.toString(),
      staffId: 'staff-treble',
      staffLine: 4, // Middle line of treble staff (3rd line)
      laneIndex: 0, // Backward compatibility
    })

    createTask(demoProjectId, {
      id: 'task-2', 
      title: 'Main Melody',
      startDate: '2024-01-03',
      durationDays: 4,
      status: TaskStatus.NOT_STARTED.toString(),
      staffId: 'staff-treble',
      staffLine: 8, // Top line of treble staff (5th line)
      laneIndex: 0, // Backward compatibility
    })

    createTask(demoProjectId, {
      id: 'task-3',
      title: 'Bass Line', 
      startDate: '2024-01-02',
      durationDays: 3,
      status: TaskStatus.IN_PROGRESS.toString(),
      staffId: 'staff-bass',
      staffLine: 0, // Bottom line of bass staff
      laneIndex: 1, // Backward compatibility
    })

    createTask(demoProjectId, {
      id: 'task-4',
      title: 'Harmony Section', 
      startDate: '2024-01-05',
      durationDays: 2,
      status: TaskStatus.NOT_STARTED.toString(),
      staffId: 'staff-bass',
      staffLine: 4, // Middle line of bass staff (3rd line)
      laneIndex: 1, // Backward compatibility
    })

    createTask(demoProjectId, {
      id: 'task-5',
      title: 'Bridge', 
      startDate: '2024-01-04',
      durationDays: 2,
      status: TaskStatus.COMPLETED.toString(),
      staffId: 'staff-treble',
      staffLine: 2, // Second line of treble staff
      laneIndex: 2, // Backward compatibility
    })

    createTask(demoProjectId, {
      id: 'task-6',
      title: 'Solo Section', 
      startDate: '2024-01-07',
      durationDays: 3,
      status: TaskStatus.BLOCKED.toString(),
      staffId: 'staff-treble',
      staffLine: 6, // Space above middle line (treble staff)
      laneIndex: 0, // Backward compatibility
    })

    // Create a chord (multiple notes starting at same time)
    createTask(demoProjectId, {
      id: 'task-7',
      title: 'Harmony Part A', 
      startDate: '2024-01-10',
      durationDays: 2,
      status: TaskStatus.IN_PROGRESS.toString(),
      staffId: 'staff-treble',
      staffLine: 6, // Space above middle line (treble staff)
      laneIndex: 0, // Backward compatibility
    })

    createTask(demoProjectId, {
      id: 'task-8',
      title: 'Harmony Part B', 
      startDate: '2024-01-10',
      durationDays: 2,
      status: TaskStatus.IN_PROGRESS.toString(),
      staffId: 'staff-treble',
      staffLine: 2, // Second line of treble staff
      laneIndex: 1, // Backward compatibility
    })

    createTask(demoProjectId, {
      id: 'task-9',
      title: 'Harmony Part C', 
      startDate: '2024-01-10',
      durationDays: 2,
      status: TaskStatus.COMPLETED.toString(),
      staffId: 'staff-bass',
      staffLine: 4, // Middle line of bass staff (3rd line)
      laneIndex: 2, // Backward compatibility
    })

    // Create another chord (blocked tasks)
    createTask(demoProjectId, {
      id: 'task-10',
      title: 'Finale Upper', 
      startDate: '2024-01-13',
      durationDays: 1,
      status: TaskStatus.BLOCKED.toString(),
      staffId: 'staff-treble',
      staffLine: 8, // Top line of treble staff (5th line)
      laneIndex: 0, // Backward compatibility
    })

    createTask(demoProjectId, {
      id: 'task-11',
      title: 'Finale Lower', 
      startDate: '2024-01-13',
      durationDays: 1,
      status: TaskStatus.BLOCKED.toString(),
      staffId: 'staff-bass',
      staffLine: 0, // Bottom line of bass staff
      laneIndex: 2, // Backward compatibility
    })

    // Create a cancelled task
    createTask(demoProjectId, {
      id: 'task-12',
      title: 'Dropped Feature', 
      startDate: '2024-01-06',
      durationDays: 1,
      status: 'cancelled', // Using string directly since TaskStatus.CANCELLED might not exist
      staffId: 'staff-bass',
      staffLine: 2, // Second line of bass staff
      laneIndex: 1, // Backward compatibility
    })

    // Add some dependencies
    setTimeout(() => {
      createDependency(demoProjectId, {
        id: 'dep-1',
        srcTaskId: 'task-1',
        dstTaskId: 'task-2',
        type: 'finish_to_start'
      })

      createDependency(demoProjectId, {
        id: 'dep-2', 
        srcTaskId: 'task-3',
        dstTaskId: 'task-4',
        type: 'finish_to_start'
      })
    }, 200)
  }

  const addNewTask = () => {
    const taskId = `task-${Date.now()}`
    
    // Choose a random staff and line
    const randomStaff = staffs[Math.floor(Math.random() * staffs.length)] || staffs[0]
    const randomLine = Math.floor(Math.random() * (randomStaff?.numberOfLines * 2 - 1 || 9)) // Lines and spaces
    
    const newTask = {
      id: taskId,
      title: 'New Note',
      startDate: '2024-01-08',
      durationDays: 2,
      status: TaskStatus.NOT_STARTED.toString(),
      staffId: randomStaff?.id || 'staff-treble',
      staffLine: randomLine,
      laneIndex: Math.floor(Math.random() * 3), // Random lane 0-2 (backward compatibility)
    }
    
    console.log('Creating new task:', newTask)
    createTask(demoProjectId, newTask)
  }

  return (
    <div className="cadence-main">
      <ProjectHeader 
        projectName="Score Name"
        onAddTask={addNewTask}
      />
      
      <div className="cadence-content">
        <div className="timeline-container full-width">
          <TimelineCanvas 
            projectId={demoProjectId}
            tasks={tasks}
            dependencies={dependencies}
            selection={selection}
            viewport={viewport}
            staffs={staffs}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
          <div className="measure-label">
            Measure Name
          </div>
        </div>
      </div>

      {/* Task popup - shows when a note is selected */}
      {selection.length > 0 && popupPosition && (
        <TaskPopup 
          projectId={demoProjectId}
          selectedTaskIds={selection}
          position={popupPosition}
          onClose={handleClosePopup}
        />
      )}
    </div>
  )
}
