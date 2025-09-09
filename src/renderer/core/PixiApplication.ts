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
        ui: Container
    } | null = null
    private uiPersistent: Container | null = null
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
                // Force WebGPU renderer to avoid WebGL paths and warnings
                preference: 'webgpu',
                powerPreference: 'high-performance',
                resizeTo: (this.canvas.parentElement || window) as any,
                eventFeatures: { move: true, click: true, wheel: true, globalMove: true },
                hello: false,
            })

            this.app = app
            this.root = app.stage

            // Enforce WebGPU availability
            const hasWebGPU = typeof (navigator as any).gpu !== 'undefined'
            if (!hasWebGPU) {
                this.showUnsupportedOverlay()
                return false
            }

            // Create layer hierarchy
            this.setupLayers()

            this.ready = true
            return true
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[PixiApplication]initialize failed', err)
            return false
        }
    }

    private showUnsupportedOverlay() {
        try {
            const overlay = document.createElement('div')
            Object.assign(overlay.style, {
                position: 'fixed', inset: '0', background: '#0b0b0f', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'system-ui, sans-serif', fontSize: '14px', zIndex: '9999'
            } as CSSStyleDeclaration)
            overlay.textContent = 'WebGPU is required to run Cadence. Please enable it or use a compatible browser.'
            document.body.appendChild(overlay)
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[PixiApplication]overlay', err)
        }
    }

    private setupLayers() {
        if (!this.root) return

        const viewport = new Container()
        const background = new Container()
        const tasks = new Container()
        const dependencies = new Container()
        const uiPersistent = new Container()
        const ui = new Container()

        // Build layer hierarchy
        viewport.addChild(background)
        viewport.addChild(dependencies)
        viewport.addChild(tasks)
        this.root.addChild(viewport)

        // Persistent UI first (backgrounds, gradients), then dynamic UI on top
        this.root.addChild(uiPersistent)
        this.root.addChild(ui)

        this.layers = { viewport, background, tasks, dependencies, ui }
        this.uiPersistent = uiPersistent
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

    // Get persistent UI container
    getUiPersistent() {
        return this.uiPersistent
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

        const justClear = (c: Container) => {
            try {
                c.removeChildren()
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[PixiApplication]removeChildren', err)
            }
        }

        justClear(this.layers.background)
        justClear(this.layers.dependencies)
        // Do not destroy UI children; UI renderers reuse Text/Graphics across frames
        try {
            this.layers.ui.removeChildren()
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[PixiApplication]ui.removeChildren', err)
        }

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
        this.uiPersistent = null
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

    // Set viewport transform on viewport container (world-space translation)
    // Horizontal translation applies camera (left margin and viewport.x * pxPerDay)
    // We purposefully avoid scaling here to keep vertical geometry and text crisp.
    setViewportTransform(
        container: Container | null,
        viewport: { x: number; y: number; zoom: number },
        leftMargin: number,
        pixelsPerDay: number,
    ) {
        if (!container) return

        try {
            container.scale.set(1, 1)
            const x = Math.round(leftMargin - viewport.x * pixelsPerDay)
            const y = Math.round(-viewport.y)
            container.position.set(x, y)
        } catch {}
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
