import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, setActiveProject } from '@cadence/state'
import { useProjectTasks, useProjectDependencies, createTask, createDependency } from '@cadence/crdt'
import { TaskStatus } from '@cadence/core'
import { TimelineCanvas } from './TimelineCanvas'
import { ProjectHeader } from './ProjectHeader'
import { TaskPanel } from './TaskPanel'
import './CadenceMain.css'

export const CadenceMain: React.FC = () => {
  const dispatch = useDispatch()
  const { activeProjectId, selection, viewport } = useSelector((state: RootState) => state.ui)
  
  // For now, create a demo project
  const demoProjectId = 'demo-project'
  const tasks = useProjectTasks(demoProjectId)
  const dependencies = useProjectDependencies(demoProjectId)
  const [isInitialized, setIsInitialized] = React.useState(false)

  useEffect(() => {
    // Set the demo project as active on startup
    if (!activeProjectId) {
      dispatch(setActiveProject(demoProjectId))
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
      laneIndex: 0,
    })

    createTask(demoProjectId, {
      id: 'task-2', 
      title: 'Main Melody',
      startDate: '2024-01-03',
      durationDays: 4,
      status: TaskStatus.NOT_STARTED.toString(),
      laneIndex: 0,
    })

    createTask(demoProjectId, {
      id: 'task-3',
      title: 'Bass Line', 
      startDate: '2024-01-02',
      durationDays: 3,
      status: TaskStatus.IN_PROGRESS.toString(),
      laneIndex: 1,
    })

    createTask(demoProjectId, {
      id: 'task-4',
      title: 'Harmony Section', 
      startDate: '2024-01-05',
      durationDays: 2,
      status: TaskStatus.NOT_STARTED.toString(),
      laneIndex: 1,
    })

    createTask(demoProjectId, {
      id: 'task-5',
      title: 'Bridge', 
      startDate: '2024-01-04',
      durationDays: 2,
      status: TaskStatus.COMPLETED.toString(),
      laneIndex: 2,
    })

    createTask(demoProjectId, {
      id: 'task-6',
      title: 'Solo Section', 
      startDate: '2024-01-07',
      durationDays: 3,
      status: TaskStatus.BLOCKED.toString(),
      laneIndex: 0,
    })

    // Create a chord (multiple notes starting at same time)
    createTask(demoProjectId, {
      id: 'task-7',
      title: 'Harmony Part A', 
      startDate: '2024-01-10',
      durationDays: 2,
      status: TaskStatus.IN_PROGRESS.toString(),
      laneIndex: 0,
    })

    createTask(demoProjectId, {
      id: 'task-8',
      title: 'Harmony Part B', 
      startDate: '2024-01-10',
      durationDays: 2,
      status: TaskStatus.IN_PROGRESS.toString(),
      laneIndex: 1,
    })

    createTask(demoProjectId, {
      id: 'task-9',
      title: 'Harmony Part C', 
      startDate: '2024-01-10',
      durationDays: 2,
      status: TaskStatus.COMPLETED.toString(),
      laneIndex: 2,
    })

    // Create another chord (blocked tasks)
    createTask(demoProjectId, {
      id: 'task-10',
      title: 'Finale Upper', 
      startDate: '2024-01-13',
      durationDays: 1,
      status: TaskStatus.BLOCKED.toString(),
      laneIndex: 0,
    })

    createTask(demoProjectId, {
      id: 'task-11',
      title: 'Finale Lower', 
      startDate: '2024-01-13',
      durationDays: 1,
      status: TaskStatus.BLOCKED.toString(),
      laneIndex: 2,
    })

    // Create a cancelled task
    createTask(demoProjectId, {
      id: 'task-12',
      title: 'Dropped Feature', 
      startDate: '2024-01-06',
      durationDays: 1,
      status: 'cancelled', // Using string directly since TaskStatus.CANCELLED might not exist
      laneIndex: 1,
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
    const newTask = {
      id: taskId,
      title: 'New Note',
      startDate: '2024-01-08',
      durationDays: 2,
      status: TaskStatus.NOT_STARTED.toString(),
      laneIndex: Math.floor(Math.random() * 3), // Random lane 0-2
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
        <div className="timeline-container">
          <TimelineCanvas 
            projectId={demoProjectId}
            tasks={tasks}
            dependencies={dependencies}
            selection={selection}
            viewport={viewport}
          />
          <div className="measure-label">
            Measure Name
          </div>
        </div>
        
        {selection.length > 0 && (
          <TaskPanel 
            projectId={demoProjectId}
            selectedTaskIds={selection}
          />
        )}
      </div>
    </div>
  )
}
