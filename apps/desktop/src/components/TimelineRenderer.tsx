import React, { useRef, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setSelection } from '@cadence/state'
import { TaskData, DependencyData, updateTask, createDependency } from '@cadence/crdt'
import { Staff } from '@cadence/core'
import { checkWebGPUAvailability, logWebGPUStatus, computeTaskLayout, drawGridAndStaff, drawTaskNote, drawDependencyArrow, type TimelineConfig } from '@cadence/renderer'
import * as PIXI from 'pixi.js'
import './TimelineCanvas.css'

// Timeline configuration - matching original canvas exactly
const TIMELINE_CONFIG = {
  LEFT_MARGIN: 80,
  TOP_MARGIN: 60,
  DAY_WIDTH: 60,
  STAFF_SPACING: 120,
  STAFF_LINE_SPACING: 18,  // Same as original
  TASK_HEIGHT: 20,
  STAFF_LINE_COUNT: 5,
  BACKGROUND_COLOR: 0x1a1a1a,
  GRID_COLOR_MAJOR: 0xffffff,
  GRID_COLOR_MINOR: 0xffffff,
  STAFF_LINE_COLOR: 0xffffff,
  TASK_COLORS: {
    default: 0x8B5CF6,
    pending: 0x8B5CF6,
    in_progress: 0xC084FC,
    inProgress: 0xC084FC,
    completed: 0x10B981,
    blocked: 0xEF4444,
    cancelled: 0x6B7280,
    not_started: 0x6366F1
  },
  DEPENDENCY_COLOR: 0x666666,
  SELECTION_COLOR: 0xF59E0B
} as const

// Fixed project start to keep grid origin stable across drags/drops
const PROJECT_START_DATE = new Date('2024-01-01') // used by screenXToDate and drop logic for a stable grid origin

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

export const TimelineRenderer: React.FC<TimelineCanvasProps> = ({
  projectId,
  tasks,
  dependencies,
  selection,
  viewport,
  staffs,
  onDragStart,
  onDragEnd
}) => {
  console.log('=== TimelineRenderer MOUNTING ===', {
    hasPixi: typeof PIXI !== 'undefined',
    pixiVersion: typeof PIXI !== 'undefined' ? PIXI.VERSION : 'N/A'
  })
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const dispatch = useDispatch()
  const [isRendererInitialized, setIsRendererInitialized] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const initializingRef = useRef(false)
  const cleanupRef = useRef(false)
  
  // Log props only on mount
  useEffect(() => {
    console.log('TimelineRenderer initial props:', {
      tasksCount: Object.keys(tasks).length,
      staffsCount: staffs.length
    })
  }, [])
  
  // Drag and drop state
  const dragStateRef = useRef<{
    isDragging: boolean
    isResizing: boolean
    isCreatingDependency: boolean
    draggedTaskId: string | null
    draggedTask: TaskData | null
    dragStartX: number
    dragStartY: number
    offsetX: number
    offsetY: number
    dragPreview: PIXI.Graphics | null
    dependencyPreview: PIXI.Graphics | null
    initialDuration: number
    snapDayIndex?: number
    snapStaffId?: string
    snapStaffLine?: number
    snapSnappedX?: number
    dropProcessed?: boolean
    dependencySourceTaskId?: string | null
    dependencyHoverTargetId?: string | null
  }>({
    isDragging: false,
    isResizing: false,
    isCreatingDependency: false,
    draggedTaskId: null,
    draggedTask: null,
    dragStartX: 0,
    dragStartY: 0,
    offsetX: 0,
    offsetY: 0,
    dragPreview: null,
    dependencyPreview: null,
    initialDuration: 0,
    snapDayIndex: undefined,
    snapStaffId: undefined,
    snapStaffLine: undefined,
    snapSnappedX: undefined,
    dropProcessed: false,
    dependencySourceTaskId: null,
    dependencyHoverTargetId: null
  })
  
  // Layers for rendering
  const layersRef = useRef<{
    viewport: PIXI.Container | null
    background: PIXI.Container | null
    dependencies: PIXI.Container | null
    tasks: PIXI.Container | null
    selection: PIXI.Container | null
    dragLayer: PIXI.Container | null
  }>({
    viewport: null,
    background: null,
    dependencies: null,
    tasks: null,
    selection: null,
    dragLayer: null
  })
  
  const taskSpritesRef = useRef<Map<string, PIXI.Container>>(new Map())
  const dependencyGraphicsRef = useRef<Map<string, PIXI.Graphics>>(new Map())
  const tasksRef = useRef<Record<string, TaskData>>({})
  const dependenciesRef = useRef<Record<string, DependencyData>>({})
  const staffsRef = useRef<Staff[]>([])

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    dependenciesRef.current = dependencies
  }, [dependencies])

  useEffect(() => {
    staffsRef.current = staffs
  }, [staffs])
  
  // Initialize PixiJS with WebGPU
  useEffect(() => {
    let mounted = true
    let localApp: PIXI.Application | null = null
    
    const initializeRenderer = async () => {
      const canvas = canvasRef.current
      
      // Prevent double initialization
      if (!canvas || appRef.current || initializingRef.current) {
        return
      }
      
      initializingRef.current = true

      try {
        // Check if still mounted before continuing
        if (!mounted) {
          initializingRef.current = false
          return
        }
        
        // Check WebGPU availability
        const webgpuStatus = await checkWebGPUAvailability()
        logWebGPUStatus(webgpuStatus)
        
        // Get actual canvas dimensions
        const rect = canvas.getBoundingClientRect()
        const width = Math.max(rect.width, 100) || window.innerWidth
        const height = Math.max(rect.height, 100) || window.innerHeight
        console.log('Canvas dimensions:', width, 'x', height)
        
        // Canvas must have non-zero dimensions
        if (width <= 0 || height <= 0) {
          console.error('Canvas has invalid dimensions:', width, 'x', height)
          throw new Error(`Canvas has invalid dimensions: ${width}x${height}`)
        }
        
        const app = new PIXI.Application()
        localApp = app
        // Initialize with WebGPU preference
        await app.init({
          canvas: canvas as any,
          width: width,
          height: height,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          backgroundColor: TIMELINE_CONFIG.BACKGROUND_COLOR,
          preference: 'webgpu', // Will fallback to WebGL automatically
          antialias: true,
          clearBeforeRender: true,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance',
          // Delegate resize to Pixi's ResizePlugin
          resizeTo: (canvas.parentElement || window) as any,
          // Ensure global pointer tracking so drag snapping works even when leaving objects
          eventFeatures: {
            move: true,
            click: true,
            wheel: true,
            globalMove: true
          },
          // Add WebGPU-specific settings to prevent device conflicts
          hello: true // This will log GPU info which helps debug
        })
        
        // Check again if we should abort
        if (!mounted) {
          app.destroy(true, { children: true, texture: true, textureSource: true })
          initializingRef.current = false
          return
        }
        
        appRef.current = app
        
        // Create rendering layers
        const viewport = new PIXI.Container()
        app.stage.addChild(viewport)
        
        const background = new PIXI.Container()
        const deps = new PIXI.Container()
        const tasksLayer = new PIXI.Container()
        const selectionLayer = new PIXI.Container()
        const dragLayer = new PIXI.Container()
        
        viewport.addChild(background)
        viewport.addChild(deps)
        viewport.addChild(tasksLayer)
        viewport.addChild(selectionLayer)
        viewport.addChild(dragLayer)  // Add drag layer on top
        
        layersRef.current = {
          viewport,
          background,
          dependencies: deps,
          tasks: tasksLayer,
          selection: selectionLayer,
          dragLayer
        }
        
        // Ensure all containers are visible
        viewport.visible = true
        background.visible = true
        deps.visible = true
        tasksLayer.visible = true
        selectionLayer.visible = true
        dragLayer.visible = true
        
        console.log('Layers initialized:', {
          viewport: !!viewport,
          background: !!background,
          deps: !!deps,
          tasksLayer: !!tasksLayer,
          selectionLayer: !!selectionLayer,
          dragLayer: !!dragLayer,
          layersRef: Object.keys(layersRef.current),
          viewportVisible: viewport.visible,
          stageChildren: app.stage.children.length
        })
        
        // Enable interactivity
        tasksLayer.eventMode = 'static'
        app.stage.eventMode = 'static'
        
        // Global drag handlers (use global events to track outside original hit-target)
        app.stage.on('globalpointermove', (event) => {
          const dragState = dragStateRef.current
          const globalPos = event.global
          const localPos = layersRef.current.viewport ? layersRef.current.viewport.toLocal(globalPos) : globalPos
          
          // Handle dependency preview (right-drag)
          if (dragState.isCreatingDependency && dragState.dependencySourceTaskId) {
            // Clear previous preview
            if (dragState.dependencyPreview && dragLayer.children.includes(dragState.dependencyPreview)) {
              dragLayer.removeChild(dragState.dependencyPreview)
              dragState.dependencyPreview.destroy()
              dragState.dependencyPreview = null
            }
            const preview = new PIXI.Graphics()
            // Find source task's current position (use END of source task)
            const srcTask = tasksRef.current[dragState.dependencySourceTaskId]
            if (srcTask) {
              const projectStartDate = PROJECT_START_DATE
              let srcEndX: number
              let srcY: number
              // Prefer exact on-screen bounds from the container to avoid math drift
              const srcContainer = taskSpritesRef.current.get(srcTask.id)
              if (srcContainer && layersRef.current.viewport) {
                const b = srcContainer.getBounds()
                const rightCenterGlobal = new PIXI.Point(b.x + b.width, b.y + b.height / 2)
                const rightCenter = layersRef.current.viewport.toLocal(rightCenterGlobal)
                srcEndX = rightCenter.x
                srcY = rightCenter.y
              } else {
                const srcStart = new Date(srcTask.startDate)
                const srcDayIndex = Math.floor((srcStart.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
                const srcStartX = TIMELINE_CONFIG.LEFT_MARGIN + srcDayIndex * TIMELINE_CONFIG.DAY_WIDTH
                const srcTaskWidth = Math.max(srcTask.durationDays * TIMELINE_CONFIG.DAY_WIDTH - 8, 40)
                srcEndX = srcStartX + srcTaskWidth
                srcY = getTaskYPosition(srcTask)
              }

              // Hover detect destination task and snap to its START X (left edge center) and center Y
              let hoverId: string | null = null
              let dstStartX = localPos.x
              let dstY = localPos.y
              const radius = TIMELINE_CONFIG.TASK_HEIGHT / 2
              for (const [taskId, task] of Object.entries(tasksRef.current)) {
                if (taskId === dragState.dependencySourceTaskId) continue
                const tStart = new Date(task.startDate)
                const dIdx = Math.floor((tStart.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
                const tX = TIMELINE_CONFIG.LEFT_MARGIN + dIdx * TIMELINE_CONFIG.DAY_WIDTH
                const tW = Math.max(task.durationDays * TIMELINE_CONFIG.DAY_WIDTH - 8, 40)
                const tCY = getTaskYPosition(task)
                const tY = tCY - TIMELINE_CONFIG.TASK_HEIGHT / 2
                if (localPos.x >= tX && localPos.x <= tX + tW && localPos.y >= tY && localPos.y <= tY + TIMELINE_CONFIG.TASK_HEIGHT) {
                  hoverId = taskId
                  // Prefer exact bounds for the target task
                  const dstContainer = taskSpritesRef.current.get(taskId)
                  if (dstContainer && layersRef.current.viewport) {
                    const db = dstContainer.getBounds()
                    const leftCenterGlobal = new PIXI.Point(db.x, db.y + db.height / 2)
                    const leftCenter = layersRef.current.viewport.toLocal(leftCenterGlobal)
                    dstStartX = leftCenter.x
                    dstY = leftCenter.y
                  } else {
                    dstStartX = tX + radius
                    dstY = tCY
                  }
                  break
                }
              }
              dragState.dependencyHoverTargetId = hoverId

              // Draw line from source END to snapped destination start/center
              preview.moveTo(srcEndX, srcY)
              preview.lineTo(dstStartX, dstY)
              preview.stroke({ width: 2, color: 0x10B981, alpha: 0.9 })

              // Draw arrowhead
              const angle = Math.atan2(dstY - srcY, dstStartX - srcEndX)
              const arrow = 8
              preview.beginPath()
              preview.moveTo(dstStartX, dstY)
              preview.lineTo(dstStartX - arrow * Math.cos(angle - Math.PI / 6), dstY - arrow * Math.sin(angle - Math.PI / 6))
              preview.lineTo(dstStartX - arrow * Math.cos(angle + Math.PI / 6), dstY - arrow * Math.sin(angle + Math.PI / 6))
              preview.closePath()
              preview.fill({ color: 0x10B981, alpha: 0.8 })
              dragLayer.addChild(preview)
              dragState.dependencyPreview = preview
            }
            return
          }

          // Handle resizing
          if (dragState.isResizing && dragState.draggedTask) {
            // Clear previous preview if any
            if (dragState.dragPreview && dragLayer.children.includes(dragState.dragPreview)) {
              dragLayer.removeChild(dragState.dragPreview)
              dragState.dragPreview.destroy()
              dragState.dragPreview = null
            }
            
            // Calculate new duration based on mouse position
            const taskStart = new Date(dragState.draggedTask.startDate)
            const projectStartDate = PROJECT_START_DATE
            
            const dayIndex = Math.floor((taskStart.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
            const startX = TIMELINE_CONFIG.LEFT_MARGIN + dayIndex * TIMELINE_CONFIG.DAY_WIDTH
            
            const newWidth = Math.max(TIMELINE_CONFIG.DAY_WIDTH, localPos.x - startX)
            
            // Create resize preview
            const preview = new PIXI.Graphics()
            const taskY = getTaskYPosition(dragState.draggedTask)
            const radius = TIMELINE_CONFIG.TASK_HEIGHT / 2
            
            preview.beginPath()
            preview.moveTo(startX + radius, taskY)
            preview.lineTo(startX + newWidth - 4, taskY)
            preview.quadraticCurveTo(startX + newWidth, taskY, startX + newWidth, taskY + 4)
            preview.lineTo(startX + newWidth, taskY + TIMELINE_CONFIG.TASK_HEIGHT - 4)
            preview.quadraticCurveTo(startX + newWidth, taskY + TIMELINE_CONFIG.TASK_HEIGHT, 
                                     startX + newWidth - 4, taskY + TIMELINE_CONFIG.TASK_HEIGHT)
            preview.lineTo(startX + radius, taskY + TIMELINE_CONFIG.TASK_HEIGHT)
            preview.arc(startX + radius, taskY + radius, radius, Math.PI / 2, -Math.PI / 2, false)
            preview.closePath()
            preview.fill({ color: 0x10B981, alpha: 0.5 })
            preview.stroke({ width: 2, color: 0x10B981, alpha: 1 })
            
            dragLayer.addChild(preview)
            dragState.dragPreview = preview
            return
          }
          
          // Handle dragging
          if (dragState.isDragging && dragState.draggedTask) {
            // Clear previous preview if any
            if (dragState.dragPreview && dragLayer.children.includes(dragState.dragPreview)) {
              dragLayer.removeChild(dragState.dragPreview)
            }
            
            // Create drag preview
            const preview = new PIXI.Graphics()
            const dragX = localPos.x - dragState.offsetX
            const dragY = localPos.y - dragState.offsetY
            
            // Draw semi-transparent preview of the task
            const taskWidth = dragState.draggedTask.durationDays * TIMELINE_CONFIG.DAY_WIDTH
            const radius = TIMELINE_CONFIG.TASK_HEIGHT / 2
            
            // Add drop zone highlight, and snap preview vertically to nearest staff line
            const nearest = findNearestStaffLine(dragY + radius)
            if (nearest) {
              const targetLineY = nearest.centerY
              const snappedTopY = targetLineY - radius
              // Align ghost to the same X that will be persisted (start of note at snapped grid)
              const { snappedX, dayIndex } = snapXToDay(dragX)
              // Record the snapped targets so drop uses EXACTLY the same values.
              // Latch values so brief jitter doesn't clear the ghost.
              dragState.snapDayIndex = dayIndex
              dragState.snapStaffId = nearest.staff.id
              dragState.snapStaffLine = nearest.staffLine
              dragState.snapSnappedX = snappedX

              // Draw snapped preview on the target line using latched snappedX
              const drawX = dragState.snapSnappedX ?? snappedX
              preview.beginPath()
              preview.moveTo(drawX + radius, snappedTopY)
              preview.lineTo(drawX + taskWidth - 4, snappedTopY)
              preview.quadraticCurveTo(drawX + taskWidth, snappedTopY, drawX + taskWidth, snappedTopY + 4)
              preview.lineTo(drawX + taskWidth, snappedTopY + TIMELINE_CONFIG.TASK_HEIGHT - 4)
              preview.quadraticCurveTo(drawX + taskWidth, snappedTopY + TIMELINE_CONFIG.TASK_HEIGHT, 
                                       drawX + taskWidth - 4, snappedTopY + TIMELINE_CONFIG.TASK_HEIGHT)
              preview.lineTo(drawX + radius, snappedTopY + TIMELINE_CONFIG.TASK_HEIGHT)
              preview.arc(drawX + radius, targetLineY, radius, Math.PI / 2, -Math.PI / 2, false)
              preview.closePath()
              preview.fill({ color: 0x8B5CF6, alpha: 0.5 })
              preview.stroke({ width: 2, color: 0xFCD34D, alpha: 1 })

              // Draw a line or circle at the actual drop position
              preview.circle(drawX + radius, targetLineY, radius + 3)
              preview.stroke({ width: 2, color: 0x10B981, alpha: 0.8 })

              // Draw a horizontal guide line to show alignment
              preview.moveTo(drawX - 20, targetLineY)
              preview.lineTo(drawX + taskWidth + 20, targetLineY)
              preview.stroke({ width: 1, color: 0x10B981, alpha: 0.5 })
            } else {
              // Do not immediately clear latched snap info; only stop updating.
              // Fallback: draw unsnapped preview at last snapped X if available.
              const drawX = dragState.snapSnappedX ?? dragX
              preview.beginPath()
              preview.moveTo(drawX + radius, dragY)
              preview.lineTo(drawX + taskWidth - 4, dragY)
              preview.quadraticCurveTo(drawX + taskWidth, dragY, drawX + taskWidth, dragY + 4)
              preview.lineTo(drawX + taskWidth, dragY + TIMELINE_CONFIG.TASK_HEIGHT - 4)
              preview.quadraticCurveTo(drawX + taskWidth, dragY + TIMELINE_CONFIG.TASK_HEIGHT, 
                                       drawX + taskWidth - 4, dragY + TIMELINE_CONFIG.TASK_HEIGHT)
              preview.lineTo(drawX + radius, dragY + TIMELINE_CONFIG.TASK_HEIGHT)
              preview.arc(drawX + radius, dragY + radius, radius, Math.PI / 2, -Math.PI / 2, false)
              preview.closePath()
              preview.fill({ color: 0x8B5CF6, alpha: 0.5 })
              preview.stroke({ width: 2, color: 0xFCD34D, alpha: 1 })
            }
            
            dragLayer.addChild(preview)
            dragState.dragPreview = preview
          }
        })
        
        // Single finalize handler: pointerup
        app.stage.on('pointerup', (event) => {
          const dragState = dragStateRef.current
          if (dragState.dropProcessed) return
          const globalPos = event.global
          const localPos = layersRef.current.viewport ? layersRef.current.viewport.toLocal(globalPos) : globalPos
          
          // Clear drag preview
          if (dragState.dragPreview && dragLayer.children.includes(dragState.dragPreview)) {
            dragLayer.removeChild(dragState.dragPreview)
            dragState.dragPreview.destroy()
            dragState.dragPreview = null
          }
          
          // Handle dependency finalize on right-click drag
          if (dragState.isCreatingDependency && dragState.dependencySourceTaskId) {
            // Determine if pointer is over a target task
            const targetTaskId: string | null = dragState.dependencyHoverTargetId || null

            // Clear dependency preview
            if (dragState.dependencyPreview && dragLayer.children.includes(dragState.dependencyPreview)) {
              dragLayer.removeChild(dragState.dependencyPreview)
              dragState.dependencyPreview.destroy()
              dragState.dependencyPreview = null
            }

            // Create dependency if valid and not self
            if (targetTaskId && targetTaskId !== dragState.dependencySourceTaskId) {
              const sourceTask = tasksRef.current[dragState.dependencySourceTaskId]
              const destTask = tasksRef.current[targetTaskId]
              if (sourceTask && destTask) {
                // Direction: finish_to_start means src must be the earlier one
                const src = new Date(sourceTask.startDate) <= new Date(destTask.startDate) ? sourceTask : destTask
                const dst = src === sourceTask ? destTask : sourceTask
                // Deduplicate existing dependency (use dependenciesRef)
                const existing = Object.values(dependenciesRef.current).some(d => d.srcTaskId === src.id && d.dstTaskId === dst.id)
                if (!existing) {
                  createDependency(projectId, {
                    id: `dep-${Date.now()}`,
                    srcTaskId: src.id,
                    dstTaskId: dst.id,
                    type: 'finish_to_start'
                  })
                }
              }
            }

            // Reset dependency state
            dragStateRef.current.isCreatingDependency = false
            dragStateRef.current.dependencySourceTaskId = null
            dragStateRef.current.dependencyHoverTargetId = null
            dragStateRef.current.dependencyPreview = null
            dragStateRef.current.dropProcessed = false

            // Allow other logic to continue
          }

          // Handle resize end
          if (dragState.isResizing && dragState.draggedTask && dragState.draggedTaskId) {
            // Calculate new duration
            const taskStart = new Date(dragState.draggedTask.startDate)
            const projectStartDate = PROJECT_START_DATE
            
            const dayIndex = Math.floor((taskStart.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
            const startX = TIMELINE_CONFIG.LEFT_MARGIN + dayIndex * TIMELINE_CONFIG.DAY_WIDTH
            
            const newWidth = Math.max(TIMELINE_CONFIG.DAY_WIDTH, localPos.x - startX)
            const newDuration = Math.max(1, Math.round(newWidth / TIMELINE_CONFIG.DAY_WIDTH))
            
            // Apply the update through CRDT
            updateTask(projectId, dragState.draggedTaskId, {
              durationDays: newDuration
            })
            
            // Reset state
            dragStateRef.current = {
              isDragging: false,
              isResizing: false,
              isCreatingDependency: false,
              draggedTaskId: null,
              draggedTask: null,
              dragStartX: 0,
              dragStartY: 0,
              offsetX: 0,
              offsetY: 0,
              dragPreview: null,
              dependencyPreview: null,
              initialDuration: 0,
              snapDayIndex: undefined,
              snapStaffId: undefined,
              snapStaffLine: undefined,
              snapSnappedX: undefined,
              dropProcessed: false,
              dependencySourceTaskId: null
            }
            
            // Reset cursor
            if (app.view) {
              (app.view as HTMLCanvasElement).style.cursor = 'default'
            }
            
            // Notify drag end for UI (show popup again)
            if (onDragEnd) {
              onDragEnd()
            }

            return
          }
          
          // Handle drag end
          if (dragState.isDragging && dragState.draggedTask && dragState.draggedTaskId) {
            dragState.dropProcessed = true
            // Calculate the actual drop position in viewport space
            const dragX = localPos.x - dragState.offsetX
            const dragY = localPos.y - dragState.offsetY
            
            // Preferred: use precomputed snap targets from move handler if present
            const radius = TIMELINE_CONFIG.TASK_HEIGHT / 2
            const nearest = findNearestStaffLine(dragY + radius)
            
            const dayIndex =
              dragState.snapDayIndex !== undefined
                ? dragState.snapDayIndex
                : (dragState.snapSnappedX !== undefined
                    ? Math.round((dragState.snapSnappedX - TIMELINE_CONFIG.LEFT_MARGIN) / TIMELINE_CONFIG.DAY_WIDTH)
                    : snapXToDay(dragX).dayIndex)
            const startDate = dayIndexToIsoDate(dayIndex)
            
            // Log for debugging
            console.log('Drop position:', { dragX, dragY, dayIndex, startDate, nearest })
            
            // Prepare updates
            const updates: Partial<TaskData> = { startDate }
            
            // Update staff/line using snapped targets
            if (dragState.snapStaffId !== undefined && dragState.snapStaffLine !== undefined) {
              updates.staffId = dragState.snapStaffId
              updates.staffLine = dragState.snapStaffLine
            } else if (nearest) {
              updates.staffId = nearest.staff.id
              updates.staffLine = nearest.staffLine
            }
            
            // Apply the update through CRDT
            updateTask(projectId, dragState.draggedTaskId, updates)
            
            // Reset drag state
            dragStateRef.current = {
              isDragging: false,
              isResizing: false,
              isCreatingDependency: false,
              draggedTaskId: null,
              draggedTask: null,
              dragStartX: 0,
              dragStartY: 0,
              offsetX: 0,
              offsetY: 0,
              dragPreview: null,
              dependencyPreview: null,
              initialDuration: 0,
              snapDayIndex: undefined,
              snapStaffId: undefined,
              snapStaffLine: undefined,
              snapSnappedX: undefined,
              dropProcessed: false,
              dependencySourceTaskId: null
            }
            
            // Reset cursor
            if (app.view) {
              (app.view as HTMLCanvasElement).style.cursor = 'default'
            }
            
            // Call drag end callback if provided
            if (onDragEnd) {
              onDragEnd()
            }
          }
        })

        // Remove duplicate pointer-up handlers; globalpointerup is the single source of truth now
        
        if (mounted) {
        setIsRendererInitialized(true)
        console.log('Direct PixiJS renderer initialized with', app.renderer.type === PIXI.RendererType.WEBGPU ? 'WebGPU' : 'WebGL')
          
          // Set up continuous render loop - CRITICAL for WebGPU
          // Must be AFTER setIsRendererInitialized to prevent early return spam
          app.ticker.add(() => {
            try {
              renderScene()
            } catch (error) {
              console.error('Render error:', error)
            }
          })
          console.log('Render loop started')
        }
      } catch (error) {
        console.error('Failed to initialize renderer:', error)
        if (mounted) {
        setRenderError(error instanceof Error ? error.message : 'Failed to initialize renderer')
        setIsRendererInitialized(false)
        }
      } finally {
        initializingRef.current = false
      }
    }

    // Initialize after a short delay to ensure canvas is ready
    console.log('=== useEffect RUNNING - Waiting for next frame ===')
    requestAnimationFrame(() => {
      console.log('=== About to call initializeRenderer ===')
      initializeRenderer().then(() => {
        console.log('=== initializeRenderer COMPLETED ===')
      }).catch((err) => {
        console.error('=== initializeRenderer FAILED ===', err)
      })
    })

    return () => {
      console.log('useEffect cleanup running')
      mounted = false
      cleanupRef.current = true
      
      // Cleanup on unmount
      const app = appRef.current || localApp
      if (app) {
        console.log('Cleaning up PixiJS application')
        
        // Stop the ticker first to prevent any further rendering
        app.ticker.stop()
        
        // Remove all event listeners
        app.stage.removeAllListeners()
        
        // Clear all containers
        if (layersRef.current.viewport) {
          layersRef.current.viewport.removeChildren()
        }
        
        // Call resize cleanup if it exists
        if ((app as any).cleanupResize) {
          (app as any).cleanupResize()
        }
        
        // Destroy the application with all resources
        app.destroy(true, { 
          children: true, 
          texture: true, 
          textureSource: true,
          context: true
        })
        
        appRef.current = null
        localApp = null
        
        // Reset layers
        layersRef.current = {
          viewport: null,
          background: null,
          dependencies: null,
          tasks: null,
          selection: null,
          dragLayer: null
        }
        
        // Reset task sprites
        taskSpritesRef.current.clear()
      }
      
      setIsRendererInitialized(false)
      initializingRef.current = false
      cleanupRef.current = false
    }
  }, [])

  // Resize handled by Pixi's resizeTo option during init

  // Helper function to get task position (matching original)
  const getTaskYPosition = (task: TaskData): number => {
    const staffStartY = TIMELINE_CONFIG.TOP_MARGIN
    const staffSpacing = TIMELINE_CONFIG.STAFF_SPACING

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
    const noteY = taskStaffStartY + (task.staffLine * TIMELINE_CONFIG.STAFF_LINE_SPACING / 2)

    return noteY
  }
  
  // Legacy: screenXToDate was used previously; snapping now uses dayIndexToIsoDate consistently
  
  // Deprecated: replaced by findNearestStaffLine
  // const findStaffAtY = (_y: number): { staff: Staff, staffLine: number } | null => null

  // Find the nearest staff line (including spaces) to a given Y coordinate
  const findNearestStaffLine = (y: number): { staff: Staff; staffLine: number; centerY: number } | null => {
    const list = staffsRef.current
    if (!list || list.length === 0) return null

    let closest: { staff: Staff; staffLine: number; centerY: number } | null = null
    let minDistance = Infinity

    const halfStep = TIMELINE_CONFIG.STAFF_LINE_SPACING / 2

    for (let i = 0; i < list.length; i++) {
      const staff = list[i]
      const staffStartY = TIMELINE_CONFIG.TOP_MARGIN + i * TIMELINE_CONFIG.STAFF_SPACING
      const maxIndex = (staff.numberOfLines - 1) * 2

      for (let idx = 0; idx <= maxIndex; idx++) {
        const centerY = staffStartY + idx * halfStep
        const dist = Math.abs(y - centerY)
        if (dist < minDistance) {
          minDistance = dist
          closest = { staff, staffLine: idx, centerY }
        }
      }
    }

    return closest
  }

  // Snap an X coordinate to the nearest day grid position
  const snapXToDay = (x: number): { snappedX: number; dayIndex: number } => {
    const relative = (x - TIMELINE_CONFIG.LEFT_MARGIN) / TIMELINE_CONFIG.DAY_WIDTH
    const dayIndex = Math.round(relative)
    const snappedX = TIMELINE_CONFIG.LEFT_MARGIN + dayIndex * TIMELINE_CONFIG.DAY_WIDTH
    return { snappedX, dayIndex }
  }

  // Convert snapped day index to an ISO date string at UTC midnight to avoid TZ shifts
  const dayIndexToIsoDate = (dayIndex: number): string => {
    const year = PROJECT_START_DATE.getUTCFullYear()
    const month = PROJECT_START_DATE.getUTCMonth()
    const day = PROJECT_START_DATE.getUTCDate()
    const utcDate = new Date(Date.UTC(year, month, day + dayIndex))
    return utcDate.toISOString().split('T')[0]
  }

  // Render scene
  const renderScene = () => {
    const app = appRef.current
    const layers = layersRef.current
    if (!app || !isRendererInitialized || !layers.viewport) {
      return
    }
    
    // Clear background and selection layers only; reuse tasks and dependencies
    layers.background?.removeChildren()
    layers.selection?.removeChildren()
    
    // Get project start date
    const projectStartDate = PROJECT_START_DATE
    
    // Render background (grid and staff lines)
    if (layers.background) {
      const cfg = TIMELINE_CONFIG as unknown as TimelineConfig
      drawGridAndStaff(layers.background, cfg, staffs, projectStartDate, app.screen.width, app.screen.height)
    }
    
    // Render tasks with proper musical note styling
    if (layers.tasks) {
      const cfg = TIMELINE_CONFIG as unknown as TimelineConfig
      const currentIds = new Set(Object.keys(tasks))

      for (const task of Object.values(tasks)) {
        const layout = computeTaskLayout(cfg, task as any, projectStartDate, staffs as any)

        let taskContainer = taskSpritesRef.current.get(task.id)
        if (!taskContainer) {
          taskContainer = new PIXI.Container()
          taskContainer.eventMode = 'static'
          taskContainer.cursor = 'pointer'
          ;(taskContainer as any).__meta = { startX: layout.startX, width: layout.width, topY: layout.topY }

          // Hover handlers using live meta
          taskContainer.on('pointermove', (event) => {
            const meta = (taskContainer as any).__meta
            const localPos = taskContainer!.toLocal(event.global)
            const relativeX = localPos.x - meta.startX
            const isNearRightEdge = relativeX > meta.width - 10 && relativeX >= 0
            taskContainer!.cursor = isNearRightEdge ? 'ew-resize' : 'grab'
          })

          taskContainer.on('pointerout', () => {
            if (!dragStateRef.current.isDragging && !dragStateRef.current.isResizing) {
              taskContainer!.cursor = 'pointer'
            }
          })

          taskContainer.on('rightclick', (e) => {
            ;(e as any).preventDefault?.()
          })

          taskContainer.on('pointerdown', (event) => {
            const meta = (taskContainer as any).__meta
            const localPos = taskContainer!.toLocal(event.global)
            const relativeX = localPos.x - meta.startX
            const isNearRightEdge = relativeX > meta.width - 10 && relativeX >= 0

            // Right-click starts dependency creation
            if ((event as any).button === 2) {
              dragStateRef.current.isCreatingDependency = true
              dragStateRef.current.dependencySourceTaskId = task.id
              if (onDragStart) onDragStart()
              return
            }

            // Select the task
            dispatch(setSelection([task.id]))

            const globalPos = event.global
            const viewportPos = layers.viewport ? layers.viewport.toLocal(globalPos) : globalPos

            if (isNearRightEdge) {
              dragStateRef.current = {
                isDragging: false,
                isResizing: true,
                isCreatingDependency: false,
                draggedTaskId: task.id,
                draggedTask: task,
                dragStartX: globalPos.x,
                dragStartY: globalPos.y,
                offsetX: 0,
                offsetY: 0,
                dragPreview: null,
                dependencyPreview: null,
                initialDuration: task.durationDays,
                snapDayIndex: dragStateRef.current.snapDayIndex,
                snapStaffId: dragStateRef.current.snapStaffId,
                snapStaffLine: dragStateRef.current.snapStaffLine,
                snapSnappedX: dragStateRef.current.snapSnappedX,
                dropProcessed: false,
                dependencySourceTaskId: null
              }
              taskContainer!.cursor = 'ew-resize'
              if (app && app.view) {
                (app.view as HTMLCanvasElement).style.cursor = 'ew-resize'
              }
              if (onDragStart) onDragStart()
            } else {
              const taskY = layout.centerY - TIMELINE_CONFIG.TASK_HEIGHT / 2
              dragStateRef.current = {
                isDragging: true,
                isResizing: false,
                isCreatingDependency: false,
                draggedTaskId: task.id,
                draggedTask: task,
                dragStartX: globalPos.x,
                dragStartY: globalPos.y,
                offsetX: viewportPos.x - layout.startX,
                offsetY: viewportPos.y - taskY,
                dragPreview: null,
                dependencyPreview: null,
                initialDuration: 0,
                snapDayIndex: dragStateRef.current.snapDayIndex,
                snapStaffId: dragStateRef.current.snapStaffId,
                snapStaffLine: dragStateRef.current.snapStaffLine,
                snapSnappedX: dragStateRef.current.snapSnappedX,
                dropProcessed: false,
                dependencySourceTaskId: null
              }
              if (onDragStart) onDragStart()
              taskContainer!.cursor = 'grabbing'
              if (app && app.view) {
                (app.view as HTMLCanvasElement).style.cursor = 'grabbing'
              }
            }
          })

          taskSpritesRef.current.set(task.id, taskContainer)
          layers.tasks.addChild(taskContainer)
        }

        ;(taskContainer as any).__meta = { startX: layout.startX, width: layout.width, topY: layout.topY }
        drawTaskNote(taskContainer, cfg, layout, task.title || `Task ${task.id}`, task.status, selection.includes(task.id))

        // Selection overlay
        if (selection.includes(task.id) && layers.selection) {
          const selectionGraphics = new PIXI.Graphics()
          const selectionPadding = 3
          
          // Draw highlight that conforms to the note shape (matching the task shape)
          selectionGraphics.beginPath()
          
          // Start with circular left end (note head) with padding
          const selectionRadius = layout.radius + selectionPadding
          selectionGraphics.moveTo(layout.startX + layout.radius, layout.topY - selectionPadding)
          
          // Top line
          selectionGraphics.lineTo(layout.startX + layout.width - 4, layout.topY - selectionPadding)
          
          // Top-right corner
          selectionGraphics.quadraticCurveTo(
            layout.startX + layout.width + selectionPadding, layout.topY - selectionPadding,
            layout.startX + layout.width + selectionPadding, layout.topY + 4
          )
          
          // Right side
          selectionGraphics.lineTo(layout.startX + layout.width + selectionPadding, layout.topY + TIMELINE_CONFIG.TASK_HEIGHT - 4)
          
          // Bottom-right corner
          selectionGraphics.quadraticCurveTo(
            layout.startX + layout.width + selectionPadding, layout.topY + TIMELINE_CONFIG.TASK_HEIGHT + selectionPadding,
            layout.startX + layout.width - 4, layout.topY + TIMELINE_CONFIG.TASK_HEIGHT + selectionPadding
          )
          
          // Bottom line back to circle
          selectionGraphics.lineTo(layout.startX + layout.radius, layout.topY + TIMELINE_CONFIG.TASK_HEIGHT + selectionPadding)
          
          // Circular left end
          selectionGraphics.arc(
            layout.startX + layout.radius, layout.centerY, 
            selectionRadius, 
            Math.PI / 2, -Math.PI / 2, 
            false
          )
          
          selectionGraphics.closePath()
          selectionGraphics.stroke({ width: 2, color: TIMELINE_CONFIG.SELECTION_COLOR, alpha: 1 })
          layers.selection.addChild(selectionGraphics)
        }
      }

      // Remove containers for tasks that no longer exist
      for (const [taskId, container] of taskSpritesRef.current.entries()) {
        if (!currentIds.has(taskId)) {
          container.removeFromParent()
          taskSpritesRef.current.delete(taskId)
        }
      }
    }
    
    // Render dependencies
    if (layers.dependencies) {
      const currentDepIds = new Set(Object.keys(dependencies))
      for (const dependency of Object.values(dependencies)) {
        const srcTask = tasks[dependency.srcTaskId]
        const dstTask = tasks[dependency.dstTaskId]
        
        if (!srcTask || !dstTask) continue
        
        // Calculate baseline positions
        const srcStart = new Date(srcTask.startDate)
        const dstStart = new Date(dstTask.startDate)
        
        const srcDayIndex = Math.floor((srcStart.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
        const dstDayIndex = Math.floor((dstStart.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // Prefer exact bounds from drawn task containers (avoids drift); fallback to math with note radius
        const radius = TIMELINE_CONFIG.TASK_HEIGHT / 2
        let srcX: number
        let srcY: number
        const srcContainer = taskSpritesRef.current.get(srcTask.id)
        if (srcContainer && layersRef.current.viewport) {
          const b = srcContainer.getBounds()
          const rightCenterGlobal = new PIXI.Point(b.x + b.width, b.y + b.height / 2)
          const rightCenter = layersRef.current.viewport.toLocal(rightCenterGlobal)
          srcX = rightCenter.x
          srcY = rightCenter.y
        } else {
          srcX = TIMELINE_CONFIG.LEFT_MARGIN + srcDayIndex * TIMELINE_CONFIG.DAY_WIDTH +
                 srcTask.durationDays * TIMELINE_CONFIG.DAY_WIDTH - radius
          srcY = getTaskYPosition(srcTask)
        }
        
        let dstX: number
        let dstY: number
        const dstContainer = taskSpritesRef.current.get(dstTask.id)
        if (dstContainer && layersRef.current.viewport) {
          const db = dstContainer.getBounds()
          const leftCenterGlobal = new PIXI.Point(db.x, db.y + db.height / 2)
          const leftCenter = layersRef.current.viewport.toLocal(leftCenterGlobal)
          dstX = leftCenter.x
          dstY = leftCenter.y
        } else {
          dstX = TIMELINE_CONFIG.LEFT_MARGIN + dstDayIndex * TIMELINE_CONFIG.DAY_WIDTH + radius
          dstY = getTaskYPosition(dstTask)
        }
        
        let graphics = dependencyGraphicsRef.current.get(dependency.id)
        if (!graphics) {
          graphics = new PIXI.Graphics()
          dependencyGraphicsRef.current.set(dependency.id, graphics)
          layers.dependencies.addChild(graphics)
        }
        drawDependencyArrow(graphics, srcX, srcY, dstX, dstY, TIMELINE_CONFIG.DEPENDENCY_COLOR)
      }

      // Remove dependency graphics that no longer exist
      for (const [depId, g] of dependencyGraphicsRef.current.entries()) {
        if (!currentDepIds.has(depId)) {
          g.removeFromParent()
          dependencyGraphicsRef.current.delete(depId)
        }
      }
    }
  }

  // Render whenever data changes
  useEffect(() => {
    if (isRendererInitialized) {
      renderScene()
    }
  }, [tasks, dependencies, selection, staffs, isRendererInitialized])

  // Update viewport (rendering handled by ticker)
  useEffect(() => {
    const app = appRef.current
    const layers = layersRef.current
    if (!app || !isRendererInitialized || !layers.viewport) return
    
    // Anchor viewport to top-left; avoid unintended centering
    layers.viewport.x = -viewport.x * viewport.zoom
    layers.viewport.y = -viewport.y * viewport.zoom
    layers.viewport.scale.set(viewport.zoom)
  }, [viewport, isRendererInitialized])

  // Show loading or error state
  if (renderError) {
    return (
      <div className="timeline-canvas-container">
        <div className="timeline-error">
          <h3>Renderer Error</h3>
          <p>{renderError}</p>
          <p>The renderer will fallback to WebGL if WebGPU is not available.</p>
        </div>
      </div>
    )
  }

  // Only log on first render or error
  if (!isRendererInitialized || renderError) {
    console.log('TimelineRenderer render state:', {
      isRendererInitialized,
      renderError,
      hasCanvas: !!canvasRef.current,
      hasApp: !!appRef.current
    })
  }

  return (
    <div className="timeline-canvas-container">
      <canvas
        ref={canvasRef}
        className="timeline-canvas"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {!isRendererInitialized && !renderError && (
        <div className="timeline-overlay">
          <p>Initializing renderer...</p>
        </div>
      )}
    </div>
  )
}