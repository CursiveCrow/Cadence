import { Application, Container, Rectangle } from 'pixi.js'
import { TimelineSceneManager, type TimelineConfig, type RendererPlugin } from './scene'
import { TimelineDnDController } from './dnd'
import { PanZoomController, ViewportState } from './panzoom'
import { GpuTimeGrid } from '../rendering/grid/gpuGrid'
import { computeEffectiveConfig, snapXToTimeWithConfig, computeViewportAlignment } from '../utils/layout'
import { updateGpuGrid } from '../rendering/renderers/gridRenderer'
import { renderTasks } from '../rendering/renderers/tasksRenderer'
import { renderDependencies } from '../rendering/renderers/dependenciesRenderer'
import { renderSelection } from '../rendering/renderers/selectionRenderer'
import { createPanZoomController } from '../rendering/renderers/panzoomWiring'
import { rebuildSceneIndex } from '../rendering/renderers/sceneIndexing'
import { GridManager } from '../rendering/grid/gridManager'
import { initializeEngine } from './engineInit'
import { devLog, safeCall } from '../utils/devlog'
import { PAN_ZOOM_CONFIG, CONSTANTS } from '@cadence/config'

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
        const clamped = Math.max(PAN_ZOOM_CONFIG.VERTICAL_SCALE_MIN, Math.min(PAN_ZOOM_CONFIG.VERTICAL_SCALE_MAX, scale))
        this.verticalScale = clamped
        try { this.opts.callbacks.onVerticalScaleChange?.(clamped) } catch (err) { devLog.warn('onVerticalScaleChange callback failed', err) }
    }

    getVerticalScale(): number { return this.verticalScale }

    async init(): Promise<void> {
        if (this.initializing || this.isInitialized) return
        this.initializing = true
        try {
            const getEffective = () => {
                const vp = this.getViewport()
                return computeEffectiveConfig(this.opts.config as any, vp.zoom || 1, this.getVerticalScale()) as any
            }
            const init = await initializeEngine(this.opts.canvas, this.opts.config, this.opts.plugins, {
                getEffectiveConfig: getEffective,
                getProjectStartDate: () => this.opts.utils.getProjectStartDate()
            })
            this.app = init.app
            this.layers = init.layers
            this.scene = init.scene
            this.gpuGrid = init.gpuGrid
            this.gridManager = new GridManager()
            this.dnd = new TimelineDnDController({
                app: this.app!,
                layers: this.layers!,
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
                    return Math.max(CONSTANTS.DEFAULT_TASK_HEIGHT, Math.round(cfg.TASK_HEIGHT * this.getVerticalScale()))
                },
                // Vertical snapping uses scaled config from the current render
                getScaledConfig: () => ({
                    TOP_MARGIN: Math.round(this.opts.config.TOP_MARGIN * this.getVerticalScale()),
                    STAFF_SPACING: Math.max(20, Math.round(this.opts.config.STAFF_SPACING * this.getVerticalScale())),
                    STAFF_LINE_SPACING: Math.max(8, Math.round(this.opts.config.STAFF_LINE_SPACING * this.getVerticalScale())),
                })
            })

            // Attach reusable pan/zoom that delegates viewport updates to host
            this.panzoom = createPanZoomController({
                app: this.app!,
                viewportContainer: this.layers!.viewport,
                getViewport: () => this.getViewport(),
                setViewport: (v) => this.setViewport(v),
                getPixelsPerDayBase: () => this.opts.config.DAY_WIDTH,
                getVerticalScale: () => this.getVerticalScale(),
                setVerticalScale: (s: number) => this.setVerticalScale(s)
            })

            if (!this.tickerAdded && this.app) {
                this.tickerAdded = true
                this.app.ticker.add(() => {
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

        this._updateUIMetrics(effectiveCfg);
        this._renderGrid(data, viewport, effectiveCfg);
        this._updateViewportTransform(viewport, effectiveCfg);

        this._renderTasks(data, viewport, effectiveCfg);
        this._renderDependencies(data, effectiveCfg);
        this._renderSelection(data, effectiveCfg);

        rebuildSceneIndex(this.scene, effectiveCfg as any);
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

    private _updateUIMetrics(_: TimelineConfig): void {
        // No-op: Previously used to feed UI header via global metrics; header now asks layout for alignment directly.
    }

    private _renderGrid(data: { staffs: Staff[] }, viewport: ViewportState, effectiveCfg: TimelineConfig): void {
        if (!this.app) return;
        const alignment = computeViewportAlignment(effectiveCfg as any, viewport.x || 0);
        this.gridManager?.ensure(this.layers!.background, effectiveCfg as any, data.staffs, this.opts.utils.getProjectStartDate(), this.app.screen.width, this.app.screen.height, viewport.zoom, alignment, true);
        // today marker handled in scene in original; optional here
        this._updateGpuGrid(viewport, effectiveCfg);
    }

    private _updateGpuGrid(viewport: ViewportState, effectiveCfg: TimelineConfig): void {
        const gpuGrid = this.gpuGrid;
        if (!gpuGrid || !this.app) return;

        try { updateGpuGrid(this.app, gpuGrid, viewport, effectiveCfg, () => this.opts.utils.getProjectStartDate()) } catch (err) { devLog.warn('gpuGrid.update failed', err) }
    }

    private _updateViewportTransform(viewport: ViewportState, effectiveCfg: TimelineConfig): void {
        if (!this.layers) return;
        const alignment = computeViewportAlignment(effectiveCfg as any, viewport.x || 0);
        this.layers.viewport.x = Number.isFinite(alignment.viewportPixelOffsetX) ? alignment.viewportPixelOffsetX : 0;
        this.layers.viewport.y = Math.round(Number.isFinite(-viewport.y) ? -viewport.y : 0);
        this.layers.viewport.scale.set(1, 1);
    }

    private _renderTasks(data: { tasks: EngineTasks; staffs: Staff[]; selection: string[] }, viewport: ViewportState, effectiveCfg: TimelineConfig): void {
        renderTasks(this.scene, this.dnd, data as any, viewport, effectiveCfg, () => this.opts.utils.getProjectStartDate())
    }

    private _renderDependencies(data: { dependencies: EngineDependencies }, effectiveCfg: TimelineConfig): void {
        renderDependencies(this.scene, data.dependencies as any, effectiveCfg)
    }

    private _renderSelection(data: { selection: string[] }, effectiveCfg: TimelineConfig): void {
        renderSelection(this.scene, data.selection, effectiveCfg)
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
