import React, { useRef, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setSelection } from '@cadence/state'
import { TaskData, DependencyData } from '@cadence/crdt'
import { Staff } from '@cadence/core'
import './TimelineCanvas.css'

interface TimelineCanvasProps {
  projectId: string
  tasks: Record<string, TaskData>
  dependencies: Record<string, DependencyData>
  selection: string[]
  viewport: { x: number; y: number; zoom: number }
  staffs: Staff[]
}

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  tasks,
  dependencies,
  selection,
  viewport,
  staffs
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dispatch = useDispatch()
  const [editingChord, setEditingChord] = useState<string | null>(null)
  const [chordNameInput, setChordNameInput] = useState('')
  const [customChordNames, setCustomChordNames] = useState<Record<string, string>>({})
  const [editPosition, setEditPosition] = useState<{x: number, y: number} | null>(null)

  // Constants for consistent spacing
  const STAFF_LINE_SPACING = 18 // Space between lines within a staff (increased by 50%)

  useEffect(() => {
    // Small delay to ensure container is properly sized
    setTimeout(() => {
      drawTimeline()
    }, 100)
  }, [tasks, dependencies, selection, viewport, customChordNames, editingChord])

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

     // Detect and draw chord bars first (behind tasks)
     const chords = detectChords(tasks)
     chords.forEach(chord => {
       drawChordBar(ctx, chord, containerRect.width)
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

    staffs.forEach((staff, staffIndex) => {
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

    const startX = leftMargin + getTaskStartX(task.startDate) * dayWidth
    const taskWidth = Math.max(task.durationDays * dayWidth - 8, 120)
    const taskCenterY = getTaskYPosition(task)
    const taskY = taskCenterY - taskHeight / 2

    // Task color based on status  
    let color = '#8B5CF6' // Default purple
    if (task.status === 'in_progress') color = '#C084FC'
    if (task.status === 'completed') color = '#10B981'
    if (task.status === 'blocked') color = '#EF4444'
    if (task.status === 'cancelled') color = '#6B7280'
    if (task.status === 'not_started') color = '#6366F1'

    // Draw task shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.fillRect(startX + 2, taskY + 2, taskWidth, taskHeight)

    // Draw main task body with subtle note-inspired rounded left end
    const gradient = ctx.createLinearGradient(startX, taskY, startX, taskY + taskHeight)
    gradient.addColorStop(0, isSelected ? '#F59E0B' : color)
    gradient.addColorStop(1, isSelected ? '#D97706' : shadeColor(color, -20))
    
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

     const srcX = leftMargin + (getTaskStartX(srcTask.startDate) + srcTask.durationDays) * dayWidth
     const srcY = getTaskYPosition(srcTask)

     const dstX = leftMargin + getTaskStartX(dstTask.startDate) * dayWidth
     const dstY = getTaskYPosition(dstTask)

    // Draw musical tie/slur connection
    ctx.strokeStyle = '#8B5CF6'
    ctx.lineWidth = 2.5
    ctx.setLineDash([])
    
    ctx.beginPath()
    if (srcY === dstY) {
      // Same staff - draw a slur above the notes
      const slurY = srcY - 15
      ctx.moveTo(srcX, srcY - 5)
      ctx.quadraticCurveTo((srcX + dstX) / 2, slurY, dstX - 15, dstY - 5)
    } else {
      // Different staffs - draw flowing connection
      const midX = (srcX + dstX) / 2
      const controlY = srcY < dstY ? Math.min(srcY, dstY) - 20 : Math.max(srcY, dstY) + 20
      ctx.moveTo(srcX, srcY)
      ctx.bezierCurveTo(midX, controlY, midX, controlY, dstX - 15, dstY)
    }
    ctx.stroke()

    // Draw small note symbol at the end instead of arrow
    ctx.fillStyle = '#8B5CF6'
    ctx.beginPath()
    ctx.ellipse(dstX - 12, dstY, 3, 2, 0, 0, Math.PI * 2)
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

   const drawChordBar = (ctx: CanvasRenderingContext2D, chord: Chord, canvasWidth: number) => {
     const dayWidth = 60
     const leftMargin = 80
     
     // Find the longest task duration to position the chord bar at the end
     const longestTask = chord.tasks.reduce((longest, task) => 
       task.durationDays > longest.durationDays ? task : longest
     )
     
     const startX = leftMargin + getTaskStartX(chord.startDate) * dayWidth
     const longestTaskWidth = Math.max(longestTask.durationDays * dayWidth - 8, 120)
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
     const longestTaskWidth = Math.max(longestTask.durationDays * dayWidth - 8, 120)
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
      const longestTaskWidth = Math.max(longestTask.durationDays * dayWidth - 8, 120)
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

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Check for chord name clicks first
    const clickedChordName = findChordNameAtPosition(x, y)
    if (clickedChordName) {
      handleChordNameEdit(clickedChordName, x, y)
      return
    }

    // Find clicked task
    const clickedTask = findTaskAtPosition(x, y)
    
    if (clickedTask) {
      // Cancel any chord editing
      if (editingChord) {
        cancelChordNameEdit()
      }
      
      if (event.ctrlKey || event.metaKey) {
        // Multi-select
        const newSelection = selection.includes(clickedTask.id)
          ? selection.filter(id => id !== clickedTask.id)
          : [...selection, clickedTask.id]
        dispatch(setSelection(newSelection))
      } else {
        // Single select
        dispatch(setSelection([clickedTask.id]))
      }
    } else {
      // Cancel any chord editing and clear selection
      if (editingChord) {
        cancelChordNameEdit()
      }
      dispatch(setSelection([]))
    }
  }

  const findTaskAtPosition = (x: number, y: number): TaskData | null => {
    const dayWidth = 60
    const taskHeight = 20 // Match the drawing height
    const leftMargin = 80

    for (const task of Object.values(tasks)) {
      const startX = leftMargin + getTaskStartX(task.startDate) * dayWidth
      const taskWidth = Math.max(task.durationDays * dayWidth - 8, 120)
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
        onClick={handleCanvasClick}
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
