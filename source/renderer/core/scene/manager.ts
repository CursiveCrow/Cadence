import { Application, Container, Graphics, Rectangle, Text } from 'pixi.js'
import type { RendererContext } from '../types/context'
import type { TaskLayout, TaskAnchors, RendererPlugin, TimelineConfig } from '../types/renderer'
import { drawSelectionHighlight } from '../../components/rendering/shapes'
import { devLog } from '../utils/devlog'
import { SpatialHash } from '../utils/spatial'
import { computeTextResolution } from '../utils/resolution'
import { worldDayToContainerX } from '../utils/layout'
import { Task } from '@cadence/core'

export class TimelineSceneManager {
    layers: { viewport: Container; background: Container; dependencies: Container; tasks: Container; selection: Container; dragLayer: Container }
    taskContainers: Map<string, Container>
    dependencyGraphics: Map<string, Graphics>
    taskLayouts: Map<string, TaskLayout>
    taskAnchors: Map<string, TaskAnchors>
    taskData: Map<string, Task>
    private plugins: RendererPlugin[]
    private spatial: SpatialHash
    private lastZoom: number
    private providerGetConfig: () => TimelineConfig
    private providerGetProjectStartDate: () => Date
    private hoverGuide: Graphics | null = null
    private hoverText: Text | null = null
    private todayLine: Graphics | null = null
    private hoverRow: Graphics | null = null

    constructor(layers: { viewport: Container; background: Container; dependencies: Container; tasks: Container; selection: Container; dragLayer: Container }) {
        this.layers = layers
        this.taskContainers = new Map()
        this.dependencyGraphics = new Map()
        this.taskLayouts = new Map()
        this.taskAnchors = new Map()
        this.taskData = new Map()
        this.plugins = []
        this.spatial = new SpatialHash(200)
        this.lastZoom = 1
        this.providerGetConfig = () => ({
            LEFT_MARGIN: 0, TOP_MARGIN: 0, DAY_WIDTH: 60, STAFF_SPACING: 120, STAFF_LINE_SPACING: 18,
            TASK_HEIGHT: 20, STAFF_LINE_COUNT: 5, BACKGROUND_COLOR: 0x000000,
            GRID_COLOR_MAJOR: 0xffffff, GRID_COLOR_MINOR: 0xffffff, STAFF_LINE_COLOR: 0xffffff,
            TASK_COLORS: { default: 0xffffff }, DEPENDENCY_COLOR: 0xffffff, SELECTION_COLOR: 0xffffff,
        } as any)
        this.providerGetProjectStartDate = () => new Date(0)
    }

    setPlugins(plugins: RendererPlugin[]): void { this.plugins = plugins || [] }
    setZoom(zoom: number): void { this.lastZoom = zoom }
    setContextProviders(providers: { getEffectiveConfig: () => TimelineConfig; getProjectStartDate: () => Date }): void {
        this.providerGetConfig = providers.getEffectiveConfig
        this.providerGetProjectStartDate = providers.getProjectStartDate
    }

    notifyLayersCreated(app: Application): void {
        const ctx: RendererContext = {
            getZoom: () => this.lastZoom,
            getEffectiveConfig: () => this.providerGetConfig(),
            getProjectStartDate: () => this.providerGetProjectStartDate(),
        }
        for (const p of this.plugins) {
            try { p.onLayersCreated?.(app, this.layers as any, ctx) } catch (err) { devLog.warn('plugin.onLayersCreated failed', err) }
        }
    }

    upsertTask(
        task: Task,
        layout: TaskLayout,
        config: TimelineConfig,
        _title?: string,
        _status?: string,
        _zoom: number = 1,
        _selected: boolean = false
    ): { container: Container; created: boolean } {
        let container = this.taskContainers.get(task.id)
        let created = false
        if (!container) {
            container = new Container()
            container.eventMode = 'static'
            this.layers.tasks.addChild(container)
            this.taskContainers.set(task.id, container)
            created = true
        }

        this.taskLayouts.set(task.id, layout)
        this.taskData.set(task.id, task)
        this.taskAnchors.set(task.id, {
            leftCenterX: layout.startX + layout.radius,
            leftCenterY: layout.centerY,
            rightCenterX: layout.startX + layout.width - layout.radius,
            rightCenterY: layout.centerY,
        })
        container.hitArea = new Rectangle(0, 0, layout.width, config.TASK_HEIGHT)

        // Redraw only when needed
        type ContainerMeta = { startX: number; width: number; topY: number; centerY: number; title: string; status: string; zoom: number }
        const metaMap: WeakMap<Container, ContainerMeta> = (this as any).__containerMeta || new WeakMap<Container, ContainerMeta>()
            ; (this as any).__containerMeta = metaMap
        const prevMeta = metaMap.get(container)
        const incomingTitle = _title || ''
        const incomingStatus = _status || ''
        const shouldRedraw =
            prevMeta?.width !== layout.width ||
            prevMeta?.centerY !== layout.centerY ||
            prevMeta?.startX !== layout.startX ||
            prevMeta?.title !== incomingTitle ||
            prevMeta?.status !== incomingStatus ||
            (prevMeta ? Math.abs(prevMeta.zoom - _zoom) > 0.05 : true)

        if (shouldRedraw) {
            // Draw note shape relative to (0,0)
            container.removeChildren()

            const g = new Graphics()
            // Subtle drop shadow/outline
            g.roundRect(2, 2, layout.width, config.TASK_HEIGHT, 4)
            g.fill({ color: 0x000000, alpha: 0.2 })

            const centerYLocal = config.TASK_HEIGHT / 2
            const r = layout.radius

            g.beginPath()
            if (layout.width <= config.TASK_HEIGHT + 4) {
                g.circle(r, centerYLocal, r)
            } else {
                g.moveTo(r, 0)
                g.lineTo(layout.width - 4, 0)
                g.quadraticCurveTo(layout.width, 0, layout.width, 4)
                g.lineTo(layout.width, config.TASK_HEIGHT - 4)
                g.quadraticCurveTo(layout.width, config.TASK_HEIGHT, layout.width - 4, config.TASK_HEIGHT)
                g.lineTo(r, config.TASK_HEIGHT)
                g.arc(r, centerYLocal, r, Math.PI / 2, -Math.PI / 2, false)
            }
            g.closePath()

            const statusKey = (incomingStatus || 'default') as keyof typeof config.TASK_COLORS
            const fillColor = _selected ? (config as any).SELECTION_COLOR : (config.TASK_COLORS[statusKey] || config.TASK_COLORS.default)
            g.fill({ color: fillColor as number, alpha: 0.9 })
            g.stroke({ width: _selected ? 2 : 1, color: _selected ? 0xFCD34D : 0xffffff, alpha: 0.3 })

            // Inner white circle on the left
            g.circle(r, centerYLocal, Math.max(2, r - 2))
            g.fill({ color: 0xffffff, alpha: 0.2 })

            container.addChildAt(g, 0)

            // Title text if there is enough space
            if (layout.width > Math.max(config.TASK_HEIGHT * 1.2, 30)) {
                const titleText = incomingTitle
                const baseTitleFont = 11
                const t = new Text({
                    text: titleText,
                    style: {
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSize: baseTitleFont,
                        fontWeight: 'bold',
                        fill: 0xffffff,
                        align: 'left'
                    }
                })
                const textX = config.TASK_HEIGHT + 8
                t.x = Math.round(textX)
                t.y = Math.round(centerYLocal - t.height / 2)
                const maxTextWidth = layout.width - config.TASK_HEIGHT - 16
                if (t.width > maxTextWidth) {
                    let truncated = titleText
                    while (t.width > maxTextWidth && truncated.length > 0) {
                        truncated = truncated.slice(0, -1)
                        t.text = truncated + '...'
                    }
                }
                container.addChild(t)
            }

            metaMap.set(container, {
                startX: layout.startX,
                width: layout.width,
                topY: layout.topY,
                centerY: layout.centerY,
                title: incomingTitle,
                status: incomingStatus,
                zoom: _zoom
            })
        }

        // Notify plugins
        for (const p of this.plugins) {
            try { p.onTaskUpserted?.(task, container, { layout, config, zoom: _zoom, selected: _selected }) } catch (err) { devLog.warn('plugin.onTaskUpserted failed', err) }
        }
        return { container, created }
    }

    removeMissingTasks(validIds: Set<string>): void {
        for (const [id, container] of this.taskContainers.entries()) {
            if (!validIds.has(id)) {
                try { container.removeFromParent() } catch { }
                try { (container as any).destroy?.({ children: true }) } catch { }
                this.taskContainers.delete(id)
                this.taskLayouts.delete(id)
                this.taskAnchors.delete(id)
                this.taskData.delete(id)
            }
        }
    }

    getAnchors(taskId: string): TaskAnchors | undefined { return this.taskAnchors.get(taskId) }

    upsertDependency(id: string): Graphics {
        let g = this.dependencyGraphics.get(id)
        if (!g) {
            g = new Graphics()
            this.layers.dependencies.addChild(g)
            this.dependencyGraphics.set(id, g)
        }
        return g
    }

    removeMissingDependencies(validIds: Set<string>): void {
        for (const [id, g] of this.dependencyGraphics.entries()) {
            if (!validIds.has(id)) {
                try { g.removeFromParent() } catch { }
                try { (g as any).destroy?.() } catch { }
                this.dependencyGraphics.delete(id)
            }
        }
    }

    clearSelection(): void { this.layers.selection.removeChildren() }
    drawSelection(taskId: string, config: TimelineConfig): void {
        const layout = this.taskLayouts.get(taskId)
        if (!layout) return
        drawSelectionHighlight(this.layers.selection, config, layout)
    }

    updateHoverAtViewportX(px: number | null, config: TimelineConfig, screenHeight: number): void {
        if (px == null || !Number.isFinite(px)) {
            if (this.hoverGuide && this.layers.dragLayer.children.includes(this.hoverGuide)) this.layers.dragLayer.removeChild(this.hoverGuide)
            if (this.hoverText && this.layers.dragLayer.children.includes(this.hoverText)) this.layers.dragLayer.removeChild(this.hoverText)
            this.hoverGuide = null
            this.hoverText = null
            return
        }
        const xAligned = Math.round(px) + 0.5
        const g = this.hoverGuide || new Graphics()
        g.clear()
        g.moveTo(xAligned, 0)
        g.lineTo(xAligned, Math.max(0, screenHeight))
        g.stroke({ width: 1, color: 0xFFFFFF, alpha: 0.12 })
            ; (g as any).eventMode = 'none'
        if (!this.hoverGuide) this.layers.dragLayer.addChild(g)
        this.hoverGuide = g

        const base = this.providerGetProjectStartDate()
        const relDays = Math.round((px - config.LEFT_MARGIN) / Math.max(config.DAY_WIDTH, 0.0001))
        const ms = 24 * 60 * 60 * 1000
        const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()) + relDays * ms)
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const t = this.hoverText || new Text({ text: label, style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 11, fill: 0xffffff } })
            ; (t as any).resolution = computeTextResolution(1, 1)
        t.text = label
        t.x = Math.round(xAligned + 6)
        t.y = 8
            ; (t as any).eventMode = 'none'
        if (!this.hoverText) this.layers.dragLayer.addChild(t)
        this.hoverText = t
    }

    updateTodayMarker(projectStartDate: Date, config: TimelineConfig, alignment: { viewportXDaysQuantized: number; viewportPixelOffsetX: number }, screenHeight: number): void {
        try {
            const baseUTC = Date.UTC(projectStartDate.getUTCFullYear(), projectStartDate.getUTCMonth(), projectStartDate.getUTCDate())
            const now = new Date()
            const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
            const msPerDay = 24 * 60 * 60 * 1000
            const dayIndex = Math.floor((todayUTC - baseUTC) / msPerDay)
            if (!Number.isFinite(dayIndex)) return
            const x = worldDayToContainerX(config as any, dayIndex, alignment)
            const line = this.todayLine || new Graphics()
            line.clear()
            line.moveTo(x, 0)
            line.lineTo(x, Math.max(0, screenHeight))
            const accent = (config as any).TODAY_COLOR ?? (config as any).SELECTION_COLOR ?? 0xF59E0B
            line.stroke({ width: 2, color: accent, alpha: 0.9 })
                ; (line as any).eventMode = 'none'
            if (!this.todayLine) this.layers.background.addChild(line)
            this.todayLine = line
        } catch (err) { devLog.warn('updateTodayMarker failed', err) }
    }

    updateTaskHoverAtViewportPoint(x: number, y: number, config: TimelineConfig, _projectStartDate: Date, _screenWidth?: number): void {
        const id = this.findTaskAtViewportPoint(x, y)
        if (!id) {
            const tip = (this as any).__taskTip as Text | undefined
            if (tip && this.layers.dragLayer.children.includes(tip)) this.layers.dragLayer.removeChild(tip)
                ; (this as any).__taskTip = undefined
            const tipBox = (this as any).__taskHtmlTip as Container | undefined
            if (tipBox && this.layers.dragLayer.children.includes(tipBox)) this.layers.dragLayer.removeChild(tipBox)
                ; (this as any).__taskHtmlTip = undefined
            const stem = (this as any).__tooltipStem as Graphics | undefined
            if (stem && this.layers.dragLayer.children.includes(stem)) this.layers.dragLayer.removeChild(stem)
                ; (this as any).__tooltipStem = undefined
            if (this.hoverRow && this.layers.dragLayer.children.includes(this.hoverRow)) this.layers.dragLayer.removeChild(this.hoverRow)
            this.hoverRow = null
            return
        }
        const task = this.taskData.get(id)
        const taskLayout = this.taskLayouts.get(id)
        if (!task || !taskLayout) return
        const details = (task as any).details || (task as any).description || ''
        const title = task.title || 'Untitled'
        const md = details ? `${title}\n\n${details}` : `${title}`
        let tipBox = (this as any).__taskHtmlTip as Container | undefined
        if (!tipBox) {
            const box = new Container()
            const bg = new Graphics()
            box.addChild(bg)
            const t = new Text({ text: '', style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 12, fill: 0xffffff, align: 'left', wordWrap: true, wordWrapWidth: 280 } })
                ; (t as any).resolution = computeTextResolution(1, 1)
            box.addChild(t)
                ; (box as any).__bg = bg
                ; (box as any).__t = t
                ; (box as any).eventMode = 'none'
            this.layers.dragLayer.addChild(box)
                ; (this as any).__taskHtmlTip = box
            tipBox = box
        }
        const textNode = (tipBox as any).__t as Text
        const plain = (md || '').replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, '$1').replace(/[*_`]/g, '')
        textNode.text = plain
        const padding = 8
        const tx = Math.round(x + 10)
        const ty = Math.round(Math.max(0, taskLayout.topY - (textNode.height + padding * 2) - 6))
        tipBox!.x = tx
        tipBox!.y = ty
        const bg = (tipBox as any).__bg as Graphics
        bg.clear()
        const boxW = Math.max(160, textNode.width + padding * 2)
        const boxH = textNode.height + padding * 2
        const rStem = (config as any).TASK_HEIGHT / 2
        const headRightXTmp = Math.round(taskLayout.startX + rStem * 2)
        const headYTmp = Math.round(taskLayout.centerY)
        const anchorAbsX = Math.round(tipBox!.x)
        const anchorAbsY = Math.round(tipBox!.y)
        const dxStem = headRightXTmp - anchorAbsX
        const dyStem = headYTmp - anchorAbsY
        const lenStem = Math.max(1, Math.hypot(dxStem, dyStem))
        const ux = dxStem / lenStem
        const uy = dyStem / lenStem
        let lbLocalX = 0
        if (Math.abs(uy) > 0.0001) {
            lbLocalX = (boxH / uy) * ux
        } else {
            lbLocalX = 0
        }
        bg.beginPath()
        bg.moveTo(0, 0)
        bg.lineTo(boxW, 0)
        bg.lineTo(boxW, boxH)
        bg.lineTo(lbLocalX, boxH)
        bg.closePath()
        bg.fill({ color: 0x111111, alpha: 0.9 })
        bg.stroke({ width: 1, color: 0xFFFFFF, alpha: 0.2 })
        textNode.x = padding
        textNode.y = padding

        let stem = (this as any).__tooltipStem as Graphics | undefined
        if (!stem) {
            stem = new Graphics()
                ; (stem as any).eventMode = 'none'
            this.layers.dragLayer.addChild(stem)
                ; (this as any).__tooltipStem = stem
        }
        stem.clear()
        stem.moveTo(anchorAbsX, anchorAbsY)
        stem.lineTo(headRightXTmp, headYTmp)
        stem.stroke({ width: 3, color: 0x111111, alpha: 0.9 })

        try {
            const lines = Math.max(1, (config as any).STAFF_LINE_COUNT)
            const gap = Math.max(1, (config as any).STAFF_LINE_SPACING)
            const lineBandHeight = (lines - 1) * gap
            const topMargin = (config as any).TOP_MARGIN || 0
            const spacing = Math.max(1, (config as any).STAFF_SPACING)
            const staffIndex = Math.max(0, Math.floor((y - topMargin) / spacing))
            const topLines = Math.round(topMargin + staffIndex * spacing)
            const h = Math.max(1, lineBandHeight)
            const left = -100000
            const w = 200000
            let hr = this.hoverRow
            if (!hr) {
                hr = new Graphics()
                    ; (hr as any).eventMode = 'none'
                this.layers.dragLayer.addChild(hr)
                this.hoverRow = hr
            }
            hr.clear()
            hr.rect(left, topLines, w, h)
            hr.fill({ color: 0xffffff, alpha: 0.05 })
        } catch (err) { devLog.warn('hover row highlight failed', err) }
    }

    rebuildSpatialIndex(config: TimelineConfig): void {
        this.spatial.clear()
        for (const [id, layout] of this.taskLayouts.entries()) {
            this.spatial.insert({ id, x: layout.startX, y: layout.topY, width: layout.width, height: config.TASK_HEIGHT, type: 'task' })
        }
    }

    findTaskAtViewportPoint(x: number, y: number, excludeId?: string): string | null {
        const hits = this.spatial.pointQuery(x, y)
        for (const h of hits) {
            if (excludeId && h.id === excludeId) continue
            const cont = this.taskContainers.get(h.id)
            if (!cont) continue
            const local = cont.toLocal({ x, y } as any, this.layers.viewport)
            const hitArea = (cont as any).hitArea as Rectangle | undefined
            if (hitArea && hitArea.contains(local.x, local.y)) return h.id
        }
        return null
    }

    destroy(): void {
        this.taskContainers.forEach(c => c.destroy({ children: true }))
        this.dependencyGraphics.forEach(g => g.destroy())
        this.layers.viewport.destroy({ children: true })
        this.taskContainers.clear()
        this.dependencyGraphics.clear()
        this.taskLayouts.clear()
        this.taskAnchors.clear()
        this.taskData.clear()
        this.spatial.clear()
    }
}


