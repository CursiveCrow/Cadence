import { Application, Container } from 'pixi.js'

// PixiJS application lifecycle management
export class PixiApplication {
    private app: Application | null = null
    private canvas: HTMLCanvasElement
    private root: Container | null = null
    private layers: {
        viewport: Container
        background: Container
        tasks: Container
        dependencies: Container
        hud: Container
    } | null = null
    private hudPersistent: Container | null = null
    private ready = false

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
    }

    // Initialize PixiJS application
    async initialize(): Promise<boolean> {
        try {
            const rect = this.canvas.getBoundingClientRect()
            const width = Math.max(rect.width, 1) || window.innerWidth
            const height = Math.max(rect.height, 1) || window.innerHeight

            const app = new Application()
            await app.init({
                canvas: this.canvas as any,
                width,
                height,
                resolution: Math.max(1, Math.min(2, (window.devicePixelRatio || 1))),
                autoDensity: true,
                antialias: true,
                clearBeforeRender: true,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance',
                resizeTo: (this.canvas.parentElement || window) as any,
                eventFeatures: { move: true, click: true, wheel: true, globalMove: true },
                hello: false,
            })

            this.app = app
            this.root = app.stage

            // Create layer hierarchy
            this.setupLayers()

            this.ready = true
            return true
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[PixiApplication]initialize failed', err)
            return false
        }
    }

    private setupLayers() {
        if (!this.root) return

        const viewport = new Container()
        const background = new Container()
        const tasks = new Container()
        const dependencies = new Container()
        const hudPersistent = new Container()
        const hud = new Container()

        // Build layer hierarchy
        viewport.addChild(background)
        viewport.addChild(dependencies)
        viewport.addChild(tasks)
        this.root.addChild(viewport)

        // persistent HUD first (backgrounds, gradients), then dynamic HUD on top
        this.root.addChild(hudPersistent)
        this.root.addChild(hud)

        this.layers = { viewport, background, tasks, dependencies, hud }
        this.hudPersistent = hudPersistent
    }

    // Resize the application
    resize(): boolean {
        if (!this.app || !this.ready) return false

        try {
            this.app.renderer.resize(
                this.canvas.clientWidth || 1,
                this.canvas.clientHeight || 1
            )
            return true
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[PixiApplication]resize', err)
            return false
        }
    }

    // Get screen dimensions
    getScreenDimensions(): { width: number; height: number } {
        if (!this.app) return { width: 1, height: 1 }

        return {
            width: Math.max(1, this.app.screen.width),
            height: Math.max(1, this.app.screen.height)
        }
    }

    // Get layer containers
    getLayers() {
        return this.layers
    }

    // Get persistent HUD container
    getHudPersistent() {
        return this.hudPersistent
    }

    // Get root container
    getRoot() {
        return this.root
    }

    // Get PixiJS application instance
    getApp() {
        return this.app
    }

    // Check if application is ready
    isReady(): boolean {
        return this.ready && this.app !== null && this.layers !== null
    }

    // Clear all containers
    clearContainers() {
        if (!this.layers) return

        const destroyAll = (c: Container) => {
            try {
                const removed = c.removeChildren()
                for (const ch of removed) {
                    try {
                        (ch as any).destroy?.({ children: true })
                    } catch (err) {
                        if (import.meta?.env?.DEV) console.debug('[PixiApplication]destroy child', err)
                    }
                }
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[PixiApplication]removeChildren', err)
            }
        }

        destroyAll(this.layers.background)
        destroyAll(this.layers.dependencies)
        destroyAll(this.layers.hud)

        // Special handling for tasks container (may have cached graphics)
        try {
            this.layers.tasks.removeChildren()
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[PixiApplication]tasks.removeChildren', err)
        }
    }

    // Cleanup method
    destroy() {
        this.ready = false

        if (this.layers) {
            this.clearContainers()
        }

        if (this.app) {
            try {
                this.app.destroy(true, { children: true, texture: false })
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[PixiApplication]app.destroy', err)
            }
        }

        this.app = null
        this.root = null
        this.layers = null
        this.hudPersistent = null
    }

    // Performance monitoring
    getStats() {
        if (!this.app || !this.app.renderer) return null

        const renderer = this.app.renderer
        return {
            drawCalls: (renderer as any).drawCalls || 0,
            textureCount: (renderer as any).texture?.managedTextures?.length || 0,
            fps: (this.app as any).ticker?.FPS || 0,
            deltaTime: (this.app as any).ticker?.deltaTime || 0
        }
    }

    // Set viewport transform on viewport container
    setViewportTransform(container: Container | null, viewport: { x: number; y: number; zoom: number }) {
        if (!container) return

        container.scale.set(viewport.zoom)
        container.position.set(-viewport.x * viewport.zoom, -viewport.y)
    }

    // Create a new container for layered rendering
    createContainer(): Container {
        return new Container()
    }

    // Enable/disable renderer features
    setFeature(feature: 'antialias' | 'powerPreference' | 'preserveDrawingBuffer', _enabled: boolean) {
        // Most features need to be set during initialization, but this provides a hook for future features
        if (import.meta?.env?.DEV) {
            console.debug(`[PixiApplication]Feature '${feature}' cannot be changed after initialization`)
        }
    }
}
