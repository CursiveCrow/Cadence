import { Application, Container, Rectangle } from 'pixi.js'
import { createTimelineLayers, TimelineSceneManager } from './scene'
import type { TimelineConfig, RendererPlugin } from './types/renderer'
import { drawDependencyArrow } from '../components/rendering/shapes'
import { StatusGlyphPlugin } from '../components/plugins/status-glyph'
import { TimelineDnDController } from './dnd'
import { PanZoomController, ViewportState } from './panzoom'
import { checkWebGPUAvailability, logWebGPUStatus, logRendererPreference } from './utils/webgpu-check'
import { createGpuTimeGrid, GpuTimeGrid } from '../components/rendering/grid/gpuGrid'
import { computeEffectiveConfig, snapXToTimeWithConfig, computeTaskLayout, getGridParamsForZoom, computeViewportAlignment } from './utils/layout'
import { GridManager } from '../components/rendering/grid/gridManager'
import { devLog, safeCall } from './utils/devlog'

import type { Task, Dependency, Staff, DependencyType } from '@cadence/core'

// Intentionally imported for future dynamic tick density; currently computed in scene

export type EngineTasks = Record<string, Task>
export type EngineDependencies = Record<string, Dependency>

export interface EngineCallbacks {
    select: (ids: string[]) => void
    onDragStart?: () => void
    onDragEnd?: () => void
    updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void
    createDependency: (projectId: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }) => void
    onViewportChange?: (v: { x: number; y: number; zoom: number }) => void
    onVerticalScaleChange?: (scale: number) => void
}

export interface EngineUtils {
    getProjectStartDate: () => Date
    findNearestStaffLine: (y: number) => { staff: Staff; staffLine: number; centerY: number } | null
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
    private currentData: { tasks: EngineTasks; dependencies: EngineDependencies; staffs: Staff[] } = { tasks: {}, dependencies: {}, staffs: [] }
    private verticalScale: number = 1
    private gridManager: GridManager | null = null
    private gpuGrid: GpuTimeGrid | undefined

    constructor(private readonly opts: TimelineRendererEngineOptions) { }

    public setVerticalScale(scale: number): void {
        const clamped = Math.max(0.5, Math.min(3, scale))
        this.verticalScale = clamped
        try { this.opts.callbacks.onVerticalScaleChange?.(clamped) } catch (err) { devLog.warn('onVerticalScaleChange callback failed', err) }
    }

    getVerticalScale(): number { return this.verticalScale }

    async init(): Promise<void> {
        if (this.initializing || this.isInitialized) return
        this.initializing = true
        try {
            const status = await checkWebGPUAvailability()
            logWebGPUStatus(status)
            const chosenPref: 'webgpu' | 'webgl' = status.available ? 'webgpu' : 'webgl'

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

                // Choose renderer based on availability instead of forcing WebGPU
                preference: chosenPref,
                antialias: true,
                clearBeforeRender: true,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance',
                resizeTo: (this.opts.canvas.parentElement || window) as any,
                eventFeatures: { move: true, click: true, wheel: true, globalMove: true },
                hello: false,
            })
            this.app = app
            try { logRendererPreference(status, chosenPref) } catch (err) { devLog.warn('logRendererPreference failed', err) }
            try { (app.renderer as any).roundPixels = true } catch (err) { devLog.warn('roundPixels set failed', err) }

            const layers = createTimelineLayers(app)
            this.layers = layers

            // Insert GPU grid beneath viewport so it doesn't move with panning
            try {
                const grid = createGpuTimeGrid(app)
                this.gpuGrid = grid
                app.stage.addChildAt(grid.container, Math.max(0, app.stage.getChildIndex(layers.viewport)))
            } catch (err) { devLog.warn('createGpuTimeGrid/init failed', err) }

            this.scene = new TimelineSceneManager(layers)
            // Always enable status glyphs; merge with any provided plugins and de-duplicate
            const provided = this.opts.plugins || []
            const pluginSet = new Set<RendererPlugin>(provided)
            pluginSet.add(StatusGlyphPlugin)
            this.scene.setPlugins(Array.from(pluginSet))
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
                        this.scene?.updateTaskHoverAtViewportPoint(local.x, local.y, eff as any, this.opts.utils.getProjectStartDate(), app.screen.width)
                    } catch (err) { devLog.warn('globalpointermove handler error', err) }
                })
                app.stage.on('pointerleave', () => {
                    try {
                        const eff = getEffective()
                        this.scene?.updateHoverAtViewportX(null as any, eff as any, app.screen.height)
                    } catch (err) { devLog.warn('pointerleave handler error', err) }
                })
                app.stage.on('pointerout', () => {
                    try {
                        const eff = getEffective()
                        this.scene?.updateHoverAtViewportX(null as any, eff as any, app.screen.height)
                    } catch (err) { devLog.warn('pointerout handler error', err) }
                })
            } catch (err) { devLog.warn('register pointer handlers failed', err) }
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

    render(data: { tasks: EngineTasks; dependencies: EngineDependencies; staffs: Staff[]; selection: string[] }, viewport: { x: number; y: number; zoom: number }): void {
        if (!this.app || !this.layers || !this.scene) return;

        this._ensureStageHitArea();
        this._updateDataAndViewport(data, viewport);
        const effectiveCfg = this._updateEffectiveConfig(viewport);
        this._renderGrid(data, viewport, effectiveCfg);
        this._updateViewportTransform(viewport, effectiveCfg);

        this._renderTasks(data, viewport, effectiveCfg);
        this._renderDependencies(data, effectiveCfg);
        this._renderSelection(data, effectiveCfg);

        this.scene.rebuildSpatialIndex(effectiveCfg as any);
    }

    private _ensureStageHitArea(): void {
        const app = this.app
        if (!app) return
        const stage: any = app.stage as any
        const w = Math.max(0, app.screen.width)
        const h = Math.max(0, app.screen.height)
        if (!stage.hitArea || stage.hitArea.width !== w || stage.hitArea.height !== h) {
            try { stage.hitArea = new Rectangle(0, 0, w, h) } catch (err) { devLog.warn('update stage.hitArea failed', err) }
        }
    }

    private _updateDataAndViewport(data: { tasks: EngineTasks; dependencies: EngineDependencies; staffs: Staff[]; selection: string[] }, viewport: ViewportState): void {
        this.currentData = { tasks: data.tasks, dependencies: data.dependencies, staffs: data.staffs };
        this.getViewport = () => viewport;
        this.setViewport = (v) => { try { this.opts.callbacks.onViewportChange?.(v) } catch (err) { devLog.warn('onViewportChange callback failed', err) } };
        this.scene?.setZoom(viewport.zoom || 1);
    }

    private _updateEffectiveConfig(viewport: ViewportState): TimelineConfig {
        const cfg = this.opts.config;
        return computeEffectiveConfig(cfg as any, viewport.zoom, this.verticalScale);
    }



    private _renderGrid(data: { staffs: Staff[] }, viewport: ViewportState, effectiveCfg: TimelineConfig): void {
        if (!this.app) return;
        const alignment = computeViewportAlignment(effectiveCfg as any, viewport.x || 0);
        this.gridManager?.ensure(this.layers!.background, effectiveCfg as any, data.staffs, this.opts.utils.getProjectStartDate(), this.app.screen.width, this.app.screen.height, viewport.zoom, alignment);
        this.scene?.updateTodayMarker(this.opts.utils.getProjectStartDate(), effectiveCfg as any, alignment, this.app.screen.height);
        this._updateGpuGrid(viewport, effectiveCfg);
    }

    private _updateGpuGrid(viewport: ViewportState, effectiveCfg: TimelineConfig): void {
        const gpuGrid = this.gpuGrid;
        if (!gpuGrid || !this.app) return;

        try {
            const screenW = this.app.screen.width;
            const screenH = this.app.screen.height;
            const cfgEff = effectiveCfg as any;
            const projectStart = this.opts.utils.getProjectStartDate();
            const gp = getGridParamsForZoom(viewport.zoom || 1, projectStart);

            gpuGrid.container.visible = true;
            gpuGrid.setSize(screenW, screenH);
            const alignment = computeViewportAlignment(cfgEff as any, viewport.x || 0);
            const res = (this.app.renderer as any).resolution ?? (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1);
            gpuGrid.updateUniforms({
                screenWidth: screenW,
                screenHeight: screenH,
                leftMarginPx: cfgEff.LEFT_MARGIN * res,
                viewportXDays: alignment.viewportXDaysQuantized,
                dayWidthPx: cfgEff.DAY_WIDTH * res,
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
                bandAlpha: gp.scaleType === 'day' || gp.scaleType === 'week' ? 0.04 : 0.0,
            });
        } catch (err) {
            devLog.warn('gpuGrid.updateUniforms failed', err);
        }
    }

    private _updateViewportTransform(viewport: ViewportState, effectiveCfg: TimelineConfig): void {
        if (!this.layers) return;
        const alignment = computeViewportAlignment(effectiveCfg as any, viewport.x || 0);
        this.layers.viewport.x = Number.isFinite(alignment.viewportPixelOffsetX) ? alignment.viewportPixelOffsetX : 0;
        this.layers.viewport.y = Math.round(Number.isFinite(-viewport.y) ? -viewport.y : 0);
        this.layers.viewport.scale.set(1, 1);
    }

    private _renderTasks(data: { tasks: EngineTasks; staffs: Staff[]; selection: string[] }, viewport: ViewportState, effectiveCfg: TimelineConfig): void {
        if (!this.scene) return;
        const projectStartDate = this.opts.utils.getProjectStartDate();
        const currentIds = new Set(Object.keys(data.tasks));
        for (const task of Object.values(data.tasks)) {
            const layout = computeTaskLayout(effectiveCfg as any, task, projectStartDate, data.staffs);
            const isSelected = data.selection.includes(task.id);
            const { container } = this.scene.upsertTask(task, layout, effectiveCfg as any, task.title, task.status, viewport.zoom, isSelected);
            container.position.set(Math.round(layout.startX), Math.round(layout.topY));
            container.hitArea = new Rectangle(0, 0, layout.width, effectiveCfg.TASK_HEIGHT);
            if (this.dnd) this.dnd.registerTask(task, container, layout);
        }
        this.scene.removeMissingTasks(currentIds);
    }

    private _renderDependencies(data: { dependencies: EngineDependencies }, effectiveCfg: TimelineConfig): void {
        if (!this.scene) return;
        const currentDepIds = new Set(Object.keys(data.dependencies));
        for (const dependency of Object.values(data.dependencies)) {
            const srcA = this.scene.getAnchors(dependency.srcTaskId);
            const dstA = this.scene.getAnchors(dependency.dstTaskId);
            if (!srcA || !dstA) continue;
            const g = this.scene.upsertDependency(dependency.id);
            drawDependencyArrow(g, srcA.rightCenterX, srcA.rightCenterY, dstA.leftCenterX, dstA.leftCenterY, effectiveCfg.DEPENDENCY_COLOR);
        }
        this.scene.removeMissingDependencies(currentDepIds);
    }

    private _renderSelection(data: { selection: string[] }, effectiveCfg: TimelineConfig): void {
        if (!this.scene) return;
        this.scene.clearSelection();
        for (const id of data.selection) {
            this.scene.drawSelection(id, effectiveCfg as any);
        }
    }

    getApplication(): Application | null { return this.app }
    getViewportContainer(): Container | null { return this.layers?.viewport || null }
    // Expose current effective horizontal scale to host for snapping
    getViewportScale(): number { return this.getViewport().zoom || 1 }

    destroy(): void {
        safeCall('dnd.destroy failed', () => { this.dnd?.destroy() })
        safeCall('panzoom.destroy failed', () => { this.panzoom?.destroy() })
        this.dnd = null
        this.panzoom = null
        const app = this.app
        if (app) {
            safeCall('app.ticker.stop failed', () => { app.ticker.stop() })
            safeCall('stage.removeAllListeners failed', () => { app.stage.removeAllListeners() })
            safeCall('app.destroy failed', () => { app.destroy(true, { children: true, texture: true, textureSource: true, context: true }) })
        }
        safeCall('scene.destroy failed', () => { this.scene?.destroy() })
        this.layers = null
        this.scene = null
        this.app = null
        this.isInitialized = false
        this.tickerAdded = false
    }
}
