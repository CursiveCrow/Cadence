/**
 * DependencyRenderer
 * Renders dependency lines between tasks in the timeline
 */

import { Container, Graphics } from 'pixi.js'
import { Dependency } from '../../core/domain/entities/Dependency'
import { DependencyType } from '../../core/domain/value-objects/DependencyType'
import { drawCurvedDependencyArrow, drawDependencyArrow } from '../utils/shapes'

export interface TaskAnchors {
    leftCenterX: number
    leftCenterY: number
    rightCenterX: number
    rightCenterY: number
}

export interface DependencyRendererOptions {
    container: Container
    dependencies: Dependency[]
    getTaskAnchors: (taskId: string) => TaskAnchors | undefined
    color?: number
    selectedIds?: string[]
    highlightedId?: string | null
}

export class DependencyRenderer {
    private container: Container
    private graphics: Map<string, Graphics> = new Map()
    private options: DependencyRendererOptions

    constructor(options: DependencyRendererOptions) {
        this.options = options
        this.container = options.container
    }

    /**
     * Render all dependencies
     */
    render(): void {
        const { dependencies, getTaskAnchors, selectedIds = [], highlightedId } = this.options

        // Track which dependencies are still valid
        const validIds = new Set<string>()

        for (const dependency of dependencies) {
            const srcAnchors = getTaskAnchors(dependency.srcTaskId)
            const dstAnchors = getTaskAnchors(dependency.dstTaskId)

            if (!srcAnchors || !dstAnchors) continue

            validIds.add(dependency.id)

            // Get or create graphics for this dependency
            let graphics = this.graphics.get(dependency.id)
            if (!graphics) {
                graphics = new Graphics()
                graphics.eventMode = 'static'
                graphics.cursor = 'pointer'
                this.container.addChild(graphics)
                this.graphics.set(dependency.id, graphics)
            }

            // Clear and redraw
            graphics.clear()

            // Determine color and style
            const isSelected = selectedIds.includes(dependency.id)
            const isHighlighted = dependency.id === highlightedId
            const color = this.getColor(isSelected, isHighlighted)
            const alpha = this.getAlpha(isSelected, isHighlighted)
            const width = this.getWidth(isSelected, isHighlighted)

            // Draw based on dependency type
            this.drawDependencyLine(
                graphics,
                dependency.type,
                srcAnchors,
                dstAnchors,
                color,
                alpha,
                width
            )

            // Set hit area for interaction
            graphics.hitArea = this.createHitArea(srcAnchors, dstAnchors)
        }

        // Remove graphics for dependencies that no longer exist
        for (const [id, graphics] of this.graphics) {
            if (!validIds.has(id)) {
                this.container.removeChild(graphics)
                graphics.destroy()
                this.graphics.delete(id)
            }
        }
    }

    /**
     * Draw dependency line based on type
     */
    private drawDependencyLine(
        graphics: Graphics,
        type: DependencyType,
        srcAnchors: TaskAnchors,
        dstAnchors: TaskAnchors,
        color: number,
        alpha: number,
        width: number
    ): void {
        let srcX: number, srcY: number, dstX: number, dstY: number

        switch (type) {
            case DependencyType.FINISH_TO_START:
                // From right of source to left of destination
                srcX = srcAnchors.rightCenterX
                srcY = srcAnchors.rightCenterY
                dstX = dstAnchors.leftCenterX
                dstY = dstAnchors.leftCenterY
                break

            case DependencyType.START_TO_START:
                // From left of source to left of destination
                srcX = srcAnchors.leftCenterX
                srcY = srcAnchors.leftCenterY
                dstX = dstAnchors.leftCenterX
                dstY = dstAnchors.leftCenterY
                break

            case DependencyType.FINISH_TO_FINISH:
                // From right of source to right of destination
                srcX = srcAnchors.rightCenterX
                srcY = srcAnchors.rightCenterY
                dstX = dstAnchors.rightCenterX
                dstY = dstAnchors.rightCenterY
                break

            case DependencyType.START_TO_FINISH:
                // From left of source to right of destination
                srcX = srcAnchors.leftCenterX
                srcY = srcAnchors.leftCenterY
                dstX = dstAnchors.rightCenterX
                dstY = dstAnchors.rightCenterY
                break

            default:
                srcX = srcAnchors.rightCenterX
                srcY = srcAnchors.rightCenterY
                dstX = dstAnchors.leftCenterX
                dstY = dstAnchors.leftCenterY
        }

        // Use curved arrow for better visibility
        const dx = dstX - srcX
        const dy = dstY - srcY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance > 50) {
            // Use curved line for longer distances
            const curvature = 0.2
            const cpX = srcX + dx / 2 + dy * curvature
            const cpY = srcY + dy / 2 - dx * curvature

            graphics.moveTo(srcX, srcY)
            graphics.bezierCurveTo(
                srcX + dx * 0.25, srcY + dy * 0.25,
                cpX, cpY,
                dstX, dstY
            )
            graphics.stroke({ width, color, alpha })

            // Draw arrowhead
            const angle = Math.atan2(dstY - cpY, dstX - cpX)
            this.drawArrowhead(graphics, dstX, dstY, angle, color, alpha)
        } else {
            // Use straight line for short distances
            graphics.moveTo(srcX, srcY)
            graphics.lineTo(dstX, dstY)
            graphics.stroke({ width, color, alpha })

            // Draw arrowhead
            const angle = Math.atan2(dy, dx)
            this.drawArrowhead(graphics, dstX, dstY, angle, color, alpha)
        }
    }

    /**
     * Draw arrowhead
     */
    private drawArrowhead(
        graphics: Graphics,
        x: number,
        y: number,
        angle: number,
        color: number,
        alpha: number
    ): void {
        const arrowLength = 8
        const arrowAngle = Math.PI / 6

        graphics.moveTo(x, y)
        graphics.lineTo(
            x - arrowLength * Math.cos(angle - arrowAngle),
            y - arrowLength * Math.sin(angle - arrowAngle)
        )
        graphics.lineTo(
            x - arrowLength * Math.cos(angle + arrowAngle),
            y - arrowLength * Math.sin(angle + arrowAngle)
        )
        graphics.closePath()
        graphics.fill({ color, alpha })
    }

    /**
     * Create hit area for interaction
     */
    private createHitArea(srcAnchors: TaskAnchors, dstAnchors: TaskAnchors): any {
        // Create a simple rectangular hit area between the two tasks
        const minX = Math.min(srcAnchors.rightCenterX, dstAnchors.leftCenterX) - 10
        const maxX = Math.max(srcAnchors.rightCenterX, dstAnchors.leftCenterX) + 10
        const minY = Math.min(srcAnchors.rightCenterY, dstAnchors.leftCenterY) - 10
        const maxY = Math.max(srcAnchors.rightCenterY, dstAnchors.leftCenterY) + 10

        return {
            contains: (x: number, y: number) => {
                return x >= minX && x <= maxX && y >= minY && y <= maxY
            }
        }
    }

    /**
     * Get color for dependency
     */
    private getColor(isSelected: boolean, isHighlighted: boolean): number {
        if (isSelected) return 0x4285f4
        if (isHighlighted) return 0x5a95f5
        return this.options.color || 0x666666
    }

    /**
     * Get alpha for dependency
     */
    private getAlpha(isSelected: boolean, isHighlighted: boolean): number {
        if (isSelected) return 1
        if (isHighlighted) return 0.9
        return 0.6
    }

    /**
     * Get line width for dependency
     */
    private getWidth(isSelected: boolean, isHighlighted: boolean): number {
        if (isSelected) return 3
        if (isHighlighted) return 2.5
        return 2
    }

    /**
     * Highlight a dependency
     */
    highlight(dependencyId: string | null): void {
        this.options.highlightedId = dependencyId
        this.render()
    }

    /**
     * Select dependencies
     */
    select(dependencyIds: string[]): void {
        this.options.selectedIds = dependencyIds
        this.render()
    }

    /**
     * Update options
     */
    updateOptions(options: Partial<DependencyRendererOptions>): void {
        this.options = { ...this.options, ...options }
    }

    /**
     * Clear all graphics
     */
    clear(): void {
        for (const graphics of this.graphics.values()) {
            graphics.clear()
        }
    }

    /**
     * Destroy the renderer
     */
    destroy(): void {
        for (const graphics of this.graphics.values()) {
            this.container.removeChild(graphics)
            graphics.destroy()
        }
        this.graphics.clear()
    }
}