import React, { useRef, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setSelection } from '@cadence/state'
import { TaskData, DependencyData, updateTask, createDependency } from '@cadence/crdt'
import { Staff } from '@cadence/core'
import './TimelineCanvas.css'

interface TimelineCanvasProps {
  projectId: string
  tasks: Record<string, TaskData>
  dependencies: Record<string, DependencyData>
  selection: string[]
  viewport: { x: number; y: number; zoom: number }
  staffs: Staff[]
  onDragStart?: () => void
  onDragEnd?: () => void
}

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  projectId,
  tasks,
  dependencies,
  selection,
  viewport,
  staffs,
  onDragStart,
  onDragEnd
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dispatch = useDispatch()
  const [editingChord, setEditingChord] = useState<string | null>(null)
  const [chordNameInput, setChordNameInput] = useState('')
  const [customChordNames, setCustomChordNames] = useState<Record<string, string>>({})
  const [editPosition, setEditPosition] = useState<{x: number, y: number} | null>(null)
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false)
  const [draggedTask, setDraggedTask] = useState<TaskData | null>(null)
  const [, setDragStartPos] = useState<{x: number, y: number} | null>(null)
  const [dragCurrentPos, setDragCurrentPos] = useState<{x: number, y: number} | null>(null)
  const [dragOffset, setDragOffset] = useState<{x: number, y: number}>({x: 0, y: 0})
  
  // Dependency creation state (right-click drag)
  const [isCreatingDependency, setIsCreatingDependency] = useState(false)
  const [dependencySourceTask, setDependencySourceTask] = useState<TaskData | null>(null)
  const [dependencyStartPos, setDependencyStartPos] = useState<{x: number, y: number} | null>(null)
  const [dependencyCurrentPos, setDependencyCurrentPos] = useState<{x: number, y: number} | null>(null)

  // Constants for consistent spacing
  const STAFF_LINE_SPACING = 18 // Space between lines within a staff (increased by 50%)

  // Dependency validation functions
  const getTaskEndDate = (task: TaskData): Date => {
    const startDate = new Date(task.startDate)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + task.durationDays)
    return endDate
  }

  const validateTaskPosition = (task: TaskData, newStartDate: string): boolean => {
    // Check if the new position would violate any dependencies
    const newStart = new Date(newStartDate)
    
    // Find all tasks that this task depends on
    const taskDependencies = Object.values(dependencies).filter(dep => dep.dstTaskId === task.id)
    
    for (const dependency of taskDependencies) {
      const sourceTask = tasks[dependency.srcTaskId]
      if (sourceTask) {
        const sourceEndDate = getTaskEndDate(sourceTask)
        if (newStart < sourceEndDate) {
          return false // Cannot start before dependency completes
        }
      }
    }
    
    return true
  }

  const createDependencyBetweenTasks = (task1: TaskData, task2: TaskData) => {
    // Determine direction based on start dates
    const start1 = new Date(task1.startDate)
    const start2 = new Date(task2.startDate)
    
    let sourceTask: TaskData
    let destinationTask: TaskData
    
    if (start1 <= start2) {
      sourceTask = task1
      destinationTask = task2
    } else {
      sourceTask = task2
      destinationTask = task1
    }

    // Check if dependency already exists
    const existingDep = Object.values(dependencies).find(dep => 
      dep.srcTaskId === sourceTask.id && dep.dstTaskId === destinationTask.id
    )
    
    if (existingDep) {
      console.log('Dependency already exists')
      return
    }

    // Create the dependency
    const depId = `dep-${Date.now()}`
    createDependency(projectId, {
      id: depId,
      srcTaskId: sourceTask.id,
      dstTaskId: destinationTask.id,
      type: 'finish_to_start'
    })
    
    // Validate and adjust destination task position if needed
    const sourceEndDate = getTaskEndDate(sourceTask)
    const destStartDate = new Date(destinationTask.startDate)
    
    if (destStartDate < sourceEndDate) {
      // Move destination task to start after source completes
      const newStartDate = sourceEndDate.toISOString().split('T')[0]
      updateTask(projectId, destinationTask.id, { startDate: newStartDate })
    }
  }

  // Drag handling functions
  const getDateFromX = (x: number): string => {
    const dayWidth = 60
    const leftMargin = 80
    const dayIndex = Math.round((x - leftMargin) / dayWidth)
    // Use UTC arithmetic to avoid timezone-induced off-by-one
    const utcDate = new Date(Date.UTC(2024, 0, 1 + dayIndex))
    return utcDate.toISOString().split('T')[0]
  }

  const getStaffFromY = (y: number): {staffId: string, staffLine: number} | null => {
    const staffSpacing = 120
    const staffStartY = 60

    for (let i = 0; i < staffs.length; i++) {
      const currentStaffY = staffStartY + i * staffSpacing
      const staff = staffs[i]
      const staffEndY = currentStaffY + (staff.numberOfLines - 1) * STAFF_LINE_SPACING

      if (y >= currentStaffY - STAFF_LINE_SPACING && y <= staffEndY + STAFF_LINE_SPACING) {
        // Calculate which line/space within this staff
        const relativeY = y - currentStaffY
        const staffLine = Math.round(relativeY / (STAFF_LINE_SPACING / 2))
        const clampedStaffLine = Math.max(0, Math.min(staffLine, (staff.numberOfLines - 1) * 2))
        
        return {
          staffId: staff.id,
          staffLine: clampedStaffLine
        }
      }
    }

    return null
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault() // Prevent context menu on right-click during drag
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const isRightClick = event.button === 2

    // Check for chord name clicks first (only on left-click)
    if (!isRightClick) {
      const clickedChordName = findChordNameAtPosition(x, y)
      if (clickedChordName) {
        handleChordNameEdit(clickedChordName, x, y)
        return
      }
    }

    // Find clicked task
    const clickedTask = findTaskAtPosition(x, y)
    
    if (clickedTask) {
      // Cancel any chord editing
      if (editingChord) {
        cancelChordNameEdit()
      }

      if (isRightClick) {
        // Start dependency creation
        setDependencySourceTask(clickedTask)
        setDependencyStartPos({x, y})
        setDependencyCurrentPos({x, y})
        setIsCreatingDependency(true)
        
        // Notify parent component that interaction started (to hide popup)
        onDragStart?.()
        
        // Select the source task
        dispatch(setSelection([clickedTask.id]))
      } else {
        // Left-click: Start regular dragging
        // Calculate offset from task start to mouse position
        const dayWidth = 60
        const leftMargin = 80
        const taskStartX = leftMargin + getTaskStartX(clickedTask.startDate) * dayWidth
        const taskY = getTaskYPosition(clickedTask)
        
        setDragOffset({
          x: x - taskStartX,
          y: y - taskY
        })
        
        // Start dragging
        setDraggedTask(clickedTask)
        setDragStartPos({x, y})
        setDragCurrentPos({x, y})
        setIsDragging(true)
        
        // Notify parent component that drag started
        onDragStart?.()
        
        // Select the task
        dispatch(setSelection([clickedTask.id]))
      }
    } else {
      // Cancel any operations and clear selection
      if (editingChord) {
        cancelChordNameEdit()
      }
      dispatch(setSelection([]))
    }
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    if (isDragging && draggedTask) {
      // Regular dragging
      setDragCurrentPos({x, y})
    } else if (isCreatingDependency && dependencySourceTask) {
      // Dependency creation
      setDependencyCurrentPos({x, y})
    }
  }

  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    if (isDragging && draggedTask) {
      // Handle regular drag completion
      // Calculate new position
      const adjustedX = x - dragOffset.x
      const adjustedY = y - dragOffset.y
      
      const newDate = getDateFromX(adjustedX)
      const staffInfo = getStaffFromY(adjustedY)

      if (staffInfo) {
        // Validate that the new position doesn't violate dependencies
        if (validateTaskPosition(draggedTask, newDate)) {
          // Update task with new position
          updateTask(projectId, draggedTask.id, {
            startDate: newDate,
            staffId: staffInfo.staffId,
            staffLine: staffInfo.staffLine
          })
        } else {
          // Flash red to indicate invalid position
          console.log('Cannot place task before its dependencies complete')
          // Could show a temporary error indicator here
        }
      }

      // Reset drag state
      setIsDragging(false)
      setDraggedTask(null)
      setDragStartPos(null)
      setDragCurrentPos(null)
      setDragOffset({x: 0, y: 0})
      
      // Notify parent component that drag ended
      onDragEnd?.()
    } else if (isCreatingDependency && dependencySourceTask) {
      // Handle dependency creation completion
      const targetTask = findTaskAtPosition(x, y)
      
      if (targetTask && targetTask.id !== dependencySourceTask.id) {
        // Create dependency between source and target
        createDependencyBetweenTasks(dependencySourceTask, targetTask)
      }
      
      // Reset dependency creation state
      setIsCreatingDependency(false)
      setDependencySourceTask(null)
      setDependencyStartPos(null)
      setDependencyCurrentPos(null)
      
      // Notify parent component that interaction ended
      onDragEnd?.()
    }
  }

  useEffect(() => {
    // Small delay to ensure container is properly sized
    setTimeout(() => {
      drawTimeline()
    }, 100)
  }, [tasks, dependencies, selection, viewport, customChordNames, editingChord, isDragging, dragCurrentPos, isCreatingDependency, dependencyCurrentPos])

  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        drawTimeline()
      }, 50)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Additional effect to redraw when component mounts
  useEffect(() => {
    setTimeout(() => {
      drawTimeline()
    }, 200)
  }, [])

  const drawDependencyCreationLine = (ctx: CanvasRenderingContext2D) => {
    if (!isCreatingDependency || !dependencyStartPos || !dependencyCurrentPos || !dependencySourceTask) return

    // Draw a line from source task to current mouse position
    const dayWidth = 60
    const leftMargin = 80
    
    // Calculate source task position - connect from the END of the source task
    // Use the SAME calculations as task drawing to ensure consistency
    const sourceStartX = leftMargin + getTaskStartX(dependencySourceTask.startDate) * dayWidth
    const sourceTaskWidth = Math.max(dependencySourceTask.durationDays * dayWidth - 8, 40)
    const sourceEndX = sourceStartX + sourceTaskWidth
    const sourceY = getTaskYPosition(dependencySourceTask)
    
    // Draw animated dependency line
    ctx.strokeStyle = '#10B981' // Green color for new dependency
    ctx.lineWidth = 3
    ctx.setLineDash([8, 4])
    
    // Animate the dash offset for a moving effect
    const time = Date.now() / 200
    ctx.lineDashOffset = -time % 12
    
    ctx.beginPath()
    ctx.moveTo(sourceEndX, sourceY)
    ctx.lineTo(dependencyCurrentPos.x, dependencyCurrentPos.y)
    ctx.stroke()
    
    // Draw arrowhead at mouse position
    const angle = Math.atan2(dependencyCurrentPos.y - sourceY, dependencyCurrentPos.x - sourceEndX)
    const arrowLength = 12
    
    ctx.fillStyle = '#10B981'
    ctx.beginPath()
    ctx.moveTo(dependencyCurrentPos.x, dependencyCurrentPos.y)
    ctx.lineTo(
      dependencyCurrentPos.x - arrowLength * Math.cos(angle - Math.PI / 6),
      dependencyCurrentPos.y - arrowLength * Math.sin(angle - Math.PI / 6)
    )
    ctx.lineTo(
      dependencyCurrentPos.x - arrowLength * Math.cos(angle + Math.PI / 6),
      dependencyCurrentPos.y - arrowLength * Math.sin(angle + Math.PI / 6)
    )
    ctx.closePath()
    ctx.fill()
    
    // Reset line dash
    ctx.setLineDash([])
    ctx.lineDashOffset = 0
    
    // Check if hovering over a valid target task
    const targetTask = findTaskAtPosition(dependencyCurrentPos.x, dependencyCurrentPos.y)
    if (targetTask && targetTask.id !== dependencySourceTask.id) {
      // Highlight the target task start (where dependency connects to)
      const targetStartX = leftMargin + getTaskStartX(targetTask.startDate) * dayWidth
      const targetY = getTaskYPosition(targetTask)
      const targetTaskWidth = Math.max(targetTask.durationDays * dayWidth - 8, 40)
      
      ctx.strokeStyle = '#10B981'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 2])
      ctx.strokeRect(targetStartX, targetY - 10, targetTaskWidth, 20)
      ctx.setLineDash([])
      
      // Draw a small connection indicator at the start of the target task
      ctx.fillStyle = '#10B981'
      ctx.beginPath()
      ctx.arc(targetStartX, targetY, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const drawDropZoneIndicator = (ctx: CanvasRenderingContext2D) => {
    if (!isDragging || !dragCurrentPos || !draggedTask) return

    const adjustedX = dragCurrentPos.x - dragOffset.x
    const adjustedY = dragCurrentPos.y - dragOffset.y
    
    const staffInfo = getStaffFromY(adjustedY)
    if (!staffInfo) return

    const dayWidth = 60
    const leftMargin = 80
    
    // Calculate snap position
    const newDate = getDateFromX(adjustedX)
    const snapX = leftMargin + getTaskStartX(newDate) * dayWidth
    
    // Find the staff Y position
    const staffSpacing = 120
    const staffStartY = 60
    const staffIndex = staffs.findIndex(staff => staff.id === staffInfo.staffId)
    if (staffIndex === -1) return
    
    const taskStaffStartY = staffStartY + staffIndex * staffSpacing
    const snapY = taskStaffStartY + (staffInfo.staffLine * STAFF_LINE_SPACING / 2)
    
    // Check if this position would violate dependencies
    const isValidPosition = validateTaskPosition(draggedTask, newDate)
    
    // Draw drop zone indicator with appropriate color
    ctx.strokeStyle = isValidPosition ? '#10B981' : '#EF4444' // Green for valid, red for invalid
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    
    // Draw a circle to indicate drop position
    ctx.beginPath()
    ctx.arc(snapX + 10, snapY, 8, 0, Math.PI * 2)
    ctx.stroke()
    
    // Draw vertical line to show date alignment
    ctx.beginPath()
    ctx.moveTo(snapX, 20)
    ctx.lineTo(snapX, ctx.canvas.height - 20)
    ctx.stroke()
    
    // Draw warning text for invalid positions
    if (!isValidPosition) {
      ctx.fillStyle = '#EF4444'
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('⚠️ Cannot place before dependency completes', snapX, snapY + 25)
      ctx.textAlign = 'start'
    }
    
    // Reset line dash
    ctx.setLineDash([])
  }

  const drawTimeline = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get the container size instead of the canvas element size
    const container = canvas.parentElement
    if (!container) return
    
    const containerRect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    // Set canvas size to fill the container
    canvas.width = containerRect.width * dpr
    canvas.height = containerRect.height * dpr
    canvas.style.width = containerRect.width + 'px'
    canvas.style.height = containerRect.height + 'px'
    
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, containerRect.width, containerRect.height)

    // Draw grid lines
    drawGrid(ctx, containerRect.width, containerRect.height)

    // Draw drop zone indicator
    drawDropZoneIndicator(ctx)
    
    // Draw dependency creation line
    drawDependencyCreationLine(ctx)

     // Detect and draw chord bars first (behind tasks)
     const chords = detectChords(tasks)
     chords.forEach(chord => {
       drawChordBar(ctx, chord)
       drawChordName(ctx, chord) // Draw chord name above first staff
     })

     // Draw tasks
     const taskCount = Object.keys(tasks).length
     console.log('Drawing', taskCount, 'tasks:', tasks)
     
     Object.entries(tasks).forEach(([taskId, task]) => {
       drawTask(ctx, task, selection.includes(taskId))
     })

     // Draw dependencies
     Object.entries(dependencies).forEach(([_, dependency]) => {
       drawDependency(ctx, dependency, tasks)
     })
  }

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const dayWidth = 60
    const leftMargin = 80
    const staffSpacing = 120 // Space between different staffs

    // Draw major vertical grid lines (measures)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 2
    for (let x = leftMargin; x < width; x += dayWidth * 7) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Draw minor vertical grid lines (days)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    for (let x = leftMargin; x < width; x += dayWidth) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Draw musical staffs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.lineWidth = 1

    let currentY = 60 // Starting Y position for first staff

    staffs.forEach((staff) => {
      const staffStartY = currentY
      
      // Draw staff lines
      for (let line = 0; line < staff.numberOfLines; line++) {
        const y = staffStartY + line * STAFF_LINE_SPACING
        ctx.beginPath()
        ctx.moveTo(leftMargin, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Draw staff label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.textAlign = 'right'
      const staffCenterY = staffStartY + ((staff.numberOfLines - 1) * STAFF_LINE_SPACING) / 2
      ctx.fillText(staff.name, leftMargin - 15, staffCenterY + 5)

      // Draw treble/bass clef (simple text representation)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.font = 'bold 20px serif'
      ctx.textAlign = 'center'
      if (staff.name.toLowerCase().includes('treble')) {
        ctx.fillText('𝄞', leftMargin + 15, staffCenterY + 7) // Treble clef
      } else if (staff.name.toLowerCase().includes('bass')) {
        ctx.fillText('𝄢', leftMargin + 15, staffCenterY + 7) // Bass clef
      } else {
        ctx.fillText('♪', leftMargin + 15, staffCenterY + 7) // Generic musical note
      }

      currentY += staffSpacing
    })

    ctx.textAlign = 'start'

    // Draw time axis
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const maxDays = Math.floor((width - leftMargin) / dayWidth)
    for (let i = 0; i < maxDays && i < 20; i++) {
      const x = leftMargin + i * dayWidth
      const date = new Date('2024-01-01')
      date.setDate(date.getDate() + i)
      ctx.fillText(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x + 5, 25)
    }
  }

  const getTaskYPosition = (task: TaskData): number => {
    const staffSpacing = 120
    const staffStartY = 60

    // Find the staff this task belongs to
    const staffIndex = staffs.findIndex(staff => staff.id === task.staffId)
    if (staffIndex === -1) {
      // Fallback to legacy laneIndex if staff not found
      return 40 + task.laneIndex * 80 + 40
    }

    // Calculate the Y position where this staff starts
    const taskStaffStartY = staffStartY + staffIndex * staffSpacing

    // Position on staff line/space system:
    // staffLine 0 = bottom line, 1 = first space, 2 = second line, 3 = second space, etc.
    // Each increment is STAFF_LINE_SPACING/2 to account for lines AND spaces
    const noteY = taskStaffStartY + (task.staffLine * STAFF_LINE_SPACING / 2)

    return noteY
  }

  const drawTask = (ctx: CanvasRenderingContext2D, task: TaskData, isSelected: boolean) => {
    const dayWidth = 60
    const taskHeight = 20 // Even smaller to fit precisely on staff lines
    const leftMargin = 80

    // Check if this task is being dragged
    const isBeingDragged = isDragging && draggedTask?.id === task.id
    
    let startX = leftMargin + getTaskStartX(task.startDate) * dayWidth
    let taskCenterY = getTaskYPosition(task)
    
    // If being dragged, use the current drag position
    if (isBeingDragged && dragCurrentPos) {
      startX = dragCurrentPos.x - dragOffset.x
      taskCenterY = dragCurrentPos.y - dragOffset.y
    }
    
    const taskWidth = Math.max(task.durationDays * dayWidth - 8, 40)
    const taskY = taskCenterY - taskHeight / 2
    
    // Check if this task has dependencies (for visual indicators)
    const hasDependents = Object.values(dependencies).some(dep => dep.srcTaskId === task.id)
    const hasDependencies = Object.values(dependencies).some(dep => dep.dstTaskId === task.id)

    // Task color based on status  
    let color = '#8B5CF6' // Default purple
    if (task.status === 'in_progress') color = '#C084FC'
    if (task.status === 'completed') color = '#10B981'
    if (task.status === 'blocked') color = '#EF4444'
    if (task.status === 'cancelled') color = '#6B7280'
    if (task.status === 'not_started') color = '#6366F1'

    // Visual feedback for dragging
    const opacity = isBeingDragged ? 0.7 : 1.0
    const shadowOpacity = isBeingDragged ? 0.4 : 0.2
    const shadowOffset = isBeingDragged ? 4 : 2

    // Draw task shadow
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`
    ctx.fillRect(startX + shadowOffset, taskY + shadowOffset, taskWidth, taskHeight)

    // Draw main task body with subtle note-inspired rounded left end
    const gradient = ctx.createLinearGradient(startX, taskY, startX, taskY + taskHeight)
    
    // Apply opacity to colors for dragged tasks
    const primaryColor = isSelected ? '#F59E0B' : color
    const secondaryColor = isSelected ? '#D97706' : shadeColor(color, -20)
    
    if (isBeingDragged) {
      ctx.globalAlpha = opacity
    }
    
    gradient.addColorStop(0, primaryColor)
    gradient.addColorStop(1, secondaryColor)
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    // Start with a rounded left end (note-inspired)
    ctx.moveTo(startX + taskHeight / 2, taskY)
    ctx.lineTo(startX + taskWidth - 4, taskY)
    ctx.quadraticCurveTo(startX + taskWidth, taskY, startX + taskWidth, taskY + 4)
    ctx.lineTo(startX + taskWidth, taskY + taskHeight - 4)
    ctx.quadraticCurveTo(startX + taskWidth, taskY + taskHeight, startX + taskWidth - 4, taskY + taskHeight)
    ctx.lineTo(startX + taskHeight / 2, taskY + taskHeight)
    ctx.arc(startX + taskHeight / 2, taskY + taskHeight / 2, taskHeight / 2, Math.PI / 2, -Math.PI / 2, false)
    ctx.closePath()
    ctx.fill()

    // Draw subtle note-inspired accent on the left (like a note head)
    ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.2)'
    ctx.beginPath()
    ctx.arc(startX + taskHeight / 2, taskY + taskHeight / 2, taskHeight / 2 - 2, 0, Math.PI * 2)
    ctx.fill()

    // Draw border
    ctx.strokeStyle = isSelected ? '#FCD34D' : 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = isSelected ? 2 : 1
    ctx.beginPath()
    ctx.moveTo(startX + taskHeight / 2, taskY)
    ctx.lineTo(startX + taskWidth - 4, taskY)
    ctx.quadraticCurveTo(startX + taskWidth, taskY, startX + taskWidth, taskY + 4)
    ctx.lineTo(startX + taskWidth, taskY + taskHeight - 4)
    ctx.quadraticCurveTo(startX + taskWidth, taskY + taskHeight, startX + taskWidth - 4, taskY + taskHeight)
    ctx.lineTo(startX + taskHeight / 2, taskY + taskHeight)
    ctx.arc(startX + taskHeight / 2, taskY + taskHeight / 2, taskHeight / 2, Math.PI / 2, -Math.PI / 2, false)
    ctx.closePath()
    ctx.stroke()

    // Add accidentals in the center of the circular left end
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const circleCenterX = startX + taskHeight / 2
    const circleCenterY = taskY + taskHeight / 2

    if (task.status === 'blocked') {
      ctx.fillStyle = 'white'
      ctx.font = 'bold 14px serif'
      ctx.fillText('♭', circleCenterX, circleCenterY)
    }

    if (task.status === 'completed') {
      ctx.fillStyle = 'white'
      ctx.font = 'bold 12px serif'
      ctx.fillText('♮', circleCenterX, circleCenterY)
    }

    if (task.status === 'in_progress') {
      ctx.fillStyle = 'white'
      ctx.font = 'bold 12px serif'
      ctx.fillText('♯', circleCenterX, circleCenterY)
    }

    if (task.status === 'cancelled') {
      ctx.fillStyle = 'white'
      ctx.font = 'bold 16px serif'
      ctx.fillText('𝄪', circleCenterX, circleCenterY)
    }

    // Reset text alignment
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'

    // Draw task title
    ctx.fillStyle = 'white'
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textBaseline = 'middle'
    const text = task.title
    const textWidth = ctx.measureText(text).width
    
    // Center text or truncate if too long
    const maxTextWidth = taskWidth - taskHeight - 16
    const textY = taskY + taskHeight / 2 // Perfect vertical center
    if (textWidth <= maxTextWidth) {
      ctx.fillText(text, startX + taskHeight + 8, textY)
    } else {
      // Truncate with ellipsis
      let truncatedText = text
      while (ctx.measureText(truncatedText + '...').width > maxTextWidth && truncatedText.length > 0) {
        truncatedText = truncatedText.slice(0, -1)
      }
      ctx.fillText(truncatedText + '...', startX + taskHeight + 8, textY)
    }

    // Duration indicator removed for cleaner display
    
    // Draw dependency connection indicators
    if (hasDependents && !isBeingDragged) {
      // Draw small circle at the end of the task to show outgoing dependencies
      const endX = startX + taskWidth
      ctx.fillStyle = '#8B5CF6'
      ctx.beginPath()
      ctx.arc(endX, taskCenterY, 3, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw small outward arrow
      ctx.strokeStyle = '#8B5CF6'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(endX + 2, taskCenterY)
      ctx.lineTo(endX + 6, taskCenterY)
      ctx.moveTo(endX + 4, taskCenterY - 2)
      ctx.lineTo(endX + 6, taskCenterY)
      ctx.lineTo(endX + 4, taskCenterY + 2)
      ctx.stroke()
    }
    
    if (hasDependencies && !isBeingDragged) {
      // Draw small circle at the start of the task to show incoming dependencies
      ctx.fillStyle = '#8B5CF6'
      ctx.beginPath()
      ctx.arc(startX, taskCenterY, 3, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw small inward arrow
      ctx.strokeStyle = '#8B5CF6'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(startX - 6, taskCenterY)
      ctx.lineTo(startX - 2, taskCenterY)
      ctx.moveTo(startX - 4, taskCenterY - 2)
      ctx.lineTo(startX - 2, taskCenterY)
      ctx.lineTo(startX - 4, taskCenterY + 2)
      ctx.stroke()
    }
    
    // Reset global alpha if we changed it
    if (isBeingDragged) {
      ctx.globalAlpha = 1.0
    }
  }

  const shadeColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace("#",""), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
  }

     const drawDependency = (ctx: CanvasRenderingContext2D, dependency: DependencyData, tasks: Record<string, TaskData>) => {
     const srcTask = tasks[dependency.srcTaskId]
     const dstTask = tasks[dependency.dstTaskId]

     if (!srcTask || !dstTask) return

     const dayWidth = 60
     const leftMargin = 80

     // Connect from the END of source task to the START of destination task
     // Use the SAME calculations as task drawing to ensure consistency
     const srcStartX = leftMargin + getTaskStartX(srcTask.startDate) * dayWidth
     const srcTaskWidth = Math.max(srcTask.durationDays * dayWidth - 8, 40)
     const srcEndX = srcStartX + srcTaskWidth
     const srcY = getTaskYPosition(srcTask)

     const dstStartX = leftMargin + getTaskStartX(dstTask.startDate) * dayWidth
     const dstY = getTaskYPosition(dstTask)
     
    // Draw musical tie/slur connection
    ctx.strokeStyle = '#8B5CF6'
    ctx.lineWidth = 2.5
    ctx.setLineDash([])
    
    ctx.beginPath()
    if (srcY === dstY) {
      // Same staff - draw a slur above the notes
      const slurY = srcY - 15
      ctx.moveTo(srcEndX, srcY - 5)
      ctx.quadraticCurveTo((srcEndX + dstStartX) / 2, slurY, dstStartX, dstY - 5)
    } else {
      // Different staffs - draw flowing connection
      const midX = (srcEndX + dstStartX) / 2
      const controlY = srcY < dstY ? Math.min(srcY, dstY) - 20 : Math.max(srcY, dstY) + 20
      ctx.moveTo(srcEndX, srcY)
      ctx.bezierCurveTo(midX, controlY, midX, controlY, dstStartX, dstY)
    }
    ctx.stroke()

    // Draw connection indicators
    ctx.fillStyle = '#8B5CF6'
    ctx.beginPath()
    ctx.arc(srcEndX, srcY, 3, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = '#8B5CF6'
    ctx.beginPath()
    ctx.arc(dstStartX, dstY, 3, 0, Math.PI * 2)
    ctx.fill()
  }

   const getTaskStartX = (startDate: string): number => {
     // Simple calculation: days since project start
     const projectStart = new Date('2024-01-01')
     const taskStart = new Date(startDate)
     return Math.max(0, Math.floor((taskStart.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)))
   }

   interface Chord {
  startDate: string
  tasks: TaskData[]
  name?: string
  id: string // Add unique ID for chord tracking
}

   const detectChords = (tasks: Record<string, TaskData>): Chord[] => {
     // Group tasks by start date and staff
     const tasksByDateAndStaff: Record<string, TaskData[]> = {}
     
     Object.values(tasks).forEach(task => {
       const key = `${task.startDate}-${task.staffId}`
       if (!tasksByDateAndStaff[key]) {
         tasksByDateAndStaff[key] = []
       }
       tasksByDateAndStaff[key].push(task)
     })
     
     // Also group all tasks by just start date for cross-staff chords
     const tasksByDate: Record<string, TaskData[]> = {}
     Object.values(tasks).forEach(task => {
       if (!tasksByDate[task.startDate]) {
         tasksByDate[task.startDate] = []
       }
       tasksByDate[task.startDate].push(task)
     })
     
     // Create chords for dates with multiple tasks (across all staffs)
     const chords: Chord[] = []
     Object.entries(tasksByDate).forEach(([startDate, tasksAtDate]) => {
       if (tasksAtDate.length > 1) {
         // Sort tasks by staff and then by staff line for consistent chord rendering
         tasksAtDate.sort((a, b) => {
           const staffAIndex = staffs.findIndex(s => s.id === a.staffId)
           const staffBIndex = staffs.findIndex(s => s.id === b.staffId)
           if (staffAIndex !== staffBIndex) {
             return staffAIndex - staffBIndex
           }
           return a.staffLine - b.staffLine
         })
         
         // Generate a chord name based on the tasks
         const generatedName = generateChordName(tasksAtDate)
         const chordId = `chord-${startDate}`
         const customName = customChordNames[chordId]
         
         chords.push({
           id: chordId,
           startDate,
           tasks: tasksAtDate,
           name: customName || generatedName
         })
       }
     })
     
     return chords
   }

   const generateChordName = (tasks: TaskData[]): string => {
     // Simple chord naming based on the number of tasks and their types
     const statusCount = tasks.reduce((acc, task) => {
       acc[task.status] = (acc[task.status] || 0) + 1
       return acc
     }, {} as Record<string, number>)
     
     const taskCount = tasks.length
     
     // Generate chord name based on dominant status and count
     const dominantStatus = Object.entries(statusCount).reduce((a, b) => 
       statusCount[a[0]] > statusCount[b[0]] ? a : b
     )[0]
     
     let chordName = ''
     if (taskCount === 2) chordName = 'Duo'
     else if (taskCount === 3) chordName = 'Triad'
     else if (taskCount === 4) chordName = 'Tetrad'
     else chordName = `${taskCount}-Note`
     
     // Add status modifier
     if (dominantStatus === 'completed') chordName += '♮'
     else if (dominantStatus === 'blocked') chordName += '♭'
     else if (dominantStatus === 'in_progress') chordName += '♯'
     else if (dominantStatus === 'cancelled') chordName += '𝄪'
     
     return chordName
   }

   const drawChordBar = (ctx: CanvasRenderingContext2D, chord: Chord) => {
     const dayWidth = 60
     const leftMargin = 80
     
     // Find the longest task duration to position the chord bar at the end
     const longestTask = chord.tasks.reduce((longest, task) => 
       task.durationDays > longest.durationDays ? task : longest
     )
     
     const startX = leftMargin + getTaskStartX(chord.startDate) * dayWidth
     const longestTaskWidth = Math.max(longestTask.durationDays * dayWidth - 8, 40)
     const chordX = startX + longestTaskWidth + 8 // Position at the end of the longest note
     
     // Find the top and bottom tasks using the new positioning system
     const topTask = chord.tasks.reduce((highest, task) => 
       getTaskYPosition(task) < getTaskYPosition(highest) ? task : highest
     )
     const bottomTask = chord.tasks.reduce((lowest, task) => 
       getTaskYPosition(task) > getTaskYPosition(lowest) ? task : lowest
     )
     
     const topY = getTaskYPosition(topTask)
     const bottomY = getTaskYPosition(bottomTask)
     
     // Draw chord bar (vertical line connecting the note ends)
     ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
     ctx.lineWidth = 4
     ctx.beginPath()
     ctx.moveTo(chordX, topY)
     ctx.lineTo(chordX, bottomY)
     ctx.stroke()
     
     // Draw decorative ends (small horizontal bars)
     ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
     ctx.fillRect(chordX - 2, topY - 2, 8, 4)
     ctx.fillRect(chordX - 2, bottomY - 2, 8, 4)
   }

   const drawChordName = (ctx: CanvasRenderingContext2D, chord: Chord) => {
     if (!chord.name) return

     const dayWidth = 60
     const leftMargin = 80
     
     // Find the longest task duration to position the chord bar at the end
     const longestTask = chord.tasks.reduce((longest, task) => 
       task.durationDays > longest.durationDays ? task : longest
     )
     
     const startX = leftMargin + getTaskStartX(chord.startDate) * dayWidth
     const longestTaskWidth = Math.max(longestTask.durationDays * dayWidth - 8, 40)
     const chordX = startX + longestTaskWidth + 8 // Position at the end of the longest note
     
     // Find the top task to position chord name above chord bar
     const topTask = chord.tasks.reduce((highest, task) => 
       getTaskYPosition(task) < getTaskYPosition(highest) ? task : highest
     )
     const topY = getTaskYPosition(topTask)
     
     // Position chord name above the chord bar
     const chordNameX = chordX
     const chordNameY = topY - 25
     
     // Draw chord name with interactive styling
     const isEditing = editingChord === chord.id
     ctx.fillStyle = isEditing ? 'rgba(139, 92, 246, 0.8)' : 'rgba(0, 0, 0, 0.6)'
     ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
     const textMetrics = ctx.measureText(chord.name)
     const textWidth = textMetrics.width
     const textHeight = 16
     
     // Draw background (slightly larger for clickable area)
     ctx.fillRect(chordNameX - textWidth / 2 - 4, chordNameY - textHeight / 2 - 2, 
                  textWidth + 8, textHeight + 4)
     
     // Draw chord name text
     ctx.fillStyle = isEditing ? 'white' : 'rgba(255, 255, 255, 0.95)'
     ctx.textAlign = 'center'
     ctx.textBaseline = 'middle'
     ctx.fillText(chord.name, chordNameX, chordNameY)
     
     // Draw edit cursor hint if hovering
     if (!isEditing) {
       ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
       ctx.font = '8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
       ctx.fillText('✏️', chordNameX + textWidth/2 + 8, chordNameY - 4)
     }
     
     // Reset text alignment
     ctx.textAlign = 'start'
     ctx.textBaseline = 'alphabetic'
   }

  const findChordNameAtPosition = (x: number, y: number): Chord | null => {
    const chords = detectChords(tasks)
    
    for (const chord of chords) {
      if (!chord.name) continue
      
      const dayWidth = 60
      const leftMargin = 80
      
      // Find the longest task duration to position the chord bar at the end
      const longestTask = chord.tasks.reduce((longest, task) => 
        task.durationDays > longest.durationDays ? task : longest
      )
      
      const startX = leftMargin + getTaskStartX(chord.startDate) * dayWidth
      const longestTaskWidth = Math.max(longestTask.durationDays * dayWidth - 8, 40)
      const chordX = startX + longestTaskWidth + 8
      
      // Find the top task to position chord name above chord bar
      const topTask = chord.tasks.reduce((highest, task) => 
        getTaskYPosition(task) < getTaskYPosition(highest) ? task : highest
      )
      const topY = getTaskYPosition(topTask)
      
      // Position chord name above the chord bar
      const chordNameX = chordX
      const chordNameY = topY - 25
      
      // Check if click is within chord name bounds
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) {
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        const textMetrics = ctx.measureText(chord.name)
        const textWidth = textMetrics.width
        const textHeight = 16
        
        if (x >= chordNameX - textWidth / 2 - 4 && 
            x <= chordNameX + textWidth / 2 + 4 &&
            y >= chordNameY - textHeight / 2 - 2 && 
            y <= chordNameY + textHeight / 2 + 2) {
          return chord
        }
      }
    }
    
    return null
  }

  const handleChordNameEdit = (chord: Chord, x: number, y: number) => {
    setEditingChord(chord.id)
    setChordNameInput(chord.name || '')
    setEditPosition({ x, y })
  }

  const saveChordName = () => {
    if (editingChord && chordNameInput.trim()) {
      setCustomChordNames(prev => ({
        ...prev,
        [editingChord]: chordNameInput.trim()
      }))
    }
    
    setEditingChord(null)
    setChordNameInput('')
    setEditPosition(null)
  }

  const cancelChordNameEdit = () => {
    setEditingChord(null)
    setChordNameInput('')
    setEditPosition(null)
  }



  const findTaskAtPosition = (x: number, y: number): TaskData | null => {
    const dayWidth = 60
    const taskHeight = 20 // Match the drawing height
    const leftMargin = 80

    for (const task of Object.values(tasks)) {
      const startX = leftMargin + getTaskStartX(task.startDate) * dayWidth
      const taskWidth = Math.max(task.durationDays * dayWidth - 8, 40)
      const taskCenterY = getTaskYPosition(task)
      const taskY = taskCenterY - taskHeight / 2

      // Check if click is within the task bounds (rounded rectangle with circular left end)
      const isInMainBody = x >= startX + taskHeight / 2 && x <= startX + taskWidth && 
                           y >= taskY && y <= taskY + taskHeight

      // Check circular left end
      const centerX = startX + taskHeight / 2
      const centerY = taskCenterY
      const radius = taskHeight / 2
      const dx = x - centerX
      const dy = y - centerY
      const isInCircularEnd = (dx * dx + dy * dy) <= (radius * radius)

      if (isInMainBody || isInCircularEnd) {
        return task
      }
    }
    return null
  }

  return (
    <div className="timeline-canvas-container">
      <canvas
        ref={canvasRef}
        className="timeline-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click context menu
        style={{ 
          cursor: isDragging 
            ? 'grabbing' 
            : isCreatingDependency 
            ? 'crosshair' 
            : 'grab' 
        }}
      />
      
      {/* Chord name editing input */}
      {editingChord && editPosition && (
        <input
          type="text"
          value={chordNameInput}
          onChange={(e) => setChordNameInput(e.target.value)}
          onBlur={saveChordName}
          onKeyPress={(e) => {
            if (e.key === 'Enter') saveChordName()
            if (e.key === 'Escape') cancelChordNameEdit()
          }}
          autoFocus
          style={{
            position: 'absolute',
            left: editPosition.x - 40,
            top: editPosition.y - 10,
            width: '80px',
            padding: '4px 8px',
            border: '2px solid #8B5CF6',
            borderRadius: '4px',
            background: '#333',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center',
            zIndex: 1000,
          }}
        />
      )}
    </div>
  )
}
