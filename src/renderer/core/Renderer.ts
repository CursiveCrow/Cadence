import { Graphics } from 'pixi.js'
import { PixiApplication } from './PixiApplication'
import { ViewportManager } from './ViewportManager'
import { HeaderRenderer } from '../ui/HeaderRenderer'
import { SidebarRenderer } from '../ui/SidebarRenderer'
import { ToolbarRenderer } from '../ui/ToolbarRenderer'
import { ModalRenderer } from '../ui/ModalRenderer'
import { TooltipRenderer } from '../ui/TooltipRenderer'
import { TaskPass, TaskLayout } from '../passes/TaskPass'
import { GridPass } from '../passes/GridPass'
import { EffectsPass } from '../passes/EffectsPass'
import { safePixiOperation, errorLogger, ErrorSeverity, HealthCheck } from './ErrorBoundary'
import { computeScaledTimeline } from '@renderer/timeline'
import type { IRenderer } from '@types'
import { getCssVarColor } from '@shared/colors'
import type { Staff, Task, Dependency } from '@types'
import { TaskStatus } from '@types'
import { TextInputManager } from '../ui/TextInputManager'
import { DebugOverlay } from '../ui/DebugOverlay'
import { UI_CONSTANTS } from '@config/ui'
import { TIMELINE } from '@shared/timeline'

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
export class Renderer implements IRenderer {
    private pixiApp: PixiApplication
    private viewportManager: ViewportManager

    // Sub-renderers
    private headerRenderer: HeaderRenderer | null = null
    private sidebarRenderer: SidebarRenderer | null = null
    private toolbarRenderer: ToolbarRenderer | null = null
    private modalRenderer: ModalRenderer
    private tooltipRenderer: TooltipRenderer
    private taskRenderer: TaskPass
    private gridRenderer: GridPass
    private effectsRenderer: EffectsPass
    private textInput: TextInputManager
    private debugOverlay: DebugOverlay = new DebugOverlay()

    // State
    private data: RendererData = { staffs: [], tasks: [], dependencies: [], selection: [] }
    private layout: TaskLayout[] = []
    private metrics: RendererMetrics = { pxPerDay: 24, staffBlocks: [] }
    private hoverX: number | null = null
    private hoverY: number | null = null
    private verticalScale: number = 1
    private leftMargin: number = UI_CONSTANTS.SIDEBAR.DEFAULT_WIDTH
    private currentModal: null | 'staffManager' = null

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

    // CSS color cache for performance
    private colorCache: Map<string, number> = new Map()

    constructor(canvas: HTMLCanvasElement) {
        this.pixiApp = new PixiApplication(canvas)
        this.viewportManager = new ViewportManager()

        // Initialize sub-renderers
        this.modalRenderer = new ModalRenderer()
        this.tooltipRenderer = new TooltipRenderer()
        this.taskRenderer = new TaskPass()
        this.gridRenderer = new GridPass()
        this.effectsRenderer = new EffectsPass()
        this.textInput = new TextInputManager()

        this.initializeAsync()
    }

    private async initializeAsync() {
        try {
            const success = await this.pixiApp.initialize()
            if (success) {
                const uiPersistent = this.pixiApp.getUiPersistent()
                if (!uiPersistent) {
                    errorLogger.log('Renderer', 'initialize', ErrorSeverity.ERROR, 'UI persistent container not available')
                } else {
                    this.headerRenderer = new HeaderRenderer()
                    this.sidebarRenderer = new SidebarRenderer()
                    this.toolbarRenderer = new ToolbarRenderer()
                }

                this.render() // Initial render
            } else {
                errorLogger.log('Renderer', 'initialize', ErrorSeverity.CRITICAL, 'PixiJS initialization failed')
            }
        } catch (error) {
            errorLogger.log(
                'Renderer',
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
            errorLogger.log('Renderer', 'render', ErrorSeverity.WARNING, 'PixiJS not ready, skipping render')
            return
        }

        const layers = this.pixiApp.getLayers()
        const uiPersistent = this.pixiApp.getUiPersistent()
        if (!layers || !uiPersistent) {
            errorLogger.log('Renderer', 'render', ErrorSeverity.ERROR, 'Required containers not available')
            return
        }

        // Health check
        if (!HealthCheck.checkPixiHealth(this.pixiApp.getApp())) {
            errorLogger.log('Renderer', 'render', ErrorSeverity.CRITICAL, 'PixiJS application unhealthy')
            return
        }

        // Clear containers for fresh render with error handling
        safePixiOperation('Renderer', 'clearContainers', () => this.pixiApp.clearContainers())

        const screenDimensions = this.pixiApp.getScreenDimensions()
        const { width, height } = screenDimensions
        const viewport = this.viewportManager.getViewport()
        const pxPerDay = this.viewportManager.getPixelsPerDay()

        // Update viewport manager screen dimensions
        this.viewportManager.setScreenDimensions(width, height)

        // Ensure viewport uses dynamic left margin
        this.viewportManager.setLeftMargin(this.leftMargin)

        // Apply world-space translation to viewport container
        safePixiOperation('Renderer', 'setViewportTransform', () => {
            this.pixiApp.setViewportTransform(layers.viewport, viewport, this.leftMargin, pxPerDay)
        })

        // 1. Render background and grid with error boundaries
        safePixiOperation('Renderer', 'renderBackground', () => {
            // Use timeline-specific background token so header/sidebar can differ
            const bgColor = this.cssVarColorToHex('--ui-color-bg-timeline', 0x262422)
            this.gridRenderer.renderBackground(layers.background, screenDimensions, viewport, this.leftMargin, pxPerDay, bgColor)
        })

        // 2. Render staff lines and get metrics with error boundaries
        const staffBlocks = safePixiOperation('Renderer', 'renderStaffLines', () => {
            const scaledTimeline = computeScaledTimeline(this.verticalScale)
            return this.gridRenderer.renderStaffLines(
                layers.background, this.data.staffs, scaledTimeline, viewport, width, this.leftMargin
            )
        }) || []
        this.metrics = { pxPerDay, staffBlocks }

        // 3. Render measure markers and today marker with error boundaries
        safePixiOperation('Renderer', 'renderMeasureMarkers', () => {
            this.gridRenderer.renderMeasureMarkers(
                layers.background, staffBlocks, this.data.staffs, viewport, width, this.leftMargin, pxPerDay
            )
        })
        safePixiOperation('Renderer', 'renderTodayMarker', () => {
            this.gridRenderer.renderTodayMarker(
                layers.background, viewport, this.leftMargin, pxPerDay, height
            )
        })

        // 4. Render hover effects with error boundaries (convert to container-local)
        safePixiOperation('Renderer', 'renderHoverEffects', () => {
            const localX = this.hoverX == null ? null : this.screenToLocalX(this.hoverX, viewport, this.leftMargin, pxPerDay)
            const localY = this.hoverY == null ? null : this.screenToLocalY(this.hoverY, viewport)
            this.gridRenderer.renderHoverEffects(layers.background, localX, localY, staffBlocks, height)
        })

        // 5. Render tasks with error boundaries
        const taskResult = safePixiOperation('Renderer', 'renderTasks', () => {
            return this.taskRenderer.render(
                layers.tasks, this.data.tasks, staffBlocks, this.data.selection,
                viewport, { x: this.hoverX, y: this.hoverY }, screenDimensions,
                this.leftMargin, pxPerDay
            )
        })
        this.layout = taskResult?.layout || []

        // 6. Render dependencies with error boundaries
        safePixiOperation('Renderer', 'renderDependencies', () => {
            this.gridRenderer.renderDependencies(layers.dependencies, this.data.dependencies, this.layout)
        })

        // 7. Render tooltip with error boundaries (use screen-projected rects)
        safePixiOperation('Renderer', 'renderTooltip', () => {
            const layoutScreen = this.layout.map((r) => ({
                id: r.id,
                x: this.localToScreenX(r.x, viewport, this.leftMargin, pxPerDay),
                y: this.localToScreenY(r.y, viewport),
                w: r.w,
                h: r.h,
            }))
            this.tooltipRenderer.render(
                layers.tasks, this.hoverX, this.hoverY, this.hitTest.bind(this),
                this.data.tasks, layoutScreen, screenDimensions, this.leftMargin
            )
        })

        // 8. Render header, sidebar, toolbar
        safePixiOperation('Renderer', 'renderHeader', () => {
            this.headerRenderer?.render(layers.ui, width, viewport, this.leftMargin)
        })
        // Sidebar background (persistent container), then dynamic overlay
        safePixiOperation('Renderer', 'renderSidebarBackground', () => {
            const uiPersistent = this.pixiApp.getUiPersistent()
            if (uiPersistent) this.sidebarRenderer?.renderBackground(uiPersistent, height, this.leftMargin)
        })
        safePixiOperation('Renderer', 'renderSidebar', () => {
            const viewport = this.viewportManager.getViewport()
            const pxPerDay = this.viewportManager.getPixelsPerDay()
            const staffBlocksScreen = staffBlocks.map((b) => ({
                id: b.id,
                yTop: this.localToScreenY(b.yTop, viewport),
                yBottom: this.localToScreenY(b.yBottom, viewport),
                lineSpacing: b.lineSpacing,
            }))
            this.sidebarRenderer?.renderForeground(
                layers.ui,
                height,
                this.leftMargin,
                this.data.staffs,
                staffBlocksScreen,
            )
        })
        safePixiOperation('Renderer', 'renderToolbar', () => {
            this.toolbarRenderer?.render(layers.ui, width, this.data.selection)
        })

        // 9. Render modals if active with error boundaries
        safePixiOperation('Renderer', 'renderModals', () => {
            if (this.currentModal === 'staffManager') {
                this.modalRenderer.renderStaffManager(layers.ui, width, height, this.data.staffs)
            }
        })

        // 10. Render task details if selection exists with error boundaries
        safePixiOperation('Renderer', 'renderTaskDetails', () => {
            if (this.data.selection.length === 1) {
                const taskId = this.data.selection[0]
                const task = this.data.tasks.find(t => t.id === taskId)
                const taskLayout = this.layout.find(l => l.id === taskId)
                if (task && taskLayout) {
                    const viewport = this.viewportManager.getViewport()
                    const pxPerDay = this.viewportManager.getPixelsPerDay()
                    const screenLayout = {
                        x: this.localToScreenX(taskLayout.x, viewport, this.leftMargin, pxPerDay),
                        y: this.localToScreenY(taskLayout.y, viewport),
                        w: taskLayout.w,
                        h: taskLayout.h,
                    }
                    this.modalRenderer.renderTaskDetails(layers.ui, width, height, task, screenLayout as any, this.data.staffs)
                }
            }
        })

        // 11. Render effects with error boundaries
        safePixiOperation('Renderer', 'renderEffects', () => {
            this.effectsRenderer.render(layers.ui)
        })

        // 12. Debug overlay (dev)
        safePixiOperation('Renderer', 'renderDebug', () => {
            const stats = this.getStats()
            this.debugOverlay.render(layers.ui, stats)
        })
    }

    // Public API methods that delegate to sub-renderers or manage state

    setData(data: RendererData) {
        this.data = data
    }

    setViewport(viewport: { x: number; y: number; zoom: number }) {
        this.viewportManager.setViewport(viewport)
    }

    setLeftMargin(leftMargin: number) {
        this.leftMargin = Math.max(0, Math.round(leftMargin || 0))
    }

    getHeaderHeight(): number {
        return this.headerRenderer?.getHeaderHeight() || 56
    }

    getSidebarWidth(): number {
        return this.leftMargin
    }

    hitTestUI(px: number, py: number): string | null {
        return (
            this.toolbarRenderer?.hitTest(px, py) ||
            this.sidebarRenderer?.hitTest(px, py) ||
            this.modalRenderer.hitTestUI(px, py) ||
            null
        )
    }

    openStaffManager() {
        this.currentModal = 'staffManager'
    }

    setActions(actions: Partial<typeof this.actions>) {
        this.actions = { ...this.actions, ...actions }
    }

    handleUIAction(key: string) {
        try {
            // Staff Manager actions
            if (key === 'sm:close') {
                this.closeModal(); return
            }
            if (key === 'sm:new:add') {
                const name = (this.modalRenderer as any).getTempStaffName?.().trim() || `Staff ${Math.floor(Math.random() * 1000)}`
                const lines = (this.modalRenderer as any).getTempStaffLines?.() || 5
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
                ;(this.modalRenderer as any).setTempStaffName?.('')
                ;(this.modalRenderer as any).setTempStaffLines?.(5)
                return
            }
            if (key.startsWith('sm:new:lines')) {
                const cur = (this.modalRenderer as any).getTempStaffLines?.() || 5
                if (key.endsWith(':inc')) (this.modalRenderer as any).setTempStaffLines?.(cur + 1)
                else if (key.endsWith(':dec')) (this.modalRenderer as any).setTempStaffLines?.(cur - 1)
                return
            }
            if (key.startsWith('sm:item:')) {
                const parts = key.split(':')
                const staffId = parts[2]
                const action = parts[3]
                if (action === 'del') { this.actions.deleteStaff?.(staffId); return }
                if (action === 'up' || action === 'down') {
                    const idx = this.data.staffs.findIndex(s => s.id === staffId)
                    if (idx >= 0) {
                        const newPos = action === 'up' ? Math.max(0, idx - 1) : Math.min(this.data.staffs.length - 1, idx + 1)
                        this.actions.reorderStaffs?.({ staffId, newPosition: newPos })
                    }
                    return
                }
                if (action === 'lines') {
                    const op = parts[4]
                    const st = this.data.staffs.find(s => s.id === staffId)
                    if (st) {
                        const next = Math.max(1, Math.min(10, (st.numberOfLines || 5) + (op === 'inc' ? 1 : -1)))
                        this.actions.updateStaff?.({ id: staffId, updates: { numberOfLines: next } })
                    }
                    return
                }
            }

            // Task Details actions
            if (key === 'td:close') { this.closeModal(); return }
            if (key === 'td:status:next') {
                const id = this.data.selection[0]
                const t = this.data.tasks.find(tt => tt.id === id)
                if (t) {
                    const order = [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.BLOCKED, TaskStatus.CANCELLED]
                    const idx = Math.max(0, order.indexOf((t as any).status || TaskStatus.NOT_STARTED))
                    const next = order[(idx + 1) % order.length]
                    this.actions.updateTask?.({ id, updates: { status: next } })
                }
                return
            }
            if (key === 'td:title') {
                const id = this.data.selection[0]
                const t = this.data.tasks.find(tt => tt.id === id)
                if (t) {
                    this.beginEdit?.((value: string) => {
                        this.actions.updateTask?.({ id, updates: { title: value || t.title } })
                    }, t.title || '')
                }
                return
            }
            if (key.startsWith('td:start:') || key.startsWith('td:dur:')) {
                const id = this.data.selection[0]
                const t = this.data.tasks.find(tt => tt.id === id)
                if (t) {
                    const delta = key.endsWith(':inc') ? 1 : -1
                    if (key.startsWith('td:dur:')) {
                        const nd = Math.max(1, (t.durationDays || 1) + delta)
                        this.actions.updateTask?.({ id, updates: { durationDays: nd } })
                    } else {
                        // start date shift in days based on ISO
                        const parts = (t.startDate || '').split('-').map(Number)
                        const d = new Date(Date.UTC(parts[0]!, (parts[1]! - 1), parts[2]!))
                        d.setUTCDate(d.getUTCDate() + delta)
                        const yyyy = d.getUTCFullYear()
                        const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
                        const dd = String(d.getUTCDate()).padStart(2, '0')
                        this.actions.updateTask?.({ id, updates: { startDate: `${yyyy}-${mm}-${dd}` } })
                    }
                }
                return
            }
            if (key.startsWith('td:staff:')) {
                const id = this.data.selection[0]
                const t = this.data.tasks.find(tt => tt.id === id)
                if (t) {
                    const idx = this.data.staffs.findIndex(s => s.id === t.staffId)
                    if (idx >= 0) {
                        const nextIdx = key.endsWith(':next') ? Math.min(this.data.staffs.length - 1, idx + 1) : Math.max(0, idx - 1)
                        const nextStaff = this.data.staffs[nextIdx]
                        this.actions.updateTask?.({ id, updates: { staffId: nextStaff.id } })
                    }
                }
                return
            }
            if (key.startsWith('td:line:')) {
                const id = this.data.selection[0]
                const t = this.data.tasks.find(tt => tt.id === id)
                if (t) {
                    const delta = key.endsWith(':inc') ? 1 : -1
                    const nl = Math.max(0, (t.staffLine || 0) + delta)
                    this.actions.updateTask?.({ id, updates: { staffLine: nl } })
                }
                return
            }

            if (import.meta?.env?.DEV) console.debug('[Renderer]Unhandled UI action:', key)
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[Renderer]handleUIAction error', err)
        }
    }

    setVerticalScale(scale: number) {
        this.verticalScale = Math.max(0.5, Math.min(3, scale || 1))
    }

    resize() {
        safePixiOperation('Renderer', 'resize', () => this.pixiApp.resize())
    }

    setHover(x: number | null, y: number | null) {
        this.hoverX = x
        this.hoverY = y
        // Hover effects for UI are currently handled in dedicated renderers (no-op here)
    }

    // Hit testing (convert screen -> container-local)
    hitTest(px: number, py: number): string | null {
        const viewport = this.viewportManager.getViewport()
        const pxPerDay = this.viewportManager.getPixelsPerDay()
        const localX = this.screenToLocalX(px, viewport, this.leftMargin, pxPerDay)
        const localY = this.screenToLocalY(py, viewport)
        for (let i = this.layout.length - 1; i >= 0; i--) {
            const r = this.layout[i]
            if (localX >= r.x && localX <= r.x + r.w && localY >= r.y && localY <= r.y + r.h) return r.id
        }
        return null
    }

    getTaskRect(id: string): { x: number; y: number; w: number; h: number } | null {
        const r = this.layout.find(l => l.id === id)
        if (!r) return null
        const viewport = this.viewportManager.getViewport()
        const pxPerDay = this.viewportManager.getPixelsPerDay()
        return {
            x: this.localToScreenX(r.x, viewport, this.leftMargin, pxPerDay),
            y: this.localToScreenY(r.y, viewport),
            w: r.w,
            h: r.h,
        }
    }

    getMetrics() {
        return this.metrics
    }

    // UI interaction methods

    closeModal() {
        this.currentModal = null
    }

    // Preview rendering
    drawDragPreview(x: number, y: number, w: number, h: number) {
        const layers = this.pixiApp.getLayers()
        if (!layers) return

        const viewport = this.viewportManager.getViewport()
        const pxPerDay = this.viewportManager.getPixelsPerDay()
        const localX = this.screenToLocalX(x, viewport, this.leftMargin, pxPerDay)
        const localY = this.screenToLocalY(y, viewport)
        this.previewG = this.taskRenderer.renderDragPreview(
            layers.tasks, localX, localY, w, h, this.previewG
        )
    }

    clearPreview() {
        this.taskRenderer.clearPreview(this.previewG)
    }

    drawDependencyPreview(src: { x: number; y: number; w: number; h: number }, dstPoint: { x: number; y: number }) {
        const layers = this.pixiApp.getLayers()
        if (!layers) return

        const viewport = this.viewportManager.getViewport()
        const pxPerDay = this.viewportManager.getPixelsPerDay()
        const srcLocal = {
            x: this.screenToLocalX(src.x, viewport, this.leftMargin, pxPerDay),
            y: this.screenToLocalY(src.y, viewport),
            w: src.w,
            h: src.h,
        }
        const dstLocal = {
            x: this.screenToLocalX(dstPoint.x, viewport, this.leftMargin, pxPerDay),
            y: this.screenToLocalY(dstPoint.y, viewport),
        }
        this.depPreviewG = this.taskRenderer.renderDependencyPreview(
            layers.dependencies, srcLocal, dstLocal, this.depPreviewG
        )
    }

    clearDependencyPreview() {
        const layers = this.pixiApp.getLayers()
        if (!layers) return

        this.taskRenderer.clearDependencyPreview(this.depPreviewG, layers.dependencies)
        this.depPreviewG = null
    }

    beginEdit(onCommit: (value: string) => void, initialValue: string = '') {
        this.textInput.beginEdit({ onCommit }, initialValue)
    }

    // CSS color utility
    private cssVarColorToHex(varName: string, fallback: number): number {
        try {
            if (this.colorCache.has(varName)) return this.colorCache.get(varName) as number
            const n = getCssVarColor(varName, fallback)
            this.colorCache.set(varName, n)
            return n
        } catch {}
        return fallback
    }

    // Coordinate helpers for container-local transforms
    private screenToLocalX(screenX: number, viewport: { x: number; y: number; zoom: number }, leftMargin: number, pxPerDay: number) {
        return screenX - leftMargin + viewport.x * pxPerDay
    }
    private screenToLocalY(screenY: number, viewport: { x: number; y: number; zoom: number }) {
        return viewport.y + screenY
    }
    private localToScreenX(localX: number, viewport: { x: number; y: number; zoom: number }, leftMargin: number, pxPerDay: number) {
        return leftMargin - viewport.x * pxPerDay + localX
    }
    private localToScreenY(localY: number, viewport: { x: number; y: number; zoom: number }) {
        return localY - viewport.y
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

        this.textInput.destroy()

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
