/**
 * RenderEngine Core
 * Low-level PixiJS rendering engine for timeline visualization
 * This module ONLY handles canvas rendering, not UI interactions
 */

import { Application, Container, Graphics, Rectangle, Renderer } from 'pixi.js'
import type { TimelineConfig } from '../../infrastructure/persistence/redux/slices/timelineSlice'
import { GridRenderer } from '../components/GridRenderer'
import { DependencyRenderer } from '../components/DependencyRenderer'
import { TaskRenderer } from '../components/TaskRenderer'
import type { Task } from '../../core/domain/entities/Task'
import type { Dependency } from '../../core/domain/entities/Dependency'
import type { Staff } from '../../core/domain/entities/Staff'

export interface RenderEngineOptions {
    canvas: HTMLCanvasElement
    config: TimelineConfig
    preferWebGPU?: boolean
    taskInteractions?: {
        onPointerDown?: (args: { taskId: string; globalX: number; globalY: number; localX: number; localY: number; button?: number; layoutWidth?: number }) => void
        onPointerUp?: (args: { taskId: string; globalX: number; globalY: number }) => void
        onPointerEnter?: (args: { taskId: string }) => void
        onPointerLeave?: (args: { taskId: string }) => void
    }
}

export interface ViewportState {
    x: number
    y: number
    zoom: number
    verticalScale?: number
}

export interface RenderData {
    tasks: Record<string, Task>
    dependencies: Record<string, Dependency>
    staffs: Staff[]
    selection?: string[]
    projectStartDate?: Date
}

/**
 * Core rendering engine using PixiJS
 * Handles only low-level canvas operations
 */
export class RenderEngine {
    private app: Application | null = null
    private layers: {
        root: Container
        grid: Container
        staffLines: Container
        tasks: Container
        dependencies: Container
        overlay: Container
    } | null = null

    private initialized = false
    private viewportState: ViewportState = { x: 0, y: 0, zoom: 1 }

    // Renderers
    private gridRenderer: GridRenderer | null = null
    private taskRenderer: TaskRenderer | null = null
    private dependencyRenderer: DependencyRenderer | null = null
    private overlayRefs: { drag?: Graphics; dep?: Graphics } = {}

    constructor(private options: RenderEngineOptions) { }

    /**
     * Initialize the PixiJS application with WebGPU support if available
     */
    async init(): Promise<void> {
        if (this.initialized) return

        try {
            // Check for WebGPU availability
            const preferWebGPU = this.options.preferWebGPU !== false
            let rendererType: 'webgpu' | 'webgl' = 'webgl'

            if (preferWebGPU && 'gpu' in navigator) {
                try {
                    const adapter = await (navigator as any).gpu.requestAdapter()
                    if (adapter) {
                        rendererType = 'webgpu'
                        console.log('Using WebGPU renderer')
                    }
                } catch (e) {
                    console.log('WebGPU not available, falling back to WebGL')
                }
            }

            // Create PIXI Application
            this.app = new Application()

            const bg = (this.options.config as any)?.BACKGROUND_COLOR ?? 0x0f1115
            await this.app.init({
                canvas: this.options.canvas,
                backgroundColor: bg,
                backgroundAlpha: 1,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                preference: rendererType,
                powerPreference: 'high-performance',
                resizeTo: this.options.canvas.parentElement as HTMLElement
            })

            // Create layer hierarchy
            this.createLayers()

            // Set up stage interaction
            this.app.stage.eventMode = 'static'
            this.app.stage.hitArea = new Rectangle(
                0, 0,
                this.app.screen.width,
                this.app.screen.height
            )

            this.initialized = true
        } catch (error) {
            console.error('Failed to initialize render engine:', error)
            throw error
        }
    }

    /**
     * Create rendering layers
     */
    private createLayers(): void {
        if (!this.app) return

        const root = new Container()
            ; (root as any).label = 'root'

        const grid = new Container()
            ; (grid as any).label = 'grid'

        const staffLines = new Container()
            ; (staffLines as any).label = 'staffLines'

        const tasks = new Container()
            ; (tasks as any).label = 'tasks'

        const dependencies = new Container()
            ; (dependencies as any).label = 'dependencies'

        const overlay = new Container()
            ; (overlay as any).label = 'overlay'

        // Add layers in rendering order
        root.addChild(grid)
        root.addChild(staffLines)
        root.addChild(dependencies)
        root.addChild(tasks)
        root.addChild(overlay)

        this.app.stage.addChild(root)

        this.layers = {
            root,
            grid,
            staffLines,
            tasks,
            dependencies,
            overlay
        }

        // Initialize renderers with their respective containers
        this.gridRenderer = new GridRenderer({
            container: grid,
            projectStartDate: new Date(),
            staffs: [],
            viewportState: this.viewportState,
            screenWidth: this.app.screen.width,
            screenHeight: this.app.screen.height,
            config: this.options.config as any
        })

        this.taskRenderer = new TaskRenderer({
            container: tasks,
            config: this.options.config as any
        })
        if (this.options.taskInteractions) {
            this.taskRenderer.setInteractionHandlers(this.options.taskInteractions)
        }

        this.dependencyRenderer = new DependencyRenderer({
            container: dependencies,
            dependencies: [],
            getTaskAnchors: (taskId) => this.taskRenderer?.getTaskAnchors(taskId)
        })
    }

    /**
     * Update viewport transformation
     */
    updateViewport(state: ViewportState): void {
        if (!this.layers) return

        // Store state; renderers use zoom/verticalScale to compute positions and sizes.
        // We intentionally avoid scaling/offsetting the stage so left margin and UI remain crisp.
        this.viewportState = state
    }

    /**
     * Get layer containers for external rendering
     */
    getLayers() {
        return this.layers
    }

    /**
     * Get PIXI application instance
     */
    getApp() {
        return this.app
    }

    /**
     * Get current viewport state
     */
    getViewportState() {
        return this.viewportState
    }

    /**
     * Overlays: drag preview rectangle
     */
    showDragPreview(x: number, y: number, width: number, height: number): void {
        if (!this.layers) return
        const g = this.overlayRefs.drag || new Graphics()
        g.clear()
        g.roundRect(x - 1, y - 1, Math.max(1, width) + 2, Math.max(1, height) + 2, Math.min(height / 2 + 2, 20))
        g.stroke({ width: 2, color: 0x8b5cf6, alpha: 0.95 })
        g.fill({ color: 0x8b5cf6, alpha: 0.14 })
        if (!this.overlayRefs.drag) {
            this.layers.overlay.addChild(g)
            this.overlayRefs.drag = g
        }
    }

    /**
     * Overlays: dependency preview from a source task to a point
     */
    showDependencyPreview(srcTaskId: string, dstX: number, dstY: number): void {
        if (!this.layers) return
        const anchors = this.taskRenderer?.getTaskAnchors(srcTaskId)
        if (!anchors) return
        const g = this.overlayRefs.dep || new Graphics()
        g.clear()
        // Line from right-center to target
        g.moveTo(anchors.rightCenterX, anchors.rightCenterY)
        g.lineTo(dstX, dstY)
        g.stroke({ width: 2, color: 0x8b5cf6, alpha: 0.9 })
        // Arrowhead
        const angle = Math.atan2(dstY - anchors.rightCenterY, dstX - anchors.rightCenterX)
        const arrow = 8
        g.moveTo(dstX, dstY)
        g.lineTo(dstX - arrow * Math.cos(angle - Math.PI / 6), dstY - arrow * Math.sin(angle - Math.PI / 6))
        g.lineTo(dstX - arrow * Math.cos(angle + Math.PI / 6), dstY - arrow * Math.sin(angle + Math.PI / 6))
        g.closePath()
        g.fill({ color: 0x8b5cf6, alpha: 0.85 })
        if (!this.overlayRefs.dep) {
            this.layers.overlay.addChild(g)
            this.overlayRefs.dep = g
        }
    }

    clearOverlayPreviews(): void {
        if (!this.layers) return
        if (this.overlayRefs.drag) {
            this.layers.overlay.removeChild(this.overlayRefs.drag)
            this.overlayRefs.drag.destroy()
            this.overlayRefs.drag = undefined
        }
        if (this.overlayRefs.dep) {
            this.layers.overlay.removeChild(this.overlayRefs.dep)
            this.overlayRefs.dep.destroy()
            this.overlayRefs.dep = undefined
        }
    }

    getTaskAnchors(taskId: string) {
        return this.taskRenderer?.getTaskAnchors(taskId)
    }

    /**
     * Main render method - renders all visual elements
     */
    render(data: RenderData, viewport?: ViewportState): void {
        if (!this.app || !this.layers) return

        // Update viewport if provided
        if (viewport) {
            this.updateViewport(viewport)
        }

        // Extract data
        const tasks = Object.values(data.tasks || {})
        const dependencies = Object.values(data.dependencies || {})
        const staffs = data.staffs || []
        const projectStartDate = data.projectStartDate || new Date()

        // Update and render grid
        if (this.gridRenderer) {
            this.gridRenderer.updateOptions({
                projectStartDate,
                staffs,
                viewportState: this.viewportState,
                screenWidth: this.app.screen.width,
                screenHeight: this.app.screen.height
            })
            this.gridRenderer.render()
        }

        // Update and render tasks
        if (this.taskRenderer) {
            this.taskRenderer.updateTasks(tasks)
            this.taskRenderer.render({
                projectStartDate,
                staffs,
                viewportState: this.viewportState,
                selectedTaskIds: data.selection || []
            })
        }

        // Update and render dependencies
        if (this.dependencyRenderer) {
            this.dependencyRenderer.updateOptions({
                dependencies,
                selectedIds: data.selection || []
            })
            this.dependencyRenderer.render()
        }
    }

    /**
     * Handle canvas resize
     */
    resize(width: number, height: number): void {
        if (!this.app) return

        this.app.renderer.resize(width, height)

        // Update stage hit area
        this.app.stage.hitArea = new Rectangle(0, 0, width, height)
    }

    /**
     * Check if engine is initialized
     */
    isInitialized(): boolean {
        return this.initialized
    }

    /**
     * Destroy the rendering engine
     */
    destroy(): void {
        // Destroy renderers
        if (this.gridRenderer) {
            this.gridRenderer.destroy()
            this.gridRenderer = null
        }

        if (this.taskRenderer) {
            this.taskRenderer.destroy()
            this.taskRenderer = null
        }

        if (this.dependencyRenderer) {
            this.dependencyRenderer.destroy()
            this.dependencyRenderer = null
        }

        // Destroy layers
        if (this.layers) {
            Object.values(this.layers).forEach(layer => {
                layer.destroy({ children: true })
            })
            this.layers = null
        }

        // Destroy PIXI app
        if (this.app) {
            this.app.destroy(true, {
                children: true,
                texture: true
            })
            this.app = null
        }

        this.initialized = false
    }
}

export default RenderEngine
