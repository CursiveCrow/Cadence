import { Graphics } from 'pixi.js'
import { PixiApplication } from './PixiApplication'
import { ViewportManager } from './ViewportManager'
import { HudRenderer } from '../ui/HudRenderer'
import { ModalRenderer } from '../ui/ModalRenderer'
import { TooltipRenderer } from '../ui/TooltipRenderer'
import { TaskRenderer, TaskLayout } from '../graphics/TaskRenderer'
import { GridRenderer } from '../graphics/GridRenderer'
import { EffectsRenderer } from '../graphics/EffectsRenderer'
import { safePixiOperation, errorLogger, ErrorSeverity, HealthCheck } from './ErrorBoundary'
import { TIMELINE, computeScaledTimeline } from '../utils'
import type { Staff, Task, Dependency } from '../../types'

// Data interface for renderer
interface RendererData {
    staffs: Staff[]
    tasks: Task[]
    dependencies: Dependency[]
    selection: string[]
}

// Metrics interface for renderer calculations
interface RendererMetrics {
    pxPerDay: number
    staffBlocks: Array<{
        id: string
        yTop: number
        yBottom: number
        lineSpacing: number
    }>
}

// Main orchestrating Renderer class
export class NewRenderer {
    private pixiApp: PixiApplication
    private viewportManager: ViewportManager

    // Sub-renderers
    private hudRenderer: HudRenderer | null = null
    private modalRenderer: ModalRenderer
    private tooltipRenderer: TooltipRenderer
    private taskRenderer: TaskRenderer
    private gridRenderer: GridRenderer
    private effectsRenderer: EffectsRenderer

    // State
    private data: RendererData = { staffs: [], tasks: [], dependencies: [], selection: [] }
    private layout: TaskLayout[] = []
    private metrics: RendererMetrics = { pxPerDay: 24, staffBlocks: [] }
    private hoverX: number | null = null
    private hoverY: number | null = null
    private verticalScale: number = 1

    // Preview graphics state
    private previewG: Graphics | null = null
    private depPreviewG: Graphics | null = null

    // Actions for UI interactions
    private actions: {
        addTask?: (task: Task) => void
        updateTask?: (payload: { id: string; updates: Partial<Task> }) => void
        addDependency?: (dep: Dependency) => void
        addStaff?: (staff: Staff) => void
        updateStaff?: (payload: { id: string; updates: Partial<Staff> }) => void
        deleteStaff?: (id: string) => void
        reorderStaffs?: (payload: { staffId: string; newPosition: number }) => void
        setSelection?: (ids: string[]) => void
    } = {}

    // Hidden input for text editing
    private hiddenInput: HTMLInputElement | null = null
    private editing: { key: string; onCommit: (value: string) => void; type: 'text' | 'number' } | null = null

    // CSS color cache for performance
    private colorCache: Map<string, number> = new Map()

    constructor(canvas: HTMLCanvasElement) {
        this.pixiApp = new PixiApplication(canvas)
        this.viewportManager = new ViewportManager()

        // Initialize sub-renderers (HudRenderer will be created after PixiJS init)
        this.modalRenderer = new ModalRenderer()
        this.tooltipRenderer = new TooltipRenderer()
        this.taskRenderer = new TaskRenderer()
        this.gridRenderer = new GridRenderer()
        this.effectsRenderer = new EffectsRenderer()

        this.initializeAsync()
    }

    private async initializeAsync() {
        try {
            const success = await this.pixiApp.initialize()
            if (success) {
                // Now that PixiJS is initialized, create the HudRenderer with the actual persistent container
                const hudPersistent = this.pixiApp.getHudPersistent()
                if (hudPersistent) {
                    this.hudRenderer = new HudRenderer(hudPersistent)
                } else {
                    errorLogger.log('NewRenderer', 'initialize', ErrorSeverity.ERROR, 'HUD persistent container not available')
                }

                this.ensureHiddenInput()
                this.render() // Initial render
            } else {
                errorLogger.log('NewRenderer', 'initialize', ErrorSeverity.CRITICAL, 'PixiJS initialization failed')
            }
        } catch (error) {
            errorLogger.log(
                'NewRenderer',
                'initialize',
                ErrorSeverity.CRITICAL,
                'Renderer initialization failed',
                error instanceof Error ? error : undefined
            )
        }
    }

    // Main render method - orchestrates all sub-renderers with error boundaries
    render() {
        if (!this.pixiApp.isReady()) {
            errorLogger.log('NewRenderer', 'render', ErrorSeverity.WARNING, 'PixiJS not ready, skipping render')
            return
        }

        const layers = this.pixiApp.getLayers()
        const hudPersistent = this.pixiApp.getHudPersistent()
        if (!layers || !hudPersistent) {
            errorLogger.log('NewRenderer', 'render', ErrorSeverity.ERROR, 'Required containers not available')
            return
        }

        // Health check
        if (!HealthCheck.checkPixiHealth(this.pixiApp.getApp())) {
            errorLogger.log('NewRenderer', 'render', ErrorSeverity.CRITICAL, 'PixiJS application unhealthy')
            return
        }

        // Clear containers for fresh render with error handling
        safePixiOperation('NewRenderer', 'clearContainers', () => this.pixiApp.clearContainers())

        const screenDimensions = this.pixiApp.getScreenDimensions()
        const { width, height } = screenDimensions
        const viewport = this.viewportManager.getViewport()
        const pxPerDay = this.viewportManager.getPixelsPerDay()

        // Update viewport manager screen dimensions
        this.viewportManager.setScreenDimensions(width, height)

        // 1. Render background and grid with error boundaries
        safePixiOperation('NewRenderer', 'renderBackground', () => {
            const bgColor = this.cssVarColorToHex('--ui-color-bg', 0x292524)
            this.gridRenderer.renderBackground(layers.background, screenDimensions, viewport, TIMELINE.LEFT_MARGIN, pxPerDay, bgColor)
        })

        // 2. Render staff lines and get metrics with error boundaries
        const staffBlocks = safePixiOperation('NewRenderer', 'renderStaffLines', () => {
            const scaledTimeline = computeScaledTimeline(this.verticalScale)
            return this.gridRenderer.renderStaffLines(
                layers.background, this.data.staffs, scaledTimeline, viewport, width, TIMELINE.LEFT_MARGIN
            )
        }) || []
        this.metrics = { pxPerDay, staffBlocks }

        // 3. Render measure markers and today marker with error boundaries
        safePixiOperation('NewRenderer', 'renderMeasureMarkers', () => {
            this.gridRenderer.renderMeasureMarkers(
                layers.background, staffBlocks, this.data.staffs, viewport, width, TIMELINE.LEFT_MARGIN, pxPerDay
            )
        })
        safePixiOperation('NewRenderer', 'renderTodayMarker', () => {
            this.gridRenderer.renderTodayMarker(
                layers.background, viewport, TIMELINE.LEFT_MARGIN, pxPerDay, height
            )
        })

        // 4. Render hover effects with error boundaries
        safePixiOperation('NewRenderer', 'renderHoverEffects', () => {
            this.gridRenderer.renderHoverEffects(layers.background, this.hoverX, this.hoverY, staffBlocks, height)
        })

        // 5. Render tasks with error boundaries
        const taskResult = safePixiOperation('NewRenderer', 'renderTasks', () => {
            return this.taskRenderer.render(
                layers.tasks, this.data.tasks, staffBlocks, this.data.selection,
                viewport, { x: this.hoverX, y: this.hoverY }, screenDimensions,
                TIMELINE.LEFT_MARGIN, pxPerDay
            )
        })
        this.layout = taskResult?.layout || []

        // 6. Render dependencies with error boundaries
        safePixiOperation('NewRenderer', 'renderDependencies', () => {
            this.gridRenderer.renderDependencies(layers.dependencies, this.data.dependencies, this.layout)
        })

        // 7. Render tooltip with error boundaries
        safePixiOperation('NewRenderer', 'renderTooltip', () => {
            this.tooltipRenderer.render(
                layers.tasks, this.hoverX, this.hoverY, this.hitTest.bind(this),
                this.data.tasks, this.layout, screenDimensions
            )
        })

        // 8. Render HUD (header + sidebar) with error boundaries
        safePixiOperation('NewRenderer', 'renderHUD', () => {
            if (this.hudRenderer) {
                this.hudRenderer.render(
                    layers.hud, width, height, viewport, this.data, this.metrics
                )
            }
        })

        // 9. Render modals if active with error boundaries
        safePixiOperation('NewRenderer', 'renderModals', () => {
            if (this.hudRenderer) {
                const currentModal = this.hudRenderer.getModal()
                if (currentModal === 'staffManager') {
                    this.modalRenderer.renderStaffManager(layers.hud, width, height, this.data.staffs)
                }
            }
        })

        // 10. Render task details if selection exists with error boundaries
        safePixiOperation('NewRenderer', 'renderTaskDetails', () => {
            if (this.data.selection.length === 1) {
                const taskId = this.data.selection[0]
                const task = this.data.tasks.find(t => t.id === taskId)
                const taskLayout = this.layout.find(l => l.id === taskId)
                if (task && taskLayout) {
                    this.modalRenderer.renderTaskDetails(layers.hud, width, height, task, taskLayout, this.data.staffs)
                }
            }
        })

        // 11. Render effects with error boundaries
        safePixiOperation('NewRenderer', 'renderEffects', () => {
            this.effectsRenderer.render(layers.hud)
        })
    }

    // Public API methods that delegate to sub-renderers or manage state

    setData(data: RendererData) {
        this.data = data
    }

    setViewport(viewport: { x: number; y: number; zoom: number }) {
        this.viewportManager.setViewport(viewport)
    }

    setVerticalScale(scale: number) {
        this.verticalScale = Math.max(0.5, Math.min(3, scale || 1))
    }

    resize() {
        safePixiOperation('NewRenderer', 'resize', () => this.pixiApp.resize())
    }

    setHover(x: number | null, y: number | null) {
        this.hoverX = x
        this.hoverY = y
        if (this.hudRenderer) {
            this.hudRenderer.setHover(x, y)
        }
    }

    // Hit testing
    hitTest(px: number, py: number): string | null {
        for (let i = this.layout.length - 1; i >= 0; i--) {
            const r = this.layout[i]
            if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r.id
        }
        return null
    }

    getTaskRect(id: string): { x: number; y: number; w: number; h: number } | null {
        const r = this.layout.find(l => l.id === id)
        return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null
    }

    getMetrics() {
        return this.metrics
    }

    // UI interaction methods
    hitTestUI(px: number, py: number): string | null {
        // Try HUD first, then modals
        return (this.hudRenderer?.hitTestUI(px, py)) || this.modalRenderer.hitTestUI(px, py)
    }

    getHeaderHeight(): number {
        return this.hudRenderer?.getHeaderHeight() || 56
    }

    getSidebarWidth(): number {
        return this.hudRenderer?.getSidebarWidth() || 220
    }

    setSidebarWidth(w: number) {
        if (this.hudRenderer) {
            this.hudRenderer.setSidebarWidth(w)
        }
    }

    // Modal management
    openStaffManager() {
        if (this.hudRenderer) {
            this.hudRenderer.openStaffManager()
        }
    }

    closeModal() {
        if (this.hudRenderer) {
            this.hudRenderer.closeModal()
        }
    }

    // Action management for UI interactions
    setActions(actions: Partial<typeof this.actions>) {
        this.actions = { ...this.actions, ...actions }
    }

    handleUIAction(key: string) {
        // Handle modal and UI actions
        if (key === 'sm:close') {
            this.closeModal()
            return
        }

        if (key === 'sm:new:add') {
            if (this.hudRenderer) {
                const name = this.hudRenderer.getTempStaffName().trim() || `Staff ${Math.floor(Math.random() * 1000)}`
                const lines = this.hudRenderer.getTempStaffLines()
                const position = this.data.staffs.length
                const now = new Date().toISOString()

                this.actions.addStaff?.({
                    id: `staff-${Date.now()}`,
                    name,
                    numberOfLines: lines,
                    lineSpacing: 12,
                    position,
                    projectId: 'demo',
                    createdAt: now,
                    updatedAt: now
                })

                this.hudRenderer.setTempStaffName('')
                this.hudRenderer.setTempStaffLines(5)
            }
            return
        }

        // Handle staff line increment/decrement
        if (key.startsWith('sm:new:lines') && this.hudRenderer) {
            const currentLines = this.hudRenderer.getTempStaffLines()
            if (key === 'sm:new:lines:inc') {
                this.hudRenderer.setTempStaffLines(currentLines + 1)
            } else if (key === 'sm:new:lines:dec') {
                this.hudRenderer.setTempStaffLines(currentLines - 1)
            }
            return
        }

        // Handle existing staff actions
        if (key.startsWith('sm:item:')) {
            const parts = key.split(':')
            const staffId = parts[2]
            const action = parts[3]
            const staff = this.data.staffs.find(s => s.id === staffId)
            if (!staff) return

            if (action === 'del') {
                this.actions.deleteStaff?.(staffId)
                return
            }
            if (action === 'up' || action === 'down') {
                const idx = this.data.staffs.findIndex(s => s.id === staffId)
                const newPos = action === 'up' ? Math.max(0, idx - 1) : Math.min(this.data.staffs.length - 1, idx + 1)
                this.actions.reorderStaffs?.({ staffId, newPosition: newPos })
                return
            }
            if (action === 'lines:inc') {
                this.actions.updateStaff?.({ id: staffId, updates: { numberOfLines: Math.min(10, (staff.numberOfLines || 5) + 1) } })
                return
            }
            if (action === 'lines:dec') {
                this.actions.updateStaff?.({ id: staffId, updates: { numberOfLines: Math.max(1, (staff.numberOfLines || 5) - 1) } })
                return
            }
        }

        // Add more UI action handling as needed
        try {
            if (import.meta?.env?.DEV) console.debug('[NewRenderer]Unhandled UI action:', key)
        } catch { }
    }

    // Preview rendering
    drawDragPreview(x: number, y: number, w: number, h: number) {
        const layers = this.pixiApp.getLayers()
        if (!layers) return

        this.previewG = this.taskRenderer.renderDragPreview(
            layers.tasks, x, y, w, h, this.previewG
        )
    }

    clearPreview() {
        this.taskRenderer.clearPreview(this.previewG)
    }

    drawDependencyPreview(src: { x: number; y: number; w: number; h: number }, dstPoint: { x: number; y: number }) {
        const layers = this.pixiApp.getLayers()
        if (!layers) return

        this.depPreviewG = this.taskRenderer.renderDependencyPreview(
            layers.dependencies, src, dstPoint, this.depPreviewG
        )
    }

    clearDependencyPreview() {
        const layers = this.pixiApp.getLayers()
        if (!layers) return

        this.taskRenderer.clearDependencyPreview(this.depPreviewG, layers.dependencies)
        this.depPreviewG = null
    }

    // Hidden input management for text editing
    private ensureHiddenInput() {
        try {
            if (this.hiddenInput) return
            const input = document.createElement('input')
            input.type = 'text'
            Object.assign(input.style, {
                position: 'absolute',
                opacity: '0',
                pointerEvents: 'none',
                zIndex: '0',
                left: '0px',
                top: '0px',
                width: '1px',
                height: '1px'
            })
            document.body.appendChild(input)

            input.addEventListener('blur', () => {
                if (this.editing) {
                    try { this.editing.onCommit(input.value) } catch (err) {
                        if (import.meta?.env?.DEV) console.debug('[NewRenderer]commit edit', err)
                    }
                    this.editing = null
                }
            })

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    try { (e.target as HTMLInputElement).blur() } catch (err) {
                        if (import.meta?.env?.DEV) console.debug('[NewRenderer]enter blur', err)
                    }
                }
                if (e.key === 'Escape') {
                    this.editing = null
                    try { (e.target as HTMLInputElement).blur() } catch (err) {
                        if (import.meta?.env?.DEV) console.debug('[NewRenderer]escape blur', err)
                    }
                }
            })

            this.hiddenInput = input
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[NewRenderer]ensureHiddenInput', err)
        }
    }

    // CSS color utility
    private cssVarColorToHex(varName: string, fallback: number): number {
        try {
            if (this.colorCache.has(varName)) return this.colorCache.get(varName) as number
            const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
            if (!v) return fallback
            if (v.startsWith('#')) {
                const hex = v.slice(1)
                const n = parseInt(hex, 16)
                if (!Number.isNaN(n)) { this.colorCache.set(varName, n); return n }
            }
            const m = v.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
            if (m) {
                const r = Math.max(0, Math.min(255, parseInt(m[1]!, 10)))
                const g = Math.max(0, Math.min(255, parseInt(m[2]!, 10)))
                const b = Math.max(0, Math.min(255, parseInt(m[3]!, 10)))
                const n = (r << 16) | (g << 8) | b
                this.colorCache.set(varName, n)
                return n
            }
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[NewRenderer]cssVarColorToHex', err)
        }
        return fallback
    }

    // Cleanup method
    destroy() {
        // Cleanup sub-renderers
        const layers = this.pixiApp.getLayers()
        if (layers) {
            this.tooltipRenderer.destroy(layers.tasks)
            this.taskRenderer.clearCache()
            this.effectsRenderer.clearEffects()
        }

        // Cleanup hidden input
        if (this.hiddenInput) {
            try {
                document.body.removeChild(this.hiddenInput)
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[NewRenderer]remove hidden input', err)
            }
            this.hiddenInput = null
        }

        // Cleanup PixiJS app
        this.pixiApp.destroy()
    }

    // Performance and debugging methods
    getStats() {
        const pixiStats = this.pixiApp.getStats()
        const taskStats = this.taskRenderer.getCacheStats()
        const effectsStats = this.effectsRenderer.getEffectsStats()

        return {
            pixi: pixiStats,
            tasks: taskStats,
            effects: effectsStats,
            layout: {
                tasksRendered: this.layout.length,
                staffBlocks: this.metrics.staffBlocks.length
            }
        }
    }
}
