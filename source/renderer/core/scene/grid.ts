import { Container, Graphics, Text } from 'pixi.js'
import { computeGraphicsResolution } from '../utils/resolution'
import { getMeasureMarkerXsAligned } from '../utils/layout'
import type { TimelineConfig } from '../types/renderer'
import type { Staff } from '@cadence/core'

export function drawGridAndStaff(
    container: Container,
    config: TimelineConfig,
    staffs: Staff[],
    _projectStartDate: Date,
    screenWidth: number,
    _screenHeight: number,
    _zoom: number = 1,
    alignment: { viewportXDaysQuantized: number; viewportPixelOffsetX: number },
): void {
    const graphics = new Graphics(); (graphics as any).resolution = computeGraphicsResolution()
    const capWidth = Math.min(Math.max(screenWidth * 4, config.DAY_WIDTH * 90), 50000)
    const extendedWidth = Math.max(screenWidth, capWidth)
    const pixelAlign = (v: number) => Math.round(v)
    // Time scale and date labels are handled by the React DateHeader; the grid only draws staff lines and measure markers.

    let currentY = config.TOP_MARGIN
    staffs.forEach((staff) => {
        for (let line = 0; line < staff.numberOfLines; line++) {
            const y = pixelAlign(currentY + line * config.STAFF_LINE_SPACING)
            graphics.moveTo(config.LEFT_MARGIN, y)
            graphics.lineTo(extendedWidth, y)
            graphics.stroke({ width: 1, color: config.STAFF_LINE_COLOR, alpha: 0.4 })
        }

        const xs = getMeasureMarkerXsAligned(config as any, extendedWidth, alignment)
        if (xs.length > 0) {
            const staffTop = pixelAlign(currentY)
            const staffBottom = pixelAlign(currentY + (staff.numberOfLines - 1) * config.STAFF_LINE_SPACING)
            const color = (config as any).MEASURE_COLOR ?? 0xffffff
            const thickW = Math.max(2, Math.round((config as any).MEASURE_LINE_WIDTH_PX || 2))
            const thinW = 1
            let pairSpacing = Math.max(2, Math.round((config as any).MEASURE_PAIR_SPACING_PX ?? 2))
            if (pairSpacing % 2 !== 0) pairSpacing += 1
            for (const cx of xs) {
                const xThick = Math.round(cx) + (thickW % 2 ? 0.5 : 0)
                const xThin = Math.round(cx - pairSpacing) + (thinW % 2 ? 0.5 : 0)
                graphics.moveTo(xThick, staffTop)
                graphics.lineTo(xThick, staffBottom)
                graphics.stroke({ width: thickW, color, alpha: 0.7 })
                graphics.moveTo(xThin, staffTop)
                graphics.lineTo(xThin, staffBottom)
                graphics.stroke({ width: thinW, color, alpha: 0.4 })
            }
        }

        if ((config as any).DRAW_STAFF_LABELS !== false) {
            const labelText = new Text({
                text: staff.name,
                style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 14, fontWeight: 'bold', fill: 0xffffff, align: 'right' }
            })
            const staffCenterY = currentY + ((staff.numberOfLines - 1) * config.STAFF_LINE_SPACING) / 2
            labelText.x = config.LEFT_MARGIN - 15 - labelText.width
            labelText.y = staffCenterY - labelText.height / 2
            container.addChild(labelText)

            const clefSymbol = staff.name.toLowerCase().includes('treble') ? '𝄞' : staff.name.toLowerCase().includes('bass') ? '𝄢' : '♪'
            const clefText = new Text({ text: clefSymbol, style: { fontFamily: 'serif', fontSize: 20, fontWeight: 'bold', fill: 0xffffff } })
            clefText.x = config.LEFT_MARGIN + 15 - clefText.width / 2
            clefText.y = staffCenterY - clefText.height / 2
            container.addChild(clefText)
        }

        currentY += config.STAFF_SPACING
    })

    // Date labels and ticks are rendered in React UI header. Avoid duplicating labels in canvas.

    container.addChildAt(graphics, Math.min(1, container.children.length))
}
