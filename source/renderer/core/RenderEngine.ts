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

            await this.app.init({
                canvas: this.options.canvas,
                backgroundColor: 0xf5f5f5,
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

        this.viewportState = state

        // Apply transformation to root container
        this.layers.root.position.set(state.x, state.y)
        this.layers.root.scale.set(state.zoom, state.zoom * (state.verticalScale || 1))
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
