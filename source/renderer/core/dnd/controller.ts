import { Application, Container, Graphics, Rectangle } from 'pixi.js'
import { TimelineSceneManager } from '../scene'
import type { TimelineConfig, TaskLayout } from '../types/renderer'
import { DndState, createInitialState } from './state'
import { DnDOptions, Layers, Utils, DataProviders, Callbacks } from './types'
import { onDownTask, onMove, onUp, onTap, onUpWindow, onContextMenu, onStageDown } from './handlers'
import { computeMinAllowedDayIndex, findNearestStaffLineScaled, findTaskAtGlobal, resolveTaskIdFromHit } from './utils'
import { Task } from '@cadence/core'

export class TimelineDnDController {
    app: Application
    layers: Layers
    scene: TimelineSceneManager
    config: TimelineConfig
    projectId: string
    utils: Utils
    data: DataProviders
    callbacks: Callbacks
    getDayWidthFn?: () => number
    getTaskHeightFn?: () => number
    getScaledConfigFn?: () => { TOP_MARGIN: number; STAFF_SPACING: number; STAFF_LINE_SPACING: number }

    dragPreview: Graphics | null = null
    dependencyPreview: Graphics | null = null
    backgroundHitRect: Graphics | null = null

    state: DndState

    // Re-bindable handler instances
    onDownTaskHandler = onDownTask.bind(this)
    onMoveHandler = onMove.bind(this)
    onUpHandler = onUp.bind(this)
    onTapHandler = onTap.bind(this)
    onUpWindowHandler = onUpWindow.bind(this)
    onContextMenuHandler = onContextMenu.bind(this)
    onStageDownHandler = onStageDown.bind(this)

    constructor(opts: DnDOptions) {
        this.app = opts.app
        this.layers = opts.layers
        this.scene = opts.scene
        this.config = opts.config
        this.projectId = opts.projectId
        this.utils = opts.utils
        this.data = opts.data
        this.callbacks = opts.callbacks
        this.getDayWidthFn = opts.getDayWidth
        this.getTaskHeightFn = opts.getTaskHeight
        this.getScaledConfigFn = opts.getScaledConfig

        this.state = createInitialState()

        this.attach()
    }

    destroy(): void {
        this.app.stage.off('globalpointermove', this.onMoveHandler)
        this.app.stage.off('globalpointerup', this.onUpHandler)
        this.app.stage.off('pointerup', this.onUpHandler)
        this.app.stage.off('pointerupoutside', this.onUpHandler)
        this.app.stage.off('pointertap', this.onTapHandler)
        this.app.stage.off('rightup', this.onUpHandler)
        this.app.stage.off('rightupoutside', this.onUpHandler)
        this.app.stage.off('pointerdown', this.onStageDownHandler)
        this.layers.viewport.off('pointerdown', this.onStageDownHandler as any)
        if (typeof window !== 'undefined') {
            window.removeEventListener('pointerup', this.onUpWindowHandler as any, true)
            window.removeEventListener('mouseup', this.onUpWindowHandler as any, true)
        }
        if (this.app.view) {
            (this.app.view as HTMLCanvasElement).removeEventListener('contextmenu', this.onContextMenuHandler as any, true)
        }
    }

    registerTask(task: Task, container: Container, layout: TaskLayout): void {
        container.eventMode = 'static'
        container.cursor = 'pointer'
        const taskHReg = this.getTaskHeightFn ? this.getTaskHeightFn() : this.config.TASK_HEIGHT
        container.hitArea = new Rectangle(0, 0, layout.width, taskHReg)

        if (!(container as any).__wired) {
            container.on('pointermove', (event) => {
                const localPos = container.toLocal((event as any).global)
                const relativeX = localPos.x
                const currentLayout = this.scene.taskLayouts.get((task as any).id)
                const widthNow = currentLayout ? currentLayout.width : layout.width
                const isNearRightEdge = relativeX > widthNow - 10 && relativeX >= 0
                container.cursor = isNearRightEdge ? 'ew-resize' : 'grab'
            })
            container.on('pointerout', () => {
                if (!this.state.isDragging && !this.state.isResizing) container.cursor = 'pointer'
            })
            container.on('rightclick', (e) => { (e as any).preventDefault?.() })
            container.on('contextmenu', (e) => { (e as any).preventDefault?.() })
            container.on('pointerdown', (event) => this.onDownTaskHandler(event as any, task, container))
            container.on('rightdown', () => {
                this.state.isCreatingDependency = true
                this.state.dependencySourceTaskId = (task as any).id
                this.callbacks.onDragStart && this.callbacks.onDragStart()
            })
                ; (container as any).__wired = true
        }
    }

    private attach(): void {
        this.app.stage.eventMode = 'static'
        this.app.stage.off('globalpointermove', this.onMoveHandler)
        this.app.stage.off('globalpointerup', this.onUpHandler)
        this.app.stage.off('pointerup', this.onUpHandler)
        this.app.stage.off('pointerupoutside', this.onUpHandler)
        this.app.stage.off('rightup', this.onUpHandler)
        this.app.stage.off('rightupoutside', this.onUpHandler)
        this.app.stage.on('globalpointermove', this.onMoveHandler)
        this.app.stage.on('globalpointerup', this.onUpHandler)
        this.app.stage.on('pointerup', this.onUpHandler)
        this.app.stage.on('pointerupoutside', this.onUpHandler)
        this.app.stage.on('pointertap', this.onTapHandler)
        this.app.stage.on('rightup', this.onUpHandler)
        this.app.stage.on('rightupoutside', this.onUpHandler)
        this.app.stage.on('pointerdown', this.onStageDownHandler)
        this.layers.viewport.on('pointerdown', this.onStageDownHandler as any)
        if (typeof window !== 'undefined') {
            window.addEventListener('pointerup', this.onUpWindowHandler as any, true)
            window.addEventListener('mouseup', this.onUpWindowHandler as any, true)
        }
        if (this.app.view) {
            (this.app.view as HTMLCanvasElement).addEventListener('contextmenu', this.onContextMenuHandler as any, true)
        }
        this.ensureBackgroundHitRect()
    }

    private ensureBackgroundHitRect(): void {
        if (!this.backgroundHitRect) {
            this.backgroundHitRect = new Graphics()
            this.backgroundHitRect.alpha = 0
                ; (this.backgroundHitRect as any).eventMode = 'none'
            this.layers.background.addChildAt(this.backgroundHitRect, 0)
        }
        const w = Math.max(this.app.screen.width * 4, 10000)
        const h = Math.max(this.app.screen.height * 4, 10000)
        const x = -w / 2
        const y = -h / 2
        this.backgroundHitRect.clear()
        this.backgroundHitRect.rect(x, y, w, h)
        this.backgroundHitRect.fill({ color: 0x000000, alpha: 0 })
        this.backgroundHitRect.hitArea = new Rectangle(x, y, w, h)
    }

    resetState(): void {
        this.state = createInitialState()
    }

    resetCursor(): void {
        this.app.renderer?.events?.setCursor?.(null as any)
    }

    // Forwarded utils for handlers
    findNearestStaffLineScaled = (y: number, scaled: { TOP_MARGIN: number; STAFF_SPACING: number; STAFF_LINE_SPACING: number }) => findNearestStaffLineScaled(y, scaled, this.data)
    findTaskAtGlobal = (global: { x: number; y: number }, excludeId?: string) => findTaskAtGlobal(global, this.scene, excludeId)
    resolveTaskIdFromHit = (hit: any) => resolveTaskIdFromHit(hit, this.scene)
    computeMinAllowedDayIndex = (taskId: string) => computeMinAllowedDayIndex(taskId, this.data, this.utils)
}


