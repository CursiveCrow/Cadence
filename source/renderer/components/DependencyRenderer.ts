/**
 * DependencyRenderer Component
 * Handles rendering of task dependencies
 */

import { Graphics, Container } from 'pixi.js'
import type { Dependency } from '../../core/domain/entities/Dependency'
import type { TaskAnchors } from '../core/SceneGraph'

export interface DependencyRendererOptions {
    dependency: Dependency
    srcAnchors: TaskAnchors
    dstAnchors: TaskAnchors
    color: number
    isSelected: boolean
    isHighlighted: boolean
}

export class DependencyRenderer {
    private graphics: Graphics
    private arrowHead: Graphics
    private container: Container

    constructor(private options: DependencyRendererOptions) {
        this.container = new Container()
        this.container.name = `dependency-${options.dependency.id}`

        this.graphics = new Graphics()
        this.graphics.name = 'line'

        this.arrowHead = new Graphics()
        this.arrowHead.name = 'arrow'

        this.container.addChild(this.graphics)
        this.container.addChild(this.arrowHead)

        this.render()
    }

    private render(): void {
        const { dependency, srcAnchors, dstAnchors, color, isSelected, isHighlighted } = this.options

        // Clear existing graphics
        this.graphics.clear()
        this.arrowHead.clear()

        // Determine line style
        const lineColor = isSelected ? 0x4285f4 : (isHighlighted ? 0xffa500 : color)
        const lineWidth = isSelected ? 3 : (isHighlighted ? 2 : 1.5)
        const lineAlpha = isHighlighted ? 1 : 0.6

        // Calculate connection points based on dependency type
        let startX: number, startY: number, endX: number, endY: number

        switch (dependency.type) {
            case 'finish_to_start':
                startX = srcAnchors.rightCenterX
                startY = srcAnchors.rightCenterY
                endX = dstAnchors.leftCenterX
                endY = dstAnchors.leftCenterY
                break

            case 'start_to_start':
                startX = srcAnchors.leftCenterX
                startY = srcAnchors.leftCenterY
                endX = dstAnchors.leftCenterX
                endY = dstAnchors.leftCenterY
                break

            case 'finish_to_finish':
                startX = srcAnchors.rightCenterX
                startY = srcAnchors.rightCenterY
                endX = dstAnchors.rightCenterX
                endY = dstAnchors.rightCenterY
                break

            case 'start_to_finish':
                startX = srcAnchors.leftCenterX
                startY = srcAnchors.leftCenterY
                endX = dstAnchors.rightCenterX
                endY = dstAnchors.rightCenterY
                break

            default:
                // Default to finish-to-start
                startX = srcAnchors.rightCenterX
                startY = srcAnchors.rightCenterY
                endX = dstAnchors.leftCenterX
                endY = dstAnchors.leftCenterY
        }

        // Draw the dependency line with a curve
        this.drawCurvedArrow(startX, startY, endX, endY, lineColor, lineWidth, lineAlpha)

        // Make interactive if needed
        this.container.eventMode = 'static'
        this.container.cursor = 'pointer'
    }

    private drawCurvedArrow(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color: number,
        width: number,
        alpha: number
    ): void {
        // Calculate control points for bezier curve
        const dx = x2 - x1
        const dy = y2 - y1
        const distance = Math.sqrt(dx * dx + dy * dy)

        // Determine curve style based on relative positions
        if (Math.abs(dy) < 10 && dx > 0) {
            // Straight horizontal line
            this.graphics.moveTo(x1, y1)
            this.graphics.lineTo(x2, y2)
        } else {
            // Curved line
            const curveStrength = Math.min(distance * 0.3, 50)

            let cx1: number, cy1: number, cx2: number, cy2: number

            if (dx > 0) {
                // Forward dependency
                cx1 = x1 + curveStrength
                cy1 = y1
                cx2 = x2 - curveStrength
                cy2 = y2
            } else {
                // Backward dependency or vertical
                const midX = (x1 + x2) / 2
                const midY = (y1 + y2) / 2

                cx1 = midX
                cy1 = y1
                cx2 = midX
                cy2 = y2
            }

            // Draw bezier curve
            this.graphics.moveTo(x1, y1)
            this.graphics.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2)
        }

        this.graphics.stroke({ width, color, alpha })

        // Draw arrowhead
        this.drawArrowHead(x2, y2, Math.atan2(y2 - y1, x2 - x1), color, alpha)
    }

    private drawArrowHead(
        x: number,
        y: number,
        angle: number,
        color: number,
        alpha: number
    ): void {
        const arrowLength = 10
        const arrowAngle = Math.PI / 6

        // Calculate arrow points
        const x1 = x - arrowLength * Math.cos(angle - arrowAngle)
        const y1 = y - arrowLength * Math.sin(angle - arrowAngle)
        const x2 = x - arrowLength * Math.cos(angle + arrowAngle)
        const y2 = y - arrowLength * Math.sin(angle + arrowAngle)

        // Draw filled arrow
        this.arrowHead.moveTo(x, y)
        this.arrowHead.lineTo(x1, y1)
        this.arrowHead.lineTo(x2, y2)
        this.arrowHead.lineTo(x, y)
        this.arrowHead.fill({ color, alpha })
    }

    update(options: Partial<DependencyRendererOptions>): void {
        Object.assign(this.options, options)
        this.render()
    }

    highlight(enabled: boolean): void {
        this.options.isHighlighted = enabled
        this.render()
    }

    select(selected: boolean): void {
        this.options.isSelected = selected
        this.render()
    }

    getContainer(): Container {
        return this.container
    }

    destroy(): void {
        this.container.destroy({ children: true })
    }
}
