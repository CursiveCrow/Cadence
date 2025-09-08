import { Container, Graphics, Text } from 'pixi.js'
import { nearlyZero } from '@renderer/timeline'
import type { Task } from '@types'

export class TooltipRenderer {
    private tooltipBox: Graphics | null = null
    private tooltipStem: Graphics | null = null
    private tooltipTitle: Text | null = null
    private tooltipInfo: Text | null = null

    // Render tooltip for hovered task
    render(
        container: Container,
        hoverX: number | null,
        hoverY: number | null,
        hitTest: (x: number, y: number) => string | null,
        tasks: Task[],
        layout: { id: string; x: number; y: number; w: number; h: number }[],
        screenDimensions: { width: number; height: number },
        leftMargin: number
    ) {
        try {
            if (hoverX != null && hoverY != null) {
                const hovered = hitTest(hoverX, hoverY)
                if (hovered) {
                    const taskLayout = layout.find(l => l.id === hovered)
                    const task = tasks.find(t => t.id === hovered)
                    if (taskLayout && task) {
                        this.renderTooltip(container, task, taskLayout, hoverX, hoverY, screenDimensions, leftMargin)
                    }
                } else {
                    this.clearTooltip(container)
                }
            } else {
                this.clearTooltip(container)
            }
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[TooltipRenderer]render', err)
        }
    }

    private renderTooltip(
        container: Container,
        task: Task,
        layout: { x: number; y: number; w: number; h: number },
        mouseX: number,
        mouseY: number,
        screenDimensions: { width: number; height: number },
        leftMargin: number
    ) {
        const padding = 8
        const titleText = task.title || 'Task'
        const infoText = `${task.startDate} | ${Math.max(1, task.durationDays)}d`

        // Create or reuse text objects
        const title = this.tooltipTitle || new Text({
            text: '',
            style: {
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: 12,
                fontWeight: 'bold',
                fill: 0xffffff
            }
        })
        const info = this.tooltipInfo || new Text({
            text: '',
            style: {
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })

        title.text = titleText
        info.text = infoText

        const boxW = Math.max(160, Math.ceil(Math.max(title.width, info.width) + padding * 2))
        const boxH = Math.ceil(title.height + info.height + padding * 3)
        const radius = layout.h / 2
        const headX = layout.x + radius * 2
        const headY = layout.y + radius

        // Follow mouse: position box near hover point, clamped to view
        const desiredX = mouseX + 16
        const desiredYTop = mouseY - (boxH + 12)
        const screenW = screenDimensions.width
        const screenH = screenDimensions.height
        const tipX = Math.round(Math.max((leftMargin || 0) + 2, Math.min(screenW - boxW - 2, desiredX)))
        const tipY = Math.round(desiredYTop < 0
            ? Math.min(screenH - boxH - 2, mouseY + 16)
            : Math.min(screenH - boxH - 2, desiredYTop))

        // Compute slanted left edge to point towards head (lbLocalX)
        const dx = (headX - tipX)
        const dy = (headY - tipY)
        const len = Math.hypot(dx, dy) || 1
        const ux = dx / len
        const uy = dy / len
        const lbLocalX = nearlyZero(uy) ? 0 : (boxH / uy) * ux

        // Create or reuse background
        const bg = this.tooltipBox || new Graphics()
        bg.clear()
        bg.beginPath()
        bg.moveTo(0, 0)
        bg.lineTo(boxW, 0)
        bg.lineTo(boxW, boxH)
        bg.lineTo(lbLocalX, boxH)
        bg.closePath()
        bg.fill({ color: 0x111111, alpha: 0.9 })
        bg.stroke({ width: 1, color: 0xffffff, alpha: 0.2 })
        bg.position.set(tipX, tipY)
        if (!bg.parent) container.addChild(bg)
        this.tooltipBox = bg

        // Position text
        title.x = padding
        title.y = padding
        info.x = padding
        info.y = Math.round(title.y + title.height + padding / 2)
        if (!title.parent) container.addChild(title)
        if (!info.parent) container.addChild(info)
        title.position.set(tipX + title.x, tipY + title.y)
        info.position.set(tipX + info.x, tipY + info.y)

        // Cache text objects for reuse
        this.tooltipTitle = title
        this.tooltipInfo = info

        // Stem line
        const stem = this.tooltipStem || new Graphics()
        stem.clear()
        stem.moveTo(tipX, tipY)
        stem.lineTo(headX, headY)
        stem.stroke({ width: 2, color: 0x111111, alpha: 0.9 })
        if (!stem.parent) container.addChild(stem)
        this.tooltipStem = stem
    }

    private clearTooltip(container: Container) {
        // Clear tooltip elements
        if (this.tooltipBox) {
            try {
                container.removeChild(this.tooltipBox)
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TooltipRenderer]remove tooltipBox', err)
            }
            try {
                this.tooltipBox.destroy()
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TooltipRenderer]destroy tooltipBox', err)
            }
            this.tooltipBox = null
        }

        if (this.tooltipStem) {
            try {
                container.removeChild(this.tooltipStem)
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TooltipRenderer]remove tooltipStem', err)
            }
            try {
                this.tooltipStem.destroy()
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TooltipRenderer]destroy tooltipStem', err)
            }
            this.tooltipStem = null
        }

        if (this.tooltipTitle) {
            try {
                container.removeChild(this.tooltipTitle)
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TooltipRenderer]remove tooltipTitle', err)
            }
            try {
                (this.tooltipTitle as any).destroy?.()
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TooltipRenderer]destroy tooltipTitle', err)
            }
            this.tooltipTitle = null
        }

        if (this.tooltipInfo) {
            try {
                container.removeChild(this.tooltipInfo)
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TooltipRenderer]remove tooltipInfo', err)
            }
            try {
                (this.tooltipInfo as any).destroy?.()
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[TooltipRenderer]destroy tooltipInfo', err)
            }
            this.tooltipInfo = null
        }
    }

    // Cleanup method for when tooltip renderer is no longer needed
    destroy(container: Container) {
        this.clearTooltip(container)
    }

    // Check if tooltip is currently visible
    isVisible(): boolean {
        return this.tooltipBox !== null && this.tooltipBox.parent !== null
    }

    // Get tooltip bounds for hit testing
    getTooltipBounds(): { x: number; y: number; width: number; height: number } | null {
        if (!this.tooltipBox || !this.tooltipBox.parent) return null

        return {
            x: this.tooltipBox.x,
            y: this.tooltipBox.y,
            width: this.tooltipBox.width,
            height: this.tooltipBox.height
        }
    }
}


