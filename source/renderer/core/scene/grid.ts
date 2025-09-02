import { Container, Graphics, Text } from 'pixi.js'
import { computeGraphicsResolution, computeTextResolution } from '../utils/resolution'
import { getTimeScaleForZoom, getMeasureMarkerXsAligned } from '../utils/layout'
import type { TimelineConfig } from '../types/renderer'

export function drawGridAndStaff(
    container: Container,
    config: TimelineConfig,
    staffs: any[],
    projectStartDate: Date,
    screenWidth: number,
    _screenHeight: number,
    zoom: number = 1,
    alignment: { viewportXDaysQuantized: number; viewportPixelOffsetX: number },
): void {
    container.removeChildren()
    const graphics = new Graphics(); (graphics as any).resolution = computeGraphicsResolution()
    const capWidth = Math.min(Math.max(screenWidth * 4, config.DAY_WIDTH * 90), 50000)
    const extendedWidth = Math.max(screenWidth, capWidth)
    const pixelAlign = (v: number) => Math.round(v)
    const scale = getTimeScaleForZoom(zoom)
    const dayWidth = config.DAY_WIDTH
    const hourWidth = config.HOUR_WIDTH ?? (dayWidth / 24)
    const weekWidth = config.WEEK_WIDTH ?? (dayWidth * 7)
    const monthWidth = config.MONTH_WIDTH ?? (dayWidth * 30)
    const minorStep = scale === 'hour' ? hourWidth : scale === 'day' ? dayWidth : scale === 'week' ? weekWidth : monthWidth

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

    if ((config as any).DRAW_STAFF_LABELS !== false) {
        const alignPx = (v: number) => Math.round(v)
        if (scale === 'month') {
            const base = new Date(Date.UTC(projectStartDate.getUTCFullYear(), projectStartDate.getUTCMonth(), projectStartDate.getUTCDate()))
            const msPerDay = 24 * 60 * 60 * 1000
            const lastVisibleDayIndex = Math.ceil((extendedWidth - config.LEFT_MARGIN) / Math.max(dayWidth, 0.0001))
            const lastVisibleMs = base.getTime() + lastVisibleDayIndex * msPerDay
            let cursor = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1))
            while (cursor.getTime() <= lastVisibleMs) {
                const diffMs = cursor.getTime() - base.getTime()
                const dayIndex = Math.round(diffMs / msPerDay)
                const x = config.LEFT_MARGIN + dayIndex * dayWidth
                if (x > extendedWidth) break
                const label = cursor.toLocaleDateString('en-US', { month: 'short' })
                const dateText = new Text({ text: label, style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 11, fill: 0xffffff } })
                dateText.x = alignPx(x + 5)
                dateText.y = alignPx(25 - dateText.height / 2)
                container.addChild(dateText)
                cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
            }
        } else {
            const max = Math.floor((extendedWidth - config.LEFT_MARGIN) / minorStep)
            let labelStep = 1
            if (scale === 'hour') {
                const hourWidth = Math.max(1, dayWidth / 24)
                if (hourWidth >= 40) labelStep = 1
                else if (hourWidth >= 24) labelStep = 2
                else labelStep = 4
            } else if (scale === 'day') {
                labelStep = dayWidth >= 56 ? 1 : dayWidth >= 40 ? 2 : dayWidth >= 28 ? 3 : 7
            } else if (scale === 'week') {
                labelStep = 1
            }
            for (let i = 0; i < max; i++) {
                if (labelStep > 1 && (i % labelStep) !== 0) continue
                const x = config.LEFT_MARGIN + i * minorStep
                const date = new Date(projectStartDate)
                const days = Math.round((x - config.LEFT_MARGIN) / dayWidth)
                date.setDate(date.getDate() + days)
                const label = scale === 'hour'
                    ? (() => {
                        const hoursSinceStart = Math.round((x - config.LEFT_MARGIN) / Math.max(1, hourWidth))
                        const hourOfDay = ((hoursSinceStart % 24) + 24) % 24
                        let hour12 = hourOfDay % 12
                        if (hour12 === 0) hour12 = 12
                        const ap = hourOfDay < 12 ? 'a' : 'p'
                        return `${hour12}${ap}`
                    })()
                    : scale === 'day'
                        ? (date.getDate() === 1 ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : String(date.getDate()))
                        : scale === 'week'
                            ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                const dateText = new Text({ text: label, style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: scale === 'day' ? 12 : (scale === 'hour' ? 9 : 11), fill: 0xffffff } })
                    ; (dateText as any).resolution = computeTextResolution(1, 1)
                if (scale === 'day') {
                    if (date.getDate() === 1) { try { (dateText as any).style.fontWeight = 'bold' } catch { } }
                }
                if (scale === 'hour') dateText.x = alignPx(x - dateText.width / 2)
                else dateText.x = alignPx(x + 5)
                dateText.y = alignPx(25 - dateText.height / 2)
                container.addChild(dateText)
            }
        }
    }

    container.addChildAt(graphics, Math.min(1, container.children.length))
}


