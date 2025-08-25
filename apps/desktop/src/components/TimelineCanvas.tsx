import React, { useRef, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setSelection } from '@cadence/state'
import { TaskData, DependencyData } from '@cadence/crdt'
import './TimelineCanvas.css'

interface TimelineCanvasProps {
  projectId: string
  tasks: Record<string, TaskData>
  dependencies: Record<string, DependencyData>
  selection: string[]
  viewport: { x: number; y: number; zoom: number }
}

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  tasks,
  dependencies,
  selection,
  viewport
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dispatch = useDispatch()

  useEffect(() => {
    // Small delay to ensure container is properly sized
    setTimeout(() => {
      drawTimeline()
    }, 100)
  }, [tasks, dependencies, selection, viewport])

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
    const laneHeight = 80
    const leftMargin = 80

    // Draw major vertical grid lines (weeks)
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

    // Draw horizontal staff lines (lanes) - make them look like musical staff
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1.5
    for (let y = 40; y < height; y += laneHeight) {
      // Draw the main staff line
      ctx.beginPath()
      ctx.moveTo(0, y + laneHeight / 2)
      ctx.lineTo(width, y + laneHeight / 2)
      ctx.stroke()
      
      // Add lighter guide lines above and below
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(leftMargin, y + laneHeight / 4)
      ctx.lineTo(width, y + laneHeight / 4)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(leftMargin, y + (3 * laneHeight) / 4)
      ctx.lineTo(width, y + (3 * laneHeight) / 4)
      ctx.stroke()
      
      // Reset stroke for next main line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1.5
    }

    // Draw musical staff labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'right'
    const staffLabels = ['Treble', 'Alto', 'Bass', 'Percussion', 'Harmony', 'Melody']
    for (let i = 0; i < Math.floor((height - 40) / laneHeight); i++) {
      const y = 40 + i * laneHeight + laneHeight / 2
      const label = staffLabels[i] || `Staff ${i + 1}`
      ctx.fillText(label, leftMargin - 10, y)
    }
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

  const drawTask = (ctx: CanvasRenderingContext2D, task: TaskData, isSelected: boolean) => {
    const dayWidth = 60
    const laneHeight = 80
    const taskHeight = 36
    const leftMargin = 80

    const startX = leftMargin + getTaskStartX(task.startDate) * dayWidth
    const taskWidth = Math.max(task.durationDays * dayWidth - 8, 120)
    const taskY = 40 + task.laneIndex * laneHeight + (laneHeight - taskHeight) / 2

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
      ctx.font = 'bold 18px serif'
      ctx.fillText('♭', circleCenterX, circleCenterY)
    }

    if (task.status === 'completed') {
      ctx.fillStyle = 'white'
      ctx.font = 'bold 16px serif'
      ctx.fillText('♮', circleCenterX, circleCenterY)
    }

    if (task.status === 'in_progress') {
      ctx.fillStyle = 'white'
      ctx.font = 'bold 16px serif'
      ctx.fillText('♯', circleCenterX, circleCenterY)
    }

    if (task.status === 'cancelled') {
      ctx.fillStyle = 'white'
      ctx.font = 'bold 24px serif'
      ctx.fillText('𝄪', circleCenterX, circleCenterY)
    }

    // Reset text alignment
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'

    // Draw task title
    ctx.fillStyle = 'white'
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textBaseline = 'middle'
    const text = task.title
    const textWidth = ctx.measureText(text).width
    
    // Center text or truncate if too long
    const maxTextWidth = taskWidth - taskHeight - 16
    if (textWidth <= maxTextWidth) {
      ctx.fillText(text, startX + taskHeight + 8, taskY + taskHeight / 2 - 2)
    } else {
      // Truncate with ellipsis
      let truncatedText = text
      while (ctx.measureText(truncatedText + '...').width > maxTextWidth && truncatedText.length > 0) {
        truncatedText = truncatedText.slice(0, -1)
      }
      ctx.fillText(truncatedText + '...', startX + taskHeight + 8, taskY + taskHeight / 2 - 2)
    }

    // Draw duration indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${task.durationDays}d`, startX + taskHeight + 8, taskY + taskHeight - 4)
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
    const laneHeight = 80
    const leftMargin = 80

    const srcX = leftMargin + (getTaskStartX(srcTask.startDate) + srcTask.durationDays) * dayWidth
    const srcY = 40 + srcTask.laneIndex * laneHeight + laneHeight / 2

    const dstX = leftMargin + getTaskStartX(dstTask.startDate) * dayWidth
    const dstY = 40 + dstTask.laneIndex * laneHeight + laneHeight / 2

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
   }

   const detectChords = (tasks: Record<string, TaskData>): Chord[] => {
     // Group tasks by start date
     const tasksByDate: Record<string, TaskData[]> = {}
     
     Object.values(tasks).forEach(task => {
       if (!tasksByDate[task.startDate]) {
         tasksByDate[task.startDate] = []
       }
       tasksByDate[task.startDate].push(task)
     })
     
     // Create chords for dates with multiple tasks
     const chords: Chord[] = []
     Object.entries(tasksByDate).forEach(([startDate, tasksAtDate]) => {
       if (tasksAtDate.length > 1) {
         // Sort tasks by lane for consistent chord rendering
         tasksAtDate.sort((a, b) => a.laneIndex - b.laneIndex)
         
         // Generate a chord name based on the tasks
         const chordName = generateChordName(tasksAtDate)
         
         chords.push({
           startDate,
           tasks: tasksAtDate,
           name: chordName
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
     const laneHeight = 80
     const taskHeight = 36
     const leftMargin = 80
     
     // Find the longest task duration to position the chord bar at the end
     const longestTask = chord.tasks.reduce((longest, task) => 
       task.durationDays > longest.durationDays ? task : longest
     )
     
     const startX = leftMargin + getTaskStartX(chord.startDate) * dayWidth
     const longestTaskWidth = Math.max(longestTask.durationDays * dayWidth - 8, 120)
     const chordX = startX + longestTaskWidth + 8 // Position at the end of the longest note
     
     // Find the top and bottom tasks
     const sortedTasks = chord.tasks.sort((a, b) => a.laneIndex - b.laneIndex)
     const topTask = sortedTasks[0]
     const bottomTask = sortedTasks[sortedTasks.length - 1]
     
     const topY = 40 + topTask.laneIndex * laneHeight + (laneHeight - taskHeight) / 2 + taskHeight / 2
     const bottomY = 40 + bottomTask.laneIndex * laneHeight + (laneHeight - taskHeight) / 2 + taskHeight / 2
     
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
     
     // Draw chord name above the chord bar
     if (chord.name) {
       const chordNameX = chordX
       const chordNameY = topY - 20
       
       // Draw background for chord name
       ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
       ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
       const textMetrics = ctx.measureText(chord.name)
       const textWidth = textMetrics.width
       const textHeight = 16
       
       ctx.fillRect(chordNameX - textWidth / 2 - 4, chordNameY - textHeight / 2 - 2, 
                    textWidth + 8, textHeight + 4)
       
       // Draw chord name text
       ctx.fillStyle = 'white'
       ctx.textAlign = 'center'
       ctx.textBaseline = 'middle'
       ctx.fillText(chord.name, chordNameX, chordNameY)
       
       // Reset text alignment
       ctx.textAlign = 'start'
       ctx.textBaseline = 'alphabetic'
     }
   }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Find clicked task
    const clickedTask = findTaskAtPosition(x, y)
    
    if (clickedTask) {
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
      // Clear selection
      dispatch(setSelection([]))
    }
  }

  const findTaskAtPosition = (x: number, y: number): TaskData | null => {
    const dayWidth = 60
    const laneHeight = 80
    const taskHeight = 36
    const leftMargin = 80

    for (const task of Object.values(tasks)) {
      const startX = leftMargin + getTaskStartX(task.startDate) * dayWidth
      const taskWidth = Math.max(task.durationDays * dayWidth - 8, 120)
      const taskY = 40 + task.laneIndex * laneHeight + (laneHeight - taskHeight) / 2

      // Check if click is within the task bounds (rounded rectangle with circular left end)
      const isInMainBody = x >= startX + taskHeight / 2 && x <= startX + taskWidth && 
                           y >= taskY && y <= taskY + taskHeight

      // Check circular left end
      const centerX = startX + taskHeight / 2
      const centerY = taskY + taskHeight / 2
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
    </div>
  )
}
