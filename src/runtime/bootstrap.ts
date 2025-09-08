import { store, RootState } from '@state/store'
import { Renderer } from '@renderer/core/Renderer'
import { createEventHandlers } from '@runtime/interactions/eventHandlers'
import { initializeDemoDataIfNeeded } from '@runtime/demo/seedData'
import { errorLogger, ErrorSeverity } from '@renderer/core/ErrorBoundary'
import { bindRendererActions } from '@runtime/bindRendererActions'
import { setupKeyboardShortcuts } from '@runtime/keyboard'
import { createCommandRegistry } from '@runtime/commands'

// Application initialization functions
function setupDOM(): { canvas: HTMLCanvasElement } {
  const root = document.getElementById('app-container') as HTMLElement
  const content = document.createElement('div')
  content.className = 'content'
  root.appendChild(content)

  const main = document.createElement('main')
  main.className = 'main'
  content.appendChild(main)

  const canvas = document.createElement('canvas')
  canvas.className = 'canvas'
  main.appendChild(canvas)

  return { canvas }
}

function setupRenderer(canvas: HTMLCanvasElement): Renderer {
  const renderer = new Renderer(canvas)

  // Initialize demo data if needed (development only)
  initializeDemoDataIfNeeded()

  // Bind Redux-backed actions once
  try { bindRendererActions(renderer as any) } catch {}

  return renderer
}

function setupStoreSync(renderer: Renderer): { scheduleRender: () => void; viewportRef: { current: RootState['ui']['viewport'] } } {
  // Pump renderer from store with stable reference checks and RAF coalescing
  let lastStaffs: RootState['staffs']['list'] | null = null
  let lastTasks: RootState['tasks']['list'] | null = null
  let lastDeps: RootState['dependencies']['list'] | null = null
  let lastSelection: RootState['ui']['selection'] | null = null
  let lastViewport: RootState['ui']['viewport'] | null = null
  let lastVScale: number | null = null
  let scheduled = false
  let lastSidebarWidth: number | null = null

  const scheduleRender = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      try {
        renderer.render()
      } catch (error) {
        errorLogger.log('Bootstrap', 'scheduleRender', ErrorSeverity.ERROR, 'Render failed during scheduled frame', error instanceof Error ? error : undefined)
      }
    })
  }

  const pump = () => {
    const s = store.getState() as RootState
    const staffsRef = s.staffs.list
    const tasksRef = s.tasks.list
    const depsRef = s.dependencies.list
    const selectionRef = s.ui.selection
    const viewportRefLocal = s.ui.viewport
    const vScale = s.ui.verticalScale
    const sidebarWidth = Number.isFinite((s.ui as any).sidebarWidth) ? (s.ui as any).sidebarWidth : 220

    let dirty = false
    if (lastStaffs !== staffsRef) { lastStaffs = staffsRef; dirty = true }
    if (lastTasks !== tasksRef) { lastTasks = tasksRef; dirty = true }
    if (lastDeps !== depsRef) { lastDeps = depsRef; dirty = true }
    if (lastSelection !== selectionRef) { lastSelection = selectionRef; dirty = true }
    if (lastViewport !== viewportRefLocal) { lastViewport = viewportRefLocal; dirty = true }
    if (lastVScale !== vScale) { lastVScale = vScale; (renderer as any).setVerticalScale?.(vScale); dirty = true }
    if (lastSidebarWidth !== sidebarWidth) { lastSidebarWidth = sidebarWidth; (renderer as any).setLeftMargin?.(sidebarWidth); dirty = true }

    if (dirty) {
      renderer.setData({ staffs: staffsRef, tasks: tasksRef, dependencies: depsRef, selection: selectionRef })
      renderer.setViewport(viewportRefLocal)
      scheduleRender()
    }
  }

  store.subscribe(pump)
  pump()

  const viewportRef = { current: (store.getState() as RootState).ui.viewport }
  store.subscribe(() => { viewportRef.current = (store.getState() as RootState).ui.viewport })

  return { scheduleRender, viewportRef }
}

function setupEventHandlers(
  canvas: HTMLCanvasElement,
  renderer: Renderer,
  viewportRef: { current: RootState['ui']['viewport'] },
  scheduleRender: () => void
) {
  // Create event handlers using the extracted event handler factory
  const eventHandlers = createEventHandlers({ renderer, canvas, viewportRef })

  // Set up event listeners using the extracted event handlers
  const onResize = () => {
    try {
      renderer.resize()
      scheduleRender()
    } catch (error) {
      errorLogger.log('Bootstrap', 'onResize', ErrorSeverity.WARNING, 'Resize handling failed', error instanceof Error ? error : undefined)
    }
  }

  window.addEventListener('resize', onResize)
  canvas.addEventListener('pointerdown', eventHandlers.onPointerDown)
  canvas.addEventListener('pointermove', eventHandlers.onPointerMove)
  canvas.addEventListener('pointerup', eventHandlers.onPointerUp)
  canvas.addEventListener('wheel', eventHandlers.onWheel, { passive: false })
  canvas.addEventListener('pointerleave', () => {
    try {
      renderer.setHover(null, null)
      scheduleRender()
    } catch (error) {
      errorLogger.log('Bootstrap', 'onPointerLeave', ErrorSeverity.WARNING, 'Pointer leave handling failed', error instanceof Error ? error : undefined)
    }
  })

  // return a cleanup function to remove listeners
  return () => {
    window.removeEventListener('resize', onResize)
    canvas.removeEventListener('pointerdown', eventHandlers.onPointerDown)
    canvas.removeEventListener('pointermove', eventHandlers.onPointerMove)
    canvas.removeEventListener('pointerup', eventHandlers.onPointerUp)
    canvas.removeEventListener('wheel', eventHandlers.onWheel as any)
    eventHandlers.cleanup()
  }
}

function bootstrap() {
  // 1. Setup DOM structure
  const { canvas } = setupDOM()

  // 2. Initialize renderer and data
  const renderer = setupRenderer(canvas)
  // Dev-only HMR bridge: re-render when modules ask for it
  if (import.meta && (import.meta as any).hot) {
    try { console.debug?.("[HMR] bootstrap: accepting module updates") } catch {}
    ;(import.meta as any).hot.accept(() => { try { console.debug?.("[HMR] bootstrap: module updated ? re-rendering"); (renderer as any).render?.() } catch {} })
    try { window.addEventListener("cadence:hmr:rerender", () => { try { console.debug?.("[HMR] rerender event received"); (renderer as any).render?.() } catch {} }) } catch {}
  }
  // Dev-only: accept HMR updates and force a repaint so visual changes appear immediately
  if (import.meta && (import.meta as any).hot) {
    // Log so it’s obvious HMR is hooked up
    try { console.debug?.('[HMR] bootstrap: accepting module updates') } catch {}
    ;(import.meta as any).hot.accept(() => {
      try {
        console.debug?.('[HMR] bootstrap: module updated → re-rendering')
        ;(renderer as any).render?.()
      } catch {}
    })
  }
  // Dev: trigger a render on hot updates to avoid manual interaction
  if (import.meta && (import.meta as any).hot) {
    (import.meta as any).hot.accept(() => {
      try { (renderer as any).render?.() } catch {}
    })
  }

  // 3. Setup store synchronization
  const { scheduleRender, viewportRef } = setupStoreSync(renderer)

  // 4. Setup event handling
  const cleanupEvents = setupEventHandlers(canvas, renderer, viewportRef, scheduleRender)

  // 5. Setup keyboard shortcuts
  const cleanupKeyboard = setupKeyboardShortcuts(canvas, renderer as any)

  // 5b. Bind IPC menu commands
  try {
    const commands = createCommandRegistry(canvas, renderer as any)
    ;(window as any).cadence?.onCommand?.((id: string) => {
      const cmd = (commands as any)[id]
      if (cmd) cmd()
    })
  } catch {}

  // 6. Cleanup on unload (best-effort)
  window.addEventListener('beforeunload', () => {
    try { cleanupEvents?.() } catch {}
    try { cleanupKeyboard?.() } catch {}
  })
}

bootstrap()







