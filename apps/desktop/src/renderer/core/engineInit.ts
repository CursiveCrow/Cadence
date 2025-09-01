import { Application } from 'pixi.js'
import { createTimelineLayers, TimelineSceneManager, type TimelineConfig, type RendererPlugin } from './scene'
import { StatusGlyphPlugin } from '../plugins/status-glyph'
import { checkWebGPUAvailability, logWebGPUStatus, logRendererPreference } from '../utils/webgpu-check'
import { createGpuTimeGrid, GpuTimeGrid } from '../rendering/grid/gpuGrid'
import { devLog } from '../utils/devlog'

export interface InitContextProviders { getEffectiveConfig: () => TimelineConfig; getProjectStartDate: () => Date }

export interface EngineInitResult {
    app: Application
    scene: TimelineSceneManager
    layers: ReturnType<typeof createTimelineLayers>
    gpuGrid?: GpuTimeGrid
}

export async function initializeEngine(canvas: HTMLCanvasElement, config: TimelineConfig, plugins: RendererPlugin[] | undefined, contextProviders: InitContextProviders): Promise<EngineInitResult> {
    const status = await checkWebGPUAvailability()
    logWebGPUStatus(status)
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(rect.width, 100) || window.innerWidth
    const height = Math.max(rect.height, 100) || window.innerHeight
    const app = new Application()
    await app.init({
        canvas: canvas as any,
        width,
        height,
        resolution: Math.max(1, Math.min(2, (window.devicePixelRatio || 1))),
        autoDensity: true,
        backgroundColor: config.BACKGROUND_COLOR,
        preference: 'webgpu',
        antialias: true,
        clearBeforeRender: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
        resizeTo: (canvas.parentElement || window) as any,
        eventFeatures: { move: true, click: true, wheel: true, globalMove: true },
        hello: false,
    })
    try { logRendererPreference(status, 'webgpu') } catch (err) { devLog.warn('logRendererPreference failed', err) }
    try { (app.renderer as any).roundPixels = true } catch (err) { devLog.warn('roundPixels set failed', err) }
    const layers = createTimelineLayers(app)
    let gpuGrid: GpuTimeGrid | undefined
    try {
        const grid = createGpuTimeGrid(app)
        gpuGrid = grid
        app.stage.addChildAt(grid.container, Math.max(0, app.stage.getChildIndex(layers.viewport)))
    } catch (err) { devLog.warn('createGpuTimeGrid/init failed', err) }
    const scene = new TimelineSceneManager(layers)
    const pluginSet = new Set<RendererPlugin>(plugins || [])
    pluginSet.add(StatusGlyphPlugin)
    scene.setPlugins(Array.from(pluginSet))
    scene.setContextProviders({ getEffectiveConfig: contextProviders.getEffectiveConfig, getProjectStartDate: contextProviders.getProjectStartDate })
    scene.notifyLayersCreated(app)
    app.stage.on('globalpointermove', (e: any) => {
        try {
            const local = layers.viewport.toLocal(e.global)
            const eff = contextProviders.getEffectiveConfig()
            scene.updateHoverAtViewportX(local.x, eff as any, app.screen.height)
            scene.updateTaskHoverAtViewportPoint(local.x, local.y, eff as any, contextProviders.getProjectStartDate(), app.screen.width)
        } catch (err) { devLog.warn('globalpointermove handler error', err) }
    })
    app.stage.on('pointerleave', () => { try { const eff = contextProviders.getEffectiveConfig(); scene.updateHoverAtViewportX(null as any, eff as any, app.screen.height) } catch (err) { devLog.warn('pointerleave handler error', err) } })
    app.stage.on('pointerout', () => { try { const eff = contextProviders.getEffectiveConfig(); scene.updateHoverAtViewportX(null as any, eff as any, app.screen.height) } catch (err) { devLog.warn('pointerout handler error', err) } })
    return { app, scene, layers, gpuGrid }
}


