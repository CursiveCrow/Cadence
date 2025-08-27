import { Application, Container, Rectangle } from 'pixi.js'
import { createTimelineLayers, TimelineSceneManager, drawDependencyArrow, type TimelineConfig, type RendererPlugin } from './scene'
import { TimelineDnDController } from './dnd'
import { PanZoomController, ViewportState } from './panzoom'
import { checkWebGPUAvailability, logWebGPUStatus, logRendererPreference } from './webgpu-check'
import { createGpuTimeGrid, GpuTimeGrid } from './gpuGrid'
import { computeEffectiveConfig, snapXToTimeWithConfig, computeTaskLayout, getGridParamsForZoom } from './layout'
import { GridManager } from './gridManager'
// Intentionally imported for future dynamic tick density; currently computed in scene

export interface EngineTasks {
    [id: string]: any
}

export interface EngineDependencies {
    [id: string]: any
}

export interface EngineCallbacks {
    select: (ids: string[]) => void
    onDragStart?: () => void
    onDragEnd?: () => void
    updateTask: (projectId: string, taskId: string, updates: Partial<any>) => void
    createDependency: (projectId: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: string }) => void
    onViewportChange?: (v: { x: number; y: number; zoom: number }) => void
    onVerticalScaleChange?: (scale: number) => void
}

export interface EngineUtils {
    getProjectStartDate: () => Date
    findNearestStaffLine: (y: number) => { staff: any; staffLine: number; centerY: number } | null
    snapXToDay: (x: number) => { snappedX: number; dayIndex: number }
    dayIndexToIsoDate: (dayIndex: number) => string
    snapXToTime?: (x: number) => { snappedX: number; dayIndex: number }
}

export interface TimelineRendererEngineOptions {
    canvas: HTMLCanvasElement
    projectId: string
    config: TimelineConfig
    utils: EngineUtils
    callbacks: EngineCallbacks
    plugins?: RendererPlugin[]
}

// Use shared GridManager

export class TimelineRendererEngine {
    private app: Application | null = null
    private layers: { viewport: Container; background: Container; dependencies: Container; tasks: Container; selection: Container; dragLayer: Container } | null = null
    private scene: TimelineSceneManager | null = null
    private dnd: TimelineDnDController | null = null
    private panzoom: PanZoomController | null = null
    private tickerAdded = false
    private isInitialized = false
    private initializing = false
    private getViewport: () => ViewportState = () => ({ x: 0, y: 0, zoom: 1 })
    private setViewport: (v: ViewportState) => void = () => { }
    private currentData: { tasks: EngineTasks; dependencies: EngineDependencies; staffs: any[] } = { tasks: {}, dependencies: {}, staffs: [] }
    private verticalScale: number = 1
    private gridManager: GridManager | null = null
    private gpuGrid: GpuTimeGrid | undefined

    constructor(private readonly opts: TimelineRendererEngineOptions) { }

    public setVerticalScale(scale: number): void {
        const clamped = Math.max(0.5, Math.min(3, scale))
        this.verticalScale = clamped
        try { this.opts.callbacks.onVerticalScaleChange?.(clamped) } catch { }
    }

    getVerticalScale(): number { return this.verticalScale }

    async init(): Promise<void> {
        if (this.initializing || this.isInitialized) return
        this.initializing = true
        try {
            const status = await checkWebGPUAvailability()
            logWebGPUStatus(status)

            const rect = this.opts.canvas.getBoundingClientRect()
            const width = Math.max(rect.width, 100) || window.innerWidth
            const height = Math.max(rect.height, 100) || window.innerHeight
            const app = new Application()
            await app.init({
                canvas: this.opts.canvas as any,
                width,
                height,
                resolution: Math.max(1, Math.min(2, (window.devicePixelRatio || 1))),
                autoDensity: true,
                backgroundColor: this.opts.config.BACKGROUND_COLOR,

                // Force WebGPU renderer
                preference: 'webgpu',
                antialias: true,
                clearBeforeRender: true,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance',
                resizeTo: (this.opts.canvas.parentElement || window) as any,
                eventFeatures: { move: true, click: true, wheel: true, globalMove: true },
                hello: false,
            })
            this.app = app
            try { logRendererPreference(status, 'webgpu') } catch { }
            try { (app.renderer as any).roundPixels = true } catch { }

            const layers = createTimelineLayers(app)
            this.layers = layers

            // Insert GPU grid beneath viewport so it doesn't move with panning
            try {
                const grid = createGpuTimeGrid(app)
                this.gpuGrid = grid
                app.stage.addChildAt(grid.container, Math.max(0, app.stage.getChildIndex(layers.viewport)))
            } catch { }

            this.scene = new TimelineSceneManager(layers)
            this.scene.setPlugins(this.opts.plugins || [])
            // Provide context providers for plugins to query effective config and project start
            const getEffective = () => {
                const vp = this.getViewport()
                return computeEffectiveConfig(this.opts.config as any, vp.zoom || 1, this.getVerticalScale()) as any
            }
            this.scene.setContextProviders({
                getEffectiveConfig: getEffective,
                getProjectStartDate: () => this.opts.utils.getProjectStartDate()
            })
            this.scene.notifyLayersCreated(app)
            // Hover guide and date tooltip on pointer move
            try {
                app.stage.on('globalpointermove', (e: any) => {
                    try {
                        const local = layers.viewport.toLocal(e.global)
                        const eff = getEffective()
                        this.scene?.updateHoverAtViewportX(local.x, eff as any, app.screen.height)
                        // Task tooltip near hovered task
                        this.scene?.updateTaskHoverAtViewportPoint(local.x, local.y, eff as any, this.opts.utils.getProjectStartDate())
                    } catch { }
                })
                app.stage.on('pointerleave', () => {
                    try {
                        const eff = getEffective()
                        this.scene?.updateHoverAtViewportX(null as any, eff as any, app.screen.height)
                    } catch { }
                })
                app.stage.on('pointerout', () => {
                    try {
                        const eff = getEffective()
                        this.scene?.updateHoverAtViewportX(null as any, eff as any, app.screen.height)
                    } catch { }
                })
            } catch { }
            this.gridManager = new GridManager()
            this.dnd = new TimelineDnDController({
                app,
                layers,
                scene: this.scene,
                config: this.opts.config,
                projectId: this.opts.projectId,
                utils: {
                    ...this.opts.utils,
                    // Centralized, time-aware snapping using current effective config and zoom
                    snapXToTime: (x: number) => {
                        const vp = this.getViewport()
                        const eff = computeEffectiveConfig(this.opts.config, vp.zoom || 1, this.getVerticalScale())
                        const result = snapXToTimeWithConfig(x, eff as any, vp.zoom || 1, this.opts.utils.getProjectStartDate())
                        return { snappedX: result.snappedX, dayIndex: result.dayIndex }
                    }
                },
                data: {
                    getTasks: () => (this.currentData.tasks as any),
                    getStaffs: () => (this.currentData.staffs as any[]),
                    getDependencies: () => (this.currentData.dependencies as any),
                },
                callbacks: this.opts.callbacks,
                getDayWidth: () => {
                    const z2 = this.getViewport().zoom || 1
                    return Math.max(this.opts.config.DAY_WIDTH * z2, 3)
                },
                getTaskHeight: () => {
                    const cfg = this.opts.config
                    // Mirror render's vertical scaling/clamp
                    return Math.max(14, Math.round(cfg.TASK_HEIGHT * this.getVerticalScale()))
                },
                // Vertical snapping uses scaled config from the current render
                getScaledConfig: () => ({
                    TOP_MARGIN: Math.round(this.opts.config.TOP_MARGIN * this.getVerticalScale()),
                    STAFF_SPACING: Math.max(20, Math.round(this.opts.config.STAFF_SPACING * this.getVerticalScale())),
                    STAFF_LINE_SPACING: Math.max(8, Math.round(this.opts.config.STAFF_LINE_SPACING * this.getVerticalScale())),
                })
            })

            // Attach reusable pan/zoom that delegates viewport updates to host
            this.panzoom = new PanZoomController(app, layers.viewport, {
                getViewport: () => this.getViewport(),
                setViewport: (v) => this.setViewport(v),
                getPixelsPerDayBase: () => this.opts.config.DAY_WIDTH,
                getVerticalScale: () => this.getVerticalScale(),
                setVerticalScale: (s: number) => this.setVerticalScale(s)
            })

            if (!this.tickerAdded) {
                this.tickerAdded = true
                app.ticker.add(() => {
                    // Rendering is driven by host via render(...). Keep ticker alive for Pixi internal updates.
                })
            }

            this.isInitialized = true
        } finally {
            this.initializing = false
        }
    }

    render(data: { tasks: EngineTasks; dependencies: EngineDependencies; staffs: any[]; selection: string[] }, viewport: { x: number; y: number; zoom: number }): void {
        if (!this.app || !this.layers || !this.scene) return
        // Update data providers for engine-managed controllers
        this.currentData = { tasks: data.tasks, dependencies: data.dependencies, staffs: data.staffs }
        // Provide live viewport for pan/zoom controller
        this.getViewport = () => viewport
        this.setViewport = (v) => { try { this.opts.callbacks.onViewportChange?.(v) } catch { } }
        const app = this.app
        const layers = this.layers
        const scene = this.scene
        // Update scene zoom for plugin context
        try { scene.setZoom(viewport.zoom || 1) } catch { }

        // Compute effective config for current zoom and vertical scale
        const cfg = this.opts.config
        const effectiveCfg = computeEffectiveConfig(cfg as any, viewport.zoom, this.verticalScale)

        // Background staff and labels; verticals are handled by WebGPU grid
        this.gridManager?.ensure(layers.background, effectiveCfg as any, data.staffs as any, this.opts.utils.getProjectStartDate(), app.screen.width, app.screen.height, viewport.zoom, true)
        // Today marker (updates every render; cheap)
        try { this.scene.updateTodayMarker(this.opts.utils.getProjectStartDate(), effectiveCfg as any, app.screen.height) } catch { }

        // Update viewport transform: translate in pixels; do not scale Y; keep stage scale at 1
        const offsetX = -viewport.x * effectiveCfg.DAY_WIDTH
        // Clamp to finite values to avoid NaN/Inf at extreme zooms
        layers.viewport.x = Math.round(Number.isFinite(offsetX) ? offsetX : 0)
        layers.viewport.y = Math.round(Number.isFinite(-viewport.y) ? -viewport.y : 0)
        layers.viewport.scale.set(1, 1)

        // Update GPU grid uniforms (WebGPU)
        const gpuGrid = this.gpuGrid
        if (gpuGrid) {
            try {
                const screenW = app.screen.width
                const screenH = app.screen.height
                const cfgEff = effectiveCfg as any
                const projectStart = this.opts.utils.getProjectStartDate()
                const gp = getGridParamsForZoom(viewport.zoom || 1, projectStart)

                gpuGrid.container.visible = true
                gpuGrid.setSize(screenW, screenH)
                gpuGrid.updateUniforms({
                    screenWidth: screenW,
                    screenHeight: screenH,
                    leftMarginPx: cfgEff.LEFT_MARGIN,
                    viewportXDays: viewport.x,
                    dayWidthPx: cfgEff.DAY_WIDTH,
                    minorStepDays: gp.minorStepDays,
                    majorStepDays: gp.majorStepDays,
                    minorColor: cfgEff.GRID_COLOR_MINOR,
                    majorColor: cfgEff.GRID_COLOR_MAJOR,
                    minorAlpha: gp.minorAlpha,
                    majorAlpha: gp.majorAlpha,
                    minorLineWidthPx: gp.minorWidthPx,
                    majorLineWidthPx: gp.majorWidthPx,
                    scaleType: gp.scaleType as any,
                    baseDow: gp.baseDow,
                    weekendAlpha: gp.weekendAlpha,
                    globalAlpha: gp.globalAlpha,
                })
            } catch { }
        }

        // Render tasks
        const projectStartDate = this.opts.utils.getProjectStartDate()
        const currentIds = new Set(Object.keys(data.tasks))
        for (const task of Object.values(data.tasks)) {
            const layout = computeTaskLayout(effectiveCfg as any, task as any, projectStartDate, data.staffs as any)
            const isSelected = Array.isArray(data.selection) && data.selection.includes((task as any).id)
            const { container } = scene.upsertTask(task as any, layout, effectiveCfg as any, (task as any).title, (task as any).status, viewport.zoom, isSelected)
            container.position.set(Math.round(layout.startX), Math.round(layout.topY))
            container.hitArea = new Rectangle(0, 0, layout.width, effectiveCfg.TASK_HEIGHT)
            if (this.dnd) this.dnd.registerTask(task as any, container, layout)
        }
        scene.removeMissingTasks(currentIds)

        // Render dependencies
        const currentDepIds = new Set(Object.keys(data.dependencies))
        for (const dependency of Object.values(data.dependencies)) {
            const srcA = scene.getAnchors((dependency as any).srcTaskId)
            const dstA = scene.getAnchors((dependency as any).dstTaskId)
            if (!srcA || !dstA) continue
            const g = scene.upsertDependency((dependency as any).id)
            drawDependencyArrow(g, srcA.rightCenterX, srcA.rightCenterY, dstA.leftCenterX, dstA.leftCenterY, cfg.DEPENDENCY_COLOR)
        }
        scene.removeMissingDependencies(currentDepIds)

        // Selection overlay
        scene.clearSelection()
        for (const id of data.selection) scene.drawSelection(id, effectiveCfg as any)
        // Update spatial index for hit-testing
        scene.rebuildSpatialIndex(effectiveCfg as any)
    }

    getApplication(): Application | null { return this.app }
    getViewportContainer(): Container | null { return this.layers?.viewport || null }
    // Expose current effective horizontal scale to host for snapping
    getViewportScale(): number { return this.getViewport().zoom || 1 }

    destroy(): void {
        try { this.dnd?.destroy() } catch { }
        try { this.panzoom?.destroy() } catch { }
        this.dnd = null
        this.panzoom = null
        const app = this.app
        if (app) {
            try { app.ticker.stop() } catch { }
            try { app.stage.removeAllListeners() } catch { }
            try { app.destroy(true, { children: true, texture: true, textureSource: true, context: true }) } catch { }
        }
        try { this.scene?.destroy() } catch { }
        this.layers = null
        this.scene = null
        this.app = null
        this.isInitialized = false
        this.tickerAdded = false
    }
}


