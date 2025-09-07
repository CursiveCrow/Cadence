import { store, RootState } from '../state/store'
import { NewRenderer as Renderer } from '../renderer/core/Renderer'
import { createEventHandlers } from './interactions/eventHandlers'
import { initializeDemoDataIfNeeded } from './demo/seedData'
import { errorLogger, ErrorSeverity } from '../renderer/core/ErrorBoundary'


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

    const scheduleRender = () => {
        if (scheduled) return
        scheduled = true
        requestAnimationFrame(() => {
            scheduled = false
            try {
                renderer.render()
            } catch (error) {
                errorLogger.log(
                    'Bootstrap',
                    'scheduleRender',
                    ErrorSeverity.ERROR,
                    'Render failed during scheduled frame',
                    error instanceof Error ? error : undefined
                )
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

        let dirty = false
        if (lastStaffs !== staffsRef) { lastStaffs = staffsRef; dirty = true }
        if (lastTasks !== tasksRef) { lastTasks = tasksRef; dirty = true }
        if (lastDeps !== depsRef) { lastDeps = depsRef; dirty = true }
        if (lastSelection !== selectionRef) { lastSelection = selectionRef; dirty = true }
        if (lastViewport !== viewportRefLocal) { lastViewport = viewportRefLocal; dirty = true }
        if (lastVScale !== vScale) { lastVScale = vScale; (renderer as unknown as { setVerticalScale?: (n: number) => void }).setVerticalScale?.(vScale); dirty = true }

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

function setupEventHandlers(canvas: HTMLCanvasElement, renderer: Renderer, viewportRef: { current: RootState['ui']['viewport'] }, scheduleRender: () => void) {
    // Create event handlers using the extracted event handler factory
    const eventHandlers = createEventHandlers({ renderer, canvas, viewportRef })

    // Set up event listeners using the extracted event handlers
    window.addEventListener('resize', () => {
        try {
            renderer.resize();
            scheduleRender()
        } catch (error) {
            errorLogger.log(
                'Bootstrap',
                'onResize',
                ErrorSeverity.WARNING,
                'Resize handling failed',
                error instanceof Error ? error : undefined
            )
        }
    })
    canvas.addEventListener('pointerdown', eventHandlers.onPointerDown)
    canvas.addEventListener('pointermove', eventHandlers.onPointerMove)
    canvas.addEventListener('pointerup', eventHandlers.onPointerUp)
    canvas.addEventListener('wheel', eventHandlers.onWheel, { passive: false })
    canvas.addEventListener('pointerleave', () => {
        try {
            renderer.setHover(null, null);
            scheduleRender()
        } catch (error) {
            errorLogger.log(
                'Bootstrap',
                'onPointerLeave',
                ErrorSeverity.WARNING,
                'Pointer leave handling failed',
                error instanceof Error ? error : undefined
            )
        }
    })
}

function bootstrap() {
    // 1. Setup DOM structure
    const { canvas } = setupDOM()

    // 2. Initialize renderer and data
    const renderer = setupRenderer(canvas)

    // 3. Setup store synchronization
    const { scheduleRender, viewportRef } = setupStoreSync(renderer)

    // 4. Setup event handling
    setupEventHandlers(canvas, renderer, viewportRef, scheduleRender)
}

bootstrap()
