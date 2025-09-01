/**
 * Shape Drawing Utilities
 * Core shape rendering functions for timeline visualization
 */

import { Graphics, Container } from 'pixi.js'

/**
 * Draw a task note body with rounded end-caps (musical note style)
 * Following the archive's design with circle end-caps
 */
export function drawNoteBodyPath(
    graphics: Graphics,
    x: number,
    y: number,
    width: number,
    height: number
): void {
    const radius = height / 2

    // Clear any existing graphics
    graphics.clear()

    // Draw rounded rectangle with circular end-caps
    graphics.roundRect(x, y, width, height, radius)
}

/**
 * Draw a task note body at absolute coordinates
 */
export function drawNoteBodyPathAbsolute(
    graphics: Graphics,
    x: number,
    topY: number,
    width: number,
    height: number
): void {
    const radius = height / 2

    graphics.clear()
    graphics.roundRect(x, topY, width, height, radius)
}

/**
 * Draw a dependency arrow between two points
 */
export function drawDependencyArrow(
    graphics: Graphics,
    srcX: number,
    srcY: number,
    dstX: number,
    dstY: number,
    color: number = 0x666666
): void {
    graphics.clear()

    // Draw line
    graphics.moveTo(srcX, srcY)
    graphics.lineTo(dstX, dstY)
    graphics.stroke({ width: 2, color, alpha: 0.8 })

    // Draw arrowhead
    const angle = Math.atan2(dstY - srcY, dstX - srcX)
    const arrowLength = 8
    const arrowAngle = Math.PI / 6

    graphics.moveTo(dstX, dstY)
    graphics.lineTo(
        dstX - arrowLength * Math.cos(angle - arrowAngle),
        dstY - arrowLength * Math.sin(angle - arrowAngle)
    )
    graphics.lineTo(
        dstX - arrowLength * Math.cos(angle + arrowAngle),
        dstY - arrowLength * Math.sin(angle + arrowAngle)
    )
    graphics.closePath()
    graphics.fill({ color, alpha: 0.8 })
}

/**
 * Draw a curved dependency arrow (for better visual clarity)
 */
export function drawCurvedDependencyArrow(
    graphics: Graphics,
    srcX: number,
    srcY: number,
    dstX: number,
    dstY: number,
    color: number = 0x666666,
    curvature: number = 0.2
): void {
    graphics.clear()

    const dx = dstX - srcX
    const dy = dstY - srcY
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Control point for bezier curve
    const cpX = srcX + dx / 2 + dy * curvature
    const cpY = srcY + dy / 2 - dx * curvature

    // Draw curved line
    graphics.moveTo(srcX, srcY)
    graphics.bezierCurveTo(
        srcX + dx * 0.25, srcY + dy * 0.25,
        cpX, cpY,
        dstX, dstY
    )
    graphics.stroke({ width: 2, color, alpha: 0.8 })

    // Draw arrowhead
    const angle = Math.atan2(dstY - cpY, dstX - cpX)
    const arrowLength = 8
    const arrowAngle = Math.PI / 6

    graphics.moveTo(dstX, dstY)
    graphics.lineTo(
        dstX - arrowLength * Math.cos(angle - arrowAngle),
        dstY - arrowLength * Math.sin(angle - arrowAngle)
    )
    graphics.lineTo(
        dstX - arrowLength * Math.cos(angle + arrowAngle),
        dstY - arrowLength * Math.sin(angle + arrowAngle)
    )
    graphics.closePath()
    graphics.fill({ color, alpha: 0.8 })
}

/**
 * Draw selection highlight around a task
 */
export function drawSelectionHighlight(
    container: Container,
    config: any,
    layout: { startX: number; topY: number; width: number; radius: number }
): Graphics {
    const selection = new Graphics()

    const padding = 4
    selection.roundRect(
        layout.startX - padding,
        layout.topY - padding,
        layout.width + padding * 2,
        layout.radius * 2 + padding * 2,
        layout.radius + padding
    )
    selection.stroke({ width: 2, color: config.SELECTION_COLOR || 0x4285f4, alpha: 0.8 })

    container.addChild(selection)
    return selection
}

/**
 * Draw a status glyph (musical accidental) for task status
 * Based on the archive's status glyph system
 */
export function drawStatusGlyph(
    graphics: Graphics,
    x: number,
    y: number,
    status: string,
    size: number = 16
): void {
    graphics.clear()

    // Map status to musical accidentals
    let glyph = ''
    let color = 0xffffff

    switch (status) {
        case 'completed':
            glyph = '♮' // Natural sign for completed
            color = 0x4caf50
            break
        case 'in_progress':
            glyph = '♯' // Sharp sign for in progress
            color = 0x2196f3
            break
        case 'blocked':
            glyph = '♭' // Flat sign for blocked
            color = 0xf44336
            break
        case 'cancelled':
            glyph = '𝄪' // Double-sharp for cancelled [[memory:7264396]]
            color = 0x9e9e9e
            break
        default:
            glyph = '○' // Empty circle for not started
            color = 0x757575
    }

    // Draw circle background
    graphics.circle(x, y, size / 2)
    graphics.fill({ color: 0x000000, alpha: 0.2 })

    // Note: Text rendering would be handled separately with PIXI.Text
    // This function focuses on the shape/background
}

/**
 * Draw grid lines for the timeline
 */
export function drawGridLine(
    graphics: Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
    alpha: number = 0.3,
    width: number = 1
): void {
    graphics.moveTo(x1, y1)
    graphics.lineTo(x2, y2)
    graphics.stroke({ width, color, alpha })
}

/**
 * Draw weekend highlight rectangle
 */
export function drawWeekendHighlight(
    graphics: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number = 0xf5f5f5,
    alpha: number = 0.5
): void {
    graphics.rect(x, y, width, height)
    graphics.fill({ color, alpha })
}

/**
 * Draw today marker line
 */
export function drawTodayMarker(
    graphics: Graphics,
    x: number,
    y: number,
    height: number,
    color: number = 0xff0000,
    alpha: number = 0.8
): void {
    graphics.moveTo(x, y)
    graphics.lineTo(x, y + height)
    graphics.stroke({ width: 2, color, alpha })
}

/**
 * Draw measure markers (musical time divisions)
 */
export function drawMeasureMarker(
    graphics: Graphics,
    x: number,
    y: number,
    height: number,
    isDownbeat: boolean = false,
    color: number = 0x888888
): void {
    const width = isDownbeat ? 2 : 1
    const alpha = isDownbeat ? 0.6 : 0.3

    graphics.moveTo(x, y)
    graphics.lineTo(x, y + height)
    graphics.stroke({ width, color, alpha })

    // Draw double bar for downbeat
    if (isDownbeat) {
        graphics.moveTo(x - 3, y)
        graphics.lineTo(x - 3, y + height)
        graphics.stroke({ width: 1, color, alpha: 0.3 })
    }
}
