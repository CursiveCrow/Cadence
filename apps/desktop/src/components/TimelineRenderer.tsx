import React, { useRef, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setSelection, updateViewport } from '@cadence/state'
import { TaskData, DependencyData, updateTask, createDependency } from '@cadence/crdt'
import { Staff } from '@cadence/core'
import { checkWebGPUAvailability, logWebGPUStatus, computeTaskLayout, drawDependencyArrow, createTimelineLayers, ensureGridAndStaff, SpatialHash, TimelineSceneManager, TimelineDnDController, TIMELINE_CONFIG, findNearestStaffLineAt, snapXToDayWithConfig, dayIndexToIsoDateUTC, type TimelineConfig, Application, Container, Rectangle, RendererType } from '@cadence/renderer'
import './TimelineRenderer.css'

// TIMELINE_CONFIG now shared from @cadence/renderer

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
  if ((import.meta as any).env?.VITE_DEBUG_RENDERER === 'true') console.log('=== TimelineRenderer MOUNTING ===')
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<Application | null>(null)
  const dispatch = useDispatch()
  const [isRendererInitialized, setIsRendererInitialized] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const initializingRef = useRef(false)
  const cleanupRef = useRef(false)
  
  // Log props only on mount
  useEffect(() => {
    if ((import.meta as any).env?.VITE_DEBUG_RENDERER === 'true') {
      console.log('TimelineRenderer initial props:', {
        tasksCount: Object.keys(tasks).length,
        staffsCount: staffs.length
      })
    }
  }, [])
  
  // Drag and drop state now owned by TimelineDnDController
  
  // Layers for rendering
  const layersRef = useRef<{
    viewport: Container | null
    background: Container | null
    dependencies: Container | null
    tasks: Container | null
    selection: Container | null
    dragLayer: Container | null
  }>({
    viewport: null,
    background: null,
    dependencies: null,
    tasks: null,
    selection: null,
    dragLayer: null
  })
  
  const taskSpritesRef = useRef<Map<string, Container>>(new Map())
  const tasksRef = useRef<Record<string, TaskData>>({})
  const dependenciesRef = useRef<Record<string, DependencyData>>({})
  const staffsRef = useRef<Staff[]>([])
  const sceneRef = useRef<TimelineSceneManager | null>(null)
  const spatialRef = useRef<SpatialHash | null>(null)
  const dndRef = useRef<TimelineDnDController | null>(null)
  const tickerAddedRef = useRef(false)

  // Keep latest viewport available to event handlers
  const viewportRef = useRef(viewport)
  useEffect(() => { viewportRef.current = viewport }, [viewport])
  // Panning state
  const panStateRef = useRef<{ active: boolean; lastX: number; lastY: number; isSpaceHeld: boolean }>({ active: false, lastX: 0, lastY: 0, isSpaceHeld: false })

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
    let localApp: Application | null = null
    
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
        if ((import.meta as any).env?.VITE_DEBUG_RENDERER === 'true') console.log('Canvas dimensions:', width, 'x', height)
        
        // Canvas must have non-zero dimensions
        if (width <= 0 || height <= 0) {
          console.error('Canvas has invalid dimensions:', width, 'x', height)
          throw new Error(`Canvas has invalid dimensions: ${width}x${height}`)
        }
        
        const app = new Application()
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
        
        // Create rendering layers via helper
        const layers = createTimelineLayers(app)
        layersRef.current = layers

        // Create scene manager & spatial index
        sceneRef.current = new TimelineSceneManager(layers)
        spatialRef.current = new SpatialHash(200)
        
        // Ensure all containers are visible
        layers.viewport.visible = true
        layers.background.visible = true
        layers.dependencies.visible = true
        layers.tasks.visible = true
        layers.selection.visible = true
        layers.dragLayer.visible = true
        
        if ((import.meta as any).env?.VITE_DEBUG_RENDERER === 'true') console.log('Layers initialized:', {
          viewport: !!layers.viewport,
          background: !!layers.background,
          deps: !!layers.dependencies,
          tasksLayer: !!layers.tasks,
          selectionLayer: !!layers.selection,
          dragLayer: !!layers.dragLayer,
          layersRef: Object.keys(layersRef.current),
          viewportVisible: layers.viewport.visible,
          stageChildren: app.stage.children.length
        })
        
        // Wire dedicated DnD controller
        dndRef.current = new TimelineDnDController({
          app,
          layers: layersRef.current as any,
          scene: sceneRef.current!,
          config: TIMELINE_CONFIG as any,
          projectId,
          utils: {
            getProjectStartDate: () => PROJECT_START_DATE,
            findNearestStaffLine,
            snapXToDay,
            dayIndexToIsoDate
          },
          data: {
            getTasks: () => tasksRef.current as any,
            getStaffs: () => staffsRef.current as any,
            getDependencies: () => dependenciesRef.current as any
          },
          callbacks: {
            select: (ids) => dispatch(setSelection(ids)),
            onDragStart,
            onDragEnd,
            updateTask: (pid, id, updates) => updateTask(pid, id, updates as any),
            createDependency: (pid, dep) => createDependency(pid, dep as any)
          }
        })

        // Remove duplicate pointer-up handlers; globalpointerup is the single source of truth now
        
        if (mounted) {
        setIsRendererInitialized(true)
        if ((import.meta as any).env?.VITE_DEBUG_RENDERER === 'true') console.log('Direct PixiJS renderer initialized with', app.renderer.type === RendererType.WEBGPU ? 'WebGPU' : 'WebGL')
          
          // Set up continuous render loop - CRITICAL for WebGPU
          // Must be AFTER setIsRendererInitialized to prevent early return spam
          if (!tickerAddedRef.current) {
            tickerAddedRef.current = true
            app.ticker.add(() => {
              try {
                renderScene()
              } catch (error) {
                console.error('Render error:', error)
              }
            })
            if ((import.meta as any).env?.VITE_DEBUG_RENDERER === 'true') console.log('Render loop started')
          }
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
    if ((import.meta as any).env?.VITE_DEBUG_RENDERER === 'true') console.log('=== useEffect RUNNING - Waiting for next frame ===')
    requestAnimationFrame(() => {
      if ((import.meta as any).env?.VITE_DEBUG_RENDERER === 'true') console.log('=== About to call initializeRenderer ===')
      initializeRenderer().then(() => {
        if ((import.meta as any).env?.VITE_DEBUG_RENDERER === 'true') console.log('=== initializeRenderer COMPLETED ===')
      }).catch((err) => {
        console.error('=== initializeRenderer FAILED ===', err)
      })
    })

    return () => {
      if ((import.meta as any).env?.VITE_DEBUG_RENDERER === 'true') console.log('useEffect cleanup running')
      mounted = false
      cleanupRef.current = true
      
      // Cleanup on unmount
      // Destroy DnD controller listeners first
      if (dndRef.current) {
        try { dndRef.current.destroy() } catch (e) { console.warn('DnD destroy failed', e) }
        dndRef.current = null
      }
      const app = appRef.current || localApp
      if (app) {
        if ((import.meta as any).env?.VITE_DEBUG_RENDERER === 'true') console.log('Cleaning up PixiJS application')
        
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

  // Task Y computation handled within layout helpers
  
  // Legacy: screenXToDate was used previously; snapping now uses dayIndexToIsoDate consistently
  
  // Deprecated: replaced by findNearestStaffLine
  // const findStaffAtY = (_y: number): { staff: Staff, staffLine: number } | null => null

  // Find the nearest staff line (including spaces) to a given Y coordinate
  const findNearestStaffLine = (y: number): { staff: Staff; staffLine: number; centerY: number } | null =>
    findNearestStaffLineAt(y, staffsRef.current as any, TIMELINE_CONFIG as any)

  // Snap an X coordinate to the nearest day grid position
  const snapXToDay = (x: number): { snappedX: number; dayIndex: number } => snapXToDayWithConfig(x, TIMELINE_CONFIG as any)

  // Convert snapped day index to an ISO date string at UTC midnight to avoid TZ shifts
  const dayIndexToIsoDate = (dayIndex: number): string => dayIndexToIsoDateUTC(dayIndex, PROJECT_START_DATE)

  // Render scene
  const renderScene = () => {
    const app = appRef.current
    const layers = layersRef.current
    const scene = sceneRef.current
    if (!app || !isRendererInitialized || !layers.viewport || !scene) {
      return
    }
    
    // Ensure background drawn once and clear only selection each frame
    ensureGridAndStaff(layers.background!, TIMELINE_CONFIG as unknown as TimelineConfig, staffs, PROJECT_START_DATE, app.screen.width, app.screen.height)
    
    // Get project start date
    const projectStartDate = PROJECT_START_DATE
    
    // Render tasks with proper musical note styling
    if (layers.tasks) {
      const cfg = TIMELINE_CONFIG as unknown as TimelineConfig
      const currentIds = new Set(Object.keys(tasks))

      // Rebuild spatial index
      if (spatialRef.current) spatialRef.current.clear()

      // Compute viewport bounds in world space for culling
      const viewX = -layers.viewport!.x / (layers.viewport!.scale.x || 1)
      const viewY = -layers.viewport!.y / (layers.viewport!.scale.y || 1)
      const viewW = app.screen.width / (layers.viewport!.scale.x || 1)
      const viewH = app.screen.height / (layers.viewport!.scale.y || 1)
      const buffer = 200 // px buffer around viewport

      for (const task of Object.values(tasks)) {
        const layout = computeTaskLayout(cfg, task as any, projectStartDate, staffs as any)
        // Cull tasks outside the viewport + buffer
        const taskRight = layout.startX + layout.width
        const taskBottom = layout.topY + TIMELINE_CONFIG.TASK_HEIGHT
        const inView =
          taskRight >= viewX - buffer &&
          layout.startX <= viewX + viewW + buffer &&
          taskBottom >= viewY - buffer &&
          layout.topY <= viewY + viewH + buffer
        if (!inView) {
          continue
        }
        const { container } = scene.upsertTask(task as any, layout, cfg, task.title, task.status as any)
        // Position container so its local (0,0) maps to layout.startX/topY
        container.position.set(layout.startX, layout.topY)
        // Hit area is in local space
        container.hitArea = new Rectangle(0, 0, layout.width, TIMELINE_CONFIG.TASK_HEIGHT)

        // Register with DnD controller
        if (dndRef.current) dndRef.current.registerTask(task as any, container, layout)

        // Spatial index entry
        if (spatialRef.current) {
          spatialRef.current.insert({ id: task.id, x: layout.startX, y: layout.topY, width: layout.width, height: TIMELINE_CONFIG.TASK_HEIGHT, type: 'task' })
        }
      }

      // Selection overlay layer: draw only for selected ids
      // no-op here; selection handled above

      // Remove tasks that no longer exist
      scene.removeMissingTasks(currentIds)
    }
    
    // Render dependencies using cached anchors
    if (layers.dependencies) {
      const currentDepIds = new Set(Object.keys(dependencies))
      for (const dependency of Object.values(dependencies)) {
        const srcA = scene.getAnchors(dependency.srcTaskId)
        const dstA = scene.getAnchors(dependency.dstTaskId)
        if (!srcA || !dstA) continue
        const g = scene.upsertDependency(dependency.id)
        drawDependencyArrow(g, srcA.rightCenterX, srcA.rightCenterY, dstA.leftCenterX, dstA.leftCenterY, TIMELINE_CONFIG.DEPENDENCY_COLOR)
      }
      scene.removeMissingDependencies(currentDepIds)
    }

    // Always redraw selection AFTER tasks/dependencies so it follows latest layouts
    scene.clearSelection()
    const cfgSel = TIMELINE_CONFIG as unknown as TimelineConfig
    for (const id of selection) scene.drawSelection(id, cfgSel)
    ;(scene as any).__prevSelection = [...selection]
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

  // Wheel zoom and middle/space-drag panning
  useEffect(() => {
    const app = appRef.current
    const layers = layersRef.current
    if (!app || !isRendererInitialized || !layers.viewport) return

    // Zoom centered at cursor position
    const onWheel = (e: any) => {
      try {
        // Prevent outer scroll
        e?.preventDefault?.()
        const current = viewportRef.current
        const zoom0 = current.zoom || 1
        const sx = (e as any)?.global?.x ?? 0
        const sy = (e as any)?.global?.y ?? 0
        // Smaller per-notch zoom: ~2% per wheel notch (deltaY≈±100)
        const notches = (e?.deltaY ?? 0) / 100
        const stepPerNotch = 0.02
        const factor = Math.pow(1 + stepPerNotch, -notches)
        const minZ = 0.1
        const maxZ = 10
        const zoom1 = Math.max(minZ, Math.min(maxZ, zoom0 * factor))
        if (zoom1 === zoom0) return
        // World point under cursor should stay fixed
        const worldX = current.x + sx / zoom0
        const worldY = current.y + sy / zoom0
        const newX = worldX - sx / zoom1
        const newY = worldY - sy / zoom1
        dispatch(updateViewport({ x: newX, y: newY, zoom: zoom1 }))
      } catch (err) {
        console.warn('Wheel zoom handler error', err)
      }
    }

    // Panning helpers (use DOM pointer events to avoid interfering with task DnD)
    const viewEl = app.view as HTMLCanvasElement | null
    const toViewCoords = (ev: PointerEvent) => {
      const view = app.view as HTMLCanvasElement
      const rect = view.getBoundingClientRect()
      const x = (ev.clientX - rect.left) * (view.width / rect.width)
      const y = (ev.clientY - rect.top) * (view.height / rect.height)
      return { x, y }
    }

    const onPointerDownDom = (ev: PointerEvent) => {
      if (!viewEl) return
      const isMiddle = ev.button === 1
      const useSpacePan = panStateRef.current.isSpaceHeld
      if (!isMiddle && !useSpacePan) return
      const pos = toViewCoords(ev)
      panStateRef.current.active = true
      panStateRef.current.lastX = pos.x
      panStateRef.current.lastY = pos.y
      // Block other handlers (like selection) when initiating pan
      ev.preventDefault()
      ev.stopPropagation()
      ;(app.renderer as any)?.events?.setCursor?.('grabbing')
    }

    const onPointerMoveWin = (ev: PointerEvent) => {
      if (!panStateRef.current.active || !viewEl) return
      const pos = toViewCoords(ev)
      const dx = pos.x - panStateRef.current.lastX
      const dy = pos.y - panStateRef.current.lastY
      panStateRef.current.lastX = pos.x
      panStateRef.current.lastY = pos.y
      const current = viewportRef.current
      const z = current.zoom || 1
      const newX = current.x - dx / z
      const newY = current.y - dy / z
      dispatch(updateViewport({ x: newX, y: newY }))
    }

    const endPan = () => {
      if (!panStateRef.current.active) return
      panStateRef.current.active = false
      ;(app.renderer as any)?.events?.setCursor?.(null as any)
    }

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.code === 'Space') {
        panStateRef.current.isSpaceHeld = true
        if (!panStateRef.current.active) {
          ;(app.renderer as any)?.events?.setCursor?.('grab')
        }
        // Prevent page scroll on space
        ev.preventDefault()
      }
    }
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.code === 'Space') {
        panStateRef.current.isSpaceHeld = false
        if (!panStateRef.current.active) {
          ;(app.renderer as any)?.events?.setCursor?.(null as any)
        }
      }
    }

    // Attach listeners
    app.stage.on('wheel', onWheel as any)
    viewEl?.addEventListener('pointerdown', onPointerDownDom as any, { capture: true })
    window.addEventListener('pointermove', onPointerMoveWin as any, true)
    window.addEventListener('pointerup', endPan as any, true)
    window.addEventListener('blur', endPan as any, true)
    window.addEventListener('keydown', onKeyDown as any, true)
    window.addEventListener('keyup', onKeyUp as any, true)

    return () => {
      try { app.stage.off('wheel', onWheel as any) } catch {}
      try { viewEl?.removeEventListener('pointerdown', onPointerDownDom as any, { capture: true } as any) } catch {}
      try { window.removeEventListener('pointermove', onPointerMoveWin as any, true) } catch {}
      try { window.removeEventListener('pointerup', endPan as any, true) } catch {}
      try { window.removeEventListener('blur', endPan as any, true) } catch {}
      try { window.removeEventListener('keydown', onKeyDown as any, true) } catch {}
      try { window.removeEventListener('keyup', onKeyUp as any, true) } catch {}
    }
  }, [isRendererInitialized])

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