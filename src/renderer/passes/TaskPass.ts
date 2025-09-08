import { Container, Graphics, Text } from 'pixi.js'
import { statusToColor, renderNoteHeadAndLine, renderLabelWithMast } from '../primitives/tasks'
import { dayIndexFromISO } from '@renderer/timeline'
import { PROJECT_START_DATE } from '@config'
import type { Task } from '@types'

// Task graphics cache interface
interface TaskGraphicsCache {
    head: Graphics
    labelBox: Graphics
    labelMast: Graphics
    labelText: Text
    glyph?: Text
}

// Staff block interface for task positioning
interface StaffBlock {
    id: string
    yTop: number
    yBottom: number
    lineSpacing: number
}

// Layout information for rendered tasks
export interface TaskLayout {
    id: string
    x: number
    y: number
    w: number
    h: number
}

export class TaskPass {
    private taskCache: Map<string, TaskGraphicsCache> = new Map()

    // Main task rendering method
    render(
        container: Container,
        tasks: Task[],
        staffBlocks: StaffBlock[],
        selection: string[],
        viewport: { x: number; y: number; zoom: number },
        hover: { x: number | null; y: number | null },
        screenDimensions: { width: number; height: number },
        leftMargin: number,
        pxPerDay: number
    ): { visibleTaskIds: string[]; layout: TaskLayout[] } {
        const visibleTaskIds: string[] = []
        const layout: TaskLayout[] = []
        const { width, height } = screenDimensions

        for (const task of tasks) {
            const staffBlock = staffBlocks.find(b => b.id === task.staffId)
            if (!staffBlock) continue

            const taskLayout = this.calculateTaskLayout(task, staffBlock, viewport, leftMargin, pxPerDay)

            // Cull off-screen tasks
            if (this.isTaskOffScreen(taskLayout, leftMargin, width, height)) continue

            const selected = selection.includes(task.id)
            const status = (task as any).status || 'not_started'
            const color = statusToColor(status)
            const isHovering = this.isTaskHovered(taskLayout, hover)

            visibleTaskIds.push(task.id)

            // Get or create cached graphics nodes
            let nodes = this.taskCache.get(task.id)
            if (!nodes) {
                nodes = this.createTaskGraphicsNodes(color)
                this.taskCache.set(task.id, nodes)
            }

            // Render task components
            this.renderTaskHead(nodes.head, taskLayout, color, selected, isHovering, status, pxPerDay)
            this.renderTaskGlyph(nodes, taskLayout, status)
            this.renderTaskLabel(nodes, taskLayout, task.title || '', color, selected, isHovering, width, height)

            // Add to container in z-order
            container.addChild(nodes.head)
            container.addChild(nodes.labelBox)
            container.addChild(nodes.labelMast)
            container.addChild(nodes.labelText)
            if (nodes.glyph) container.addChild(nodes.glyph)

            layout.push({ id: task.id, x: taskLayout.xLeft, y: taskLayout.yTop, w: taskLayout.w, h: taskLayout.h })
        }

        // Prune unused cached task nodes
        this.pruneUnusedCache(visibleTaskIds)

        return { visibleTaskIds, layout }
    }

    private calculateTaskLayout(
        task: Task,
        staffBlock: StaffBlock,
        viewport: { x: number; y: number; zoom: number },
        leftMargin: number,
        pxPerDay: number
    ) {
        const lineStep = staffBlock.lineSpacing / 2
        const centerY = staffBlock.yTop + task.staffLine * lineStep
        const h = this.computeNoteHeight(staffBlock.lineSpacing)
        const yTop = centerY - h / 2

        // compute x from startDate relative to PROJECT_START_DATE
        const day = dayIndexFromISO(task.startDate, PROJECT_START_DATE)
        const xLeft = leftMargin + (day - viewport.x) * pxPerDay
        const w = Math.max(4, Math.round(task.durationDays * pxPerDay))

        return { xLeft, yTop, w, h }
    }

    private isTaskOffScreen(
        layout: { xLeft: number; yTop: number; w: number; h: number },
        leftMargin: number,
        screenWidth: number,
        screenHeight: number
    ): boolean {
        return layout.xLeft + layout.w < leftMargin - 200 ||
            layout.xLeft > screenWidth + 200 ||
            layout.yTop > screenHeight ||
            layout.yTop + layout.h < 0
    }

    private isTaskHovered(
        layout: { xLeft: number; yTop: number; w: number; h: number },
        hover: { x: number | null; y: number | null }
    ): boolean {
        return hover.x != null && hover.y != null &&
            hover.x >= layout.xLeft && hover.x <= layout.xLeft + layout.w &&
            hover.y >= layout.yTop && hover.y <= layout.yTop + layout.h
    }

    private createTaskGraphicsNodes(color: number): TaskGraphicsCache {
        return {
            head: new Graphics(),
            labelBox: new Graphics(),
            labelMast: new Graphics(),
            labelText: new Text({
                text: '',
                style: {
                    fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
                    fontSize: 10,
                    fill: color
                }
            }),
        }
    }

    private renderTaskHead(
        head: Graphics,
        layout: { xLeft: number; yTop: number; w: number; h: number },
        color: number,
        selected: boolean,
        isHovering: boolean,
        status: string,
        pxPerDay: number
    ) {
        renderNoteHeadAndLine(head, {
            x: layout.xLeft,
            yTop: layout.yTop,
            width: layout.w,
            height: layout.h,
            color,
            selected,
            pxPerDay,
            status: String(status),
            hovered: isHovering,
        })
    }

    private renderTaskGlyph(
        nodes: TaskGraphicsCache,
        layout: { xLeft: number; yTop: number; w: number; h: number },
        status: string
    ) {
        const glyphChar = this.statusToAccidental(String(status))
        if (glyphChar) {
            if (!nodes.glyph) {
                nodes.glyph = new Text({
                    text: glyphChar,
                    style: {
                        fontFamily: 'serif',
                        fontSize: Math.max(10, Math.round(layout.h * 0.7)),
                        fill: 0xffffff
                    }
                })
            }
            nodes.glyph.text = glyphChar
            ;(nodes.glyph.style as any).fontSize = Math.max(10, Math.round(layout.h * 0.7))
            nodes.glyph.x = Math.round(layout.xLeft + layout.h / 2 - nodes.glyph.width / 2)
            nodes.glyph.y = Math.round(layout.yTop + layout.h / 2 - nodes.glyph.height / 2)
        } else if (nodes.glyph) {
            try { if ((nodes.glyph as any).parent) (nodes.glyph as any).parent.removeChild(nodes.glyph) } catch {}
            try { (nodes.glyph as any).destroy?.() } catch {}
            nodes.glyph = undefined
        }
    }
    private renderTaskLabel(
        nodes: TaskGraphicsCache,
        layout: { xLeft: number; yTop: number; w: number; h: number },
        title: string,
        color: number,
        selected: boolean,
        isHovering: boolean,
        screenWidth: number,
        screenHeight: number
    ) {
        const labelText = nodes.labelText
            ; (labelText.style as any).fill = (selected || isHovering) ? 0xffffff : color

        renderLabelWithMast(nodes.labelBox, nodes.labelMast, labelText, {
            xLeft: layout.xLeft,
            yTop: layout.yTop,
            h: layout.h,
            text: title,
            headColor: color,
            width: screenWidth,
            height: screenHeight,
            selected,
            hovered: isHovering,
        })
    }

    private pruneUnusedCache(visibleTaskIds: string[]) {
        try {
            for (const [taskId, nodes] of this.taskCache) {
                if (!visibleTaskIds.includes(taskId)) {
                    try { nodes.head.destroy() } catch (err) {
                        if (import.meta?.env?.DEV) console.debug('[TaskPass]destroy head', err)
                    }
                    try { nodes.labelBox.destroy() } catch (err) {
                        if (import.meta?.env?.DEV) console.debug('[TaskPass]destroy labelBox', err)
                    }
                    try { nodes.labelMast.destroy() } catch (err) {
                        if (import.meta?.env?.DEV) console.debug('[TaskPass]destroy labelMast', err)
                    }
                    try { (nodes.labelText as any).destroy?.() } catch (err) {
                        if (import.meta?.env?.DEV) console.debug('[TaskPass]destroy labelText', err)
                    }
                    if (nodes.glyph) {
                        try { (nodes.glyph as any).destroy?.() } catch (err) {
                            if (import.meta?.env?.DEV) console.debug('[TaskPass]destroy glyph', err)
                        }
                    }
                    this.taskCache.delete(taskId)
                }
            }
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[TaskPass]prune cache', err)
        }
    }

    // Simple, explicit note height calculator. Uses staff line spacing; clamps to sane bounds.
    private computeNoteHeight(lineSpacing: number): number {
        const raw = Math.round(lineSpacing * 0.8) // 80% of spacing feels balanced for circular head
        const h = Math.max(12, Math.min(28, raw))
        return h
    }

    // Status to musical accidental mapping
    
private statusToAccidental(status: string): string {
    switch (status) {
        case 'in_progress':
            return String.fromCodePoint(0x266F)
        case 'completed':
            return String.fromCodePoint(0x266E)
        case 'blocked':
            return String.fromCodePoint(0x266D)
        case 'cancelled':
            return String.fromCodePoint(0x00D7)
        default:
            return ''
    }
}

    // Preview rendering for drag operations
    renderDragPreview(
        container: Container,
        x: number,
        y: number,
        w: number,
        h: number,
        existingPreview?: Graphics | null
    ): Graphics {
        const reused = existingPreview && !(existingPreview as any)._destroyed
        const g = reused ? existingPreview! : new Graphics()
        g.clear()

        const px = Math.round(x)
        const py = Math.round(y)
        const pw = Math.max(2, Math.round(w))
        const ph = Math.round(h)
        const radius = Math.max(4, Math.floor(ph / 2))

        // Animated pulse effect (outer glow)
        const time = Date.now() / 1000
        const pulseScale = 1 + Math.sin(time * 4) * 0.1
        const glowRadius = radius * pulseScale

        // Outer glow rings
        for (let i = 3; i > 0; i--) {
            g.beginPath()
            g.ellipse(px + radius, py + radius, glowRadius + i * 4, glowRadius * 0.9 + i * 3)
            g.fill({ color: 0xA855F7, alpha: 0.08 * (4 - i) })
        }

        // Main preview shape with gradient effect
        g.beginPath()
        if (pw <= ph + 4) {
            g.ellipse(px + radius, py + radius, radius * 1.1, radius * 0.9)
        } else {
            // Musical note-like shape for extended duration
            g.moveTo(px + radius, py)
            g.lineTo(px + pw - radius, py)
            g.quadraticCurveTo(px + pw, py, px + pw, py + radius)
            g.lineTo(px + pw, py + ph - radius)
            g.quadraticCurveTo(px + pw, py + ph, px + pw - radius, py + ph)
            g.lineTo(px + radius, py + ph)
            g.arc(px + radius, py + radius, radius, Math.PI / 2, -Math.PI / 2, false)
        }
        g.closePath()
        g.fill({ color: 0xA855F7, alpha: 0.4 })
        g.stroke({ width: 2, color: 0xC084FC, alpha: 1 })

        // Inner highlight
        g.beginPath()
        g.ellipse(px + radius - radius * 0.2, py + radius - radius * 0.2, radius * 0.5, radius * 0.4)
        g.fill({ color: 0xffffff, alpha: 0.6 })

        // Musical accent dot
        g.circle(px + radius, py + radius, 2)
        g.fill({ color: 0xffffff, alpha: 0.9 })

        if (!g.parent) container.addChild(g)
        return g
    }

    // Clear preview graphics
    clearPreview(preview: Graphics | null) {
        try { preview?.clear() } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[TaskRenderer]clearPreview', err)
        }
    }

    // Dependency preview rendering
    renderDependencyPreview(
        container: Container,
        src: { x: number; y: number; w: number; h: number },
        dstPoint: { x: number; y: number },
        existingPreview?: Graphics | null
    ): Graphics {
        const reused = existingPreview && !(existingPreview as any)._destroyed
        const g = reused ? existingPreview! : new Graphics()
        g.clear()

        const x0 = src.x + src.w
        const y0 = src.y + src.h / 2
        const x1 = dstPoint.x
        const y1 = dstPoint.y
        const cx1 = x0 + Math.max(30, Math.abs(x1 - x0) * 0.4)
        const cx2 = x1 - Math.max(30, Math.abs(x1 - x0) * 0.4)

        // Animated flow effect
        const time = Date.now() / 500

        // Draw multiple curves for a flowing effect
        for (let i = 0; i < 3; i++) {
            const offset = i * 2
            g.moveTo(Math.round(x0), Math.round(y0 + offset - 2))
            g.bezierCurveTo(
                Math.round(cx1), Math.round(y0 + offset - 2),
                Math.round(cx2), Math.round(y1 + offset - 2),
                Math.round(x1), Math.round(y1 + offset - 2)
            )
            g.stroke({
                width: 3 - i,
                color: i === 0 ? 0xA855F7 : 0xC084FC,
                alpha: 0.6 - i * 0.15
            })
        }

        // Main curve with gradient
        g.moveTo(Math.round(x0), Math.round(y0))
        g.bezierCurveTo(Math.round(cx1), Math.round(y0), Math.round(cx2), Math.round(y1), Math.round(x1), Math.round(y1))
        g.stroke({ width: 2, color: 0xFACC15, alpha: 0.9 })

        // Arrowhead with glow
        const angle = Math.atan2(y1 - y0, x1 - x0)
        const arrow = 10

        // Glow behind arrow
        g.beginPath()
        g.circle(x1, y1, 8)
        g.fill({ color: 0xFACC15, alpha: 0.3 })

        // Arrow shape
        g.beginPath()
        g.moveTo(Math.round(x1), Math.round(y1))
        g.lineTo(Math.round(x1 - arrow * Math.cos(angle - Math.PI / 5)), Math.round(y1 - arrow * Math.sin(angle - Math.PI / 5)))
        g.lineTo(Math.round(x1 - arrow * 0.7 * Math.cos(angle)), Math.round(y1 - arrow * 0.7 * Math.sin(angle)))
        g.lineTo(Math.round(x1 - arrow * Math.cos(angle + Math.PI / 5)), Math.round(y1 - arrow * Math.sin(angle + Math.PI / 5)))
        g.closePath()
        g.fill({ color: 0xFACC15, alpha: 1 })

        // Add pulse dots along the curve
        const steps = 5
        for (let t = 0.2; t <= 0.8; t += 0.6 / steps) {
            const px = Math.round(Math.pow(1 - t, 3) * x0 + 3 * Math.pow(1 - t, 2) * t * cx1 + 3 * (1 - t) * Math.pow(t, 2) * cx2 + Math.pow(t, 3) * x1)
            const py = Math.round(Math.pow(1 - t, 3) * y0 + 3 * Math.pow(1 - t, 2) * t * y0 + 3 * (1 - t) * Math.pow(t, 2) * y1 + Math.pow(t, 3) * y1)
            const pulseSize = 1 + Math.sin((time + t * 10) * 2) * 0.5
            g.circle(px, py, pulseSize)
            g.fill({ color: 0xC084FC, alpha: 0.8 })
        }

        if (!g.parent) container.addChild(g)
        return g
    }

    // Clear dependency preview
    clearDependencyPreview(dependencyPreview: Graphics | null, _container: Container) {
        if (dependencyPreview && dependencyPreview.parent) {
            try {
                dependencyPreview.parent.removeChild(dependencyPreview)
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TaskRenderer]clearDependencyPreview remove', err)
            }
            try {
                dependencyPreview.destroy()
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TaskRenderer]clearDependencyPreview destroy', err)
            }
        }
    }

    // Get cache statistics for debugging
    getCacheStats() {
        return {
            cacheSize: this.taskCache.size,
            cacheKeys: Array.from(this.taskCache.keys())
        }
    }

    // Clear entire cache (for cleanup)
    clearCache() {
        for (const [_taskId, nodes] of this.taskCache) {
            try { nodes.head.destroy() } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TaskRenderer]clearCache destroy head', err)
            }
            try { nodes.labelBox.destroy() } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TaskRenderer]clearCache destroy labelBox', err)
            }
            try { nodes.labelMast.destroy() } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TaskRenderer]clearCache destroy labelMast', err)
            }
            try { (nodes.labelText as any).destroy?.() } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TaskRenderer]clearCache destroy labelText', err)
            }
            if (nodes.glyph) {
                try { (nodes.glyph as any).destroy?.() } catch (err) {
                    if (import.meta?.env?.DEV) console.debug('[TaskRenderer]clearCache destroy glyph', err)
                }
            }
        }
        this.taskCache.clear()
    }
}






