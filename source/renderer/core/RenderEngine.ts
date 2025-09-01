/**
 * RenderEngine Core
 * Main rendering engine for the timeline visualization
 */

import { Application, Container, Rectangle } from 'pixi.js'
import { SceneGraph } from './SceneGraph'
import { Viewport } from './Viewport'
import type { Task, Dependency, Staff } from '../../core/domain/entities/Task'
import type { TimelineConfig } from '../../infrastructure/persistence/redux/slices/timelineSlice'

export interface RenderEngineOptions {
    canvas: HTMLCanvasElement
    projectId: string
    config: TimelineConfig
    plugins?: RendererPlugin[]
}

export interface RendererPlugin {
    name: string
    init(engine: RenderEngine): void
    destroy(): void
}

export interface RenderData {
    tasks: Record<string, any>
    dependencies: Record<string, any>
    staffs: any[]
    selection: string[]
}

export class RenderEngine {
    private app: Application | null = null
    private scene: SceneGraph | null = null
    private viewport: Viewport | null = null
    private layers: {
        viewport: Container
        background: Container
        dependencies: Container
        tasks: Container
        selection: Container
        dragLayer: Container
    } | null = null

    private plugins: RendererPlugin[] = []
    private isInitialized = false
    private initializing = false
    private currentData: RenderData = {
        tasks: {},
        dependencies: {},
        staffs: [],
        selection: []
    }

    constructor(private readonly options: RenderEngineOptions) {
        this.plugins = options.plugins || []
    }

    async init(): Promise<void> {
        if (this.initializing || this.isInitialized) return
        this.initializing = true

        try {
            // Create PIXI Application
            this.app = new Application()
            await this.app.init({
                canvas: this.options.canvas,
                backgroundColor: 0xffffff,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                resizeTo: this.options.canvas.parentElement as HTMLElement
            })

            // Create layers
            this.layers = this.createLayers()

            // Create scene graph
            this.scene = new SceneGraph({
                app: this.app,
                layers: this.layers,
                config: this.options.config
            })

            // Create viewport
            this.viewport = new Viewport({
                app: this.app,
                container: this.layers.viewport,
                config: this.options.config
            })

            // Initialize plugins
            for (const plugin of this.plugins) {
                plugin.init(this)
            }

            // Set up stage hit area
            this.updateStageHitArea()

            // Start render loop
            this.app.ticker.add(() => {
                // Render loop is handled by PIXI automatically
                // We can add custom logic here if needed
            })

            this.isInitialized = true
        } finally {
            this.initializing = false
        }
    }

    private createLayers(): typeof this.layers {
        const viewport = new Container()
        viewport.name = 'viewport'
        this.app!.stage.addChild(viewport)

        const background = new Container()
        background.name = 'background'
        viewport.addChild(background)

        const dependencies = new Container()
        dependencies.name = 'dependencies'
        viewport.addChild(dependencies)

        const tasks = new Container()
        tasks.name = 'tasks'
        viewport.addChild(tasks)

        const selection = new Container()
        selection.name = 'selection'
        viewport.addChild(selection)

        const dragLayer = new Container()
        dragLayer.name = 'dragLayer'
        viewport.addChild(dragLayer)

        return {
            viewport,
            background,
            dependencies,
            tasks,
            selection,
            dragLayer
        }
    }

    private updateStageHitArea(): void {
        if (!this.app) return

        const stage = this.app.stage as any
        const w = Math.max(0, this.app.screen.width)
        const h = Math.max(0, this.app.screen.height)

        if (!stage.hitArea || stage.hitArea.width !== w || stage.hitArea.height !== h) {
            try {
                stage.hitArea = new Rectangle(0, 0, w, h)
            } catch (err) {
                console.warn('Failed to update stage hit area:', err)
            }
        }
    }

    render(data: RenderData, viewportState: { x: number; y: number; zoom: number }): void {
        if (!this.app || !this.layers || !this.scene || !this.viewport) return

        // Update current data
        this.currentData = data

        // Update stage hit area
        this.updateStageHitArea()

        // Update viewport
        this.viewport.update(viewportState)

        // Update scene
        this.scene.update(data, viewportState)
    }

    getApplication(): Application | null {
        return this.app
    }

    getViewportContainer(): Container | null {
        return this.layers?.viewport || null
    }

    getScene(): SceneGraph | null {
        return this.scene
    }

    getViewport(): Viewport | null {
        return this.viewport
    }

    getLayers(): typeof this.layers {
        return this.layers
    }

    getCurrentData(): RenderData {
        return this.currentData
    }

    resize(width: number, height: number): void {
        if (!this.app) return

        this.app.renderer.resize(width, height)
        this.updateStageHitArea()

        // Notify viewport of resize
        this.viewport?.handleResize(width, height)
    }

    destroy(): void {
        // Destroy plugins
        for (const plugin of this.plugins) {
            try {
                plugin.destroy()
            } catch (err) {
                console.warn(`Failed to destroy plugin ${plugin.name}:`, err)
            }
        }

        // Destroy viewport
        this.viewport?.destroy()
        this.viewport = null

        // Destroy scene
        this.scene?.destroy()
        this.scene = null

        // Destroy layers
        if (this.layers) {
            Object.values(this.layers).forEach(layer => {
                layer.destroy({ children: true })
            })
            this.layers = null
        }

        // Destroy PIXI app
        if (this.app) {
            this.app.ticker.stop()
            this.app.stage.removeAllListeners()
            this.app.destroy(true, {
                children: true,
                texture: true,
                textureSource: true,
                context: true
            })
            this.app = null
        }

        this.isInitialized = false
    }
}
