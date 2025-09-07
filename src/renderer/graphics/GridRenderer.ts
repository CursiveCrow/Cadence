import { Container, Graphics } from 'pixi.js'
import { drawGridBackground, drawStaffLines } from '../draw/grid'
import { drawMeasurePair, drawTodayMarker } from '../draw/markers'
import { dayIndexFromISO, EPS } from '../utils'
import { PROJECT_START_DATE } from '../../config'
import type { Staff } from '../../types'

// Staff block interface for grid rendering
interface StaffBlock {
    id: string
    yTop: number
    yBottom: number
    lineSpacing: number
}

export class GridRenderer {
    // Render background grid and staff lines
    renderBackground(
        container: Container,
        screenDimensions: { width: number; height: number },
        viewport: { x: number; y: number; zoom: number },
        leftMargin: number,
        pxPerDay: number,
        bgColor: number
    ) {
        const { width, height } = screenDimensions

        // Content background (uses CSS variable --ui-color-bg)
        const bg = new Graphics()
        bg.rect(0, 0, width, Math.max(0, height))
        bg.fill({ color: bgColor, alpha: 1 })
        // subtle vignette edges to create depth and focus
        bg.rect(0, 0, width, Math.max(0, height))
        bg.fill({ color: 0x000000, alpha: 0.06 })
        container.addChild(bg)

        // Draw grid background patterns
        for (const g of drawGridBackground({
            width,
            height,
            LEFT_MARGIN: leftMargin,
            pxPerDay,
            viewportXDays: viewport.x,
            bgColor
        })) {
            container.addChild(g)
        }
    }

    // Render staff lines and return staff block metrics
    renderStaffLines(
        container: Container,
        staffs: Staff[],
        scaledTimeline: { topMargin: number; staffSpacing: number; lineSpacing: number },
        viewport: { x: number; y: number; zoom: number },
        screenWidth: number,
        leftMargin: number
    ): StaffBlock[] {
        const staffBlocks: StaffBlock[] = []
        let yCursor = scaledTimeline.topMargin - viewport.y

        for (const staff of staffs) {
            const spacing = scaledTimeline.lineSpacing
            container.addChild(drawStaffLines({
                width: screenWidth,
                LEFT_MARGIN: leftMargin,
                yTop: yCursor,
                lineSpacing: spacing,
                lines: staff.numberOfLines
            }))

            // yBottom aligns with the last staff line (not one line beyond)
            staffBlocks.push({
                id: staff.id,
                yTop: yCursor,
                yBottom: yCursor + (staff.numberOfLines - 1) * spacing,
                lineSpacing: spacing
            })
            yCursor += scaledTimeline.staffSpacing
        }

        return staffBlocks
    }

    // Render measure markers for each staff
    renderMeasureMarkers(
        container: Container,
        staffBlocks: StaffBlock[],
        staffs: Staff[],
        viewport: { x: number; y: number; zoom: number },
        screenWidth: number,
        leftMargin: number,
        pxPerDay: number
    ) {
        try {
            const offsetDays = 0
            const pairSpacingPx = 4
            const thickW = 3
            const thinW = 1
            const vx = viewport.x
            const leftWorldDays = vx + (0 - leftMargin) / Math.max(pxPerDay, EPS)
            const rightWorldDays = vx + (screenWidth - leftMargin) / Math.max(pxPerDay, EPS)

            for (const sb of staffBlocks) {
                const staff = staffs.find(s => s.id === sb.id)
                const stepDays = this.measureLengthDaysFromTimeSignature(staff?.timeSignature)
                const firstK = Math.floor((leftWorldDays - offsetDays) / Math.max(stepDays, EPS)) - 1
                const lastK = Math.ceil((rightWorldDays - offsetDays) / Math.max(stepDays, EPS)) + 1

                for (let k = firstK; k <= lastK; k++) {
                    const dayIndex = k * stepDays + offsetDays
                    const xScreen = leftMargin + (dayIndex - vx) * pxPerDay
                    const xThick = Math.round(xScreen) + (thickW % 2 ? 0.5 : 0)
                    const xThin = Math.round(xScreen - pairSpacingPx) + (thinW % 2 ? 0.5 : 0)

                    if (xThin > screenWidth + 2) break
                    if (xThick < leftMargin + 2) continue
                    if (xThin < leftMargin + 2) continue

                    const yTopStaff = Math.round(sb.yTop)
                    const yBottomStaff = Math.round(sb.yBottom)
                    container.addChild(drawMeasurePair(xThick, xThin, yTopStaff, yBottomStaff))
                }
            }
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[GridRenderer]measure markers', err)
        }
    }

    // Render today marker
    renderTodayMarker(
        container: Container,
        viewport: { x: number; y: number; zoom: number },
        leftMargin: number,
        pxPerDay: number,
        screenHeight: number
    ) {
        try {
            const now = new Date()
            const yyyy = now.getUTCFullYear()
            const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
            const dd = String(now.getUTCDate()).padStart(2, '0')
            const isoToday = `${yyyy}-${mm}-${dd}`
            const dayIndex = dayIndexFromISO(isoToday, PROJECT_START_DATE)
            const xToday = leftMargin + (dayIndex - viewport.x) * pxPerDay
            container.addChild(drawTodayMarker(xToday, Math.max(0, screenHeight)))
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[GridRenderer]today marker', err)
        }
    }

    // Render hover effects (vertical guideline and row highlight)
    renderHoverEffects(
        container: Container,
        hoverX: number | null,
        hoverY: number | null,
        staffBlocks: StaffBlock[],
        screenHeight: number
    ) {
        // Hover vertical guideline with musical accent
        if (hoverX != null) {
            const gHover = new Graphics()
            const xh = Math.round(hoverX) + 0.5

            // Gradient line
            for (let i = 0; i < screenHeight; i += 20) {
                const alpha = 0.2 * (1 - i / screenHeight)
                gHover.moveTo(xh, i)
                gHover.lineTo(xh, Math.min(i + 10, screenHeight))
                gHover.stroke({ width: 1, color: 0xA855F7, alpha })
            }

            // Accent dots at intersections
            for (const sb of staffBlocks) {
                for (let i = 0; i < 5; i++) {
                    const y = sb.yTop + i * sb.lineSpacing
                    gHover.circle(xh, y, 2)
                    gHover.fill({ color: 0xFACC15, alpha: 0.5 })
                }
            }

            container.addChild(gHover)
        }

        // Hover row highlight with glow
        if (hoverY != null && staffBlocks.length > 0) {
            const yHover = hoverY
            const sb = staffBlocks.find(b => yHover >= b.yTop && yHover <= b.yBottom)
            if (sb) {
                const r = new Graphics()
                const height = Math.max(1, Math.round(sb.yBottom - sb.yTop))

                // Gradient glow effect
                for (let i = 0; i < 3; i++) {
                    r.rect(-100000, Math.round(sb.yTop - i * 2), 200000, height + i * 4)
                    r.fill({ color: 0xA855F7, alpha: 0.02 * (3 - i) })
                }

                // Main highlight
                r.rect(-100000, Math.round(sb.yTop), 200000, height)
                r.fill({ color: 0xffffff, alpha: 0.08 })

                // Top and bottom accent lines
                r.rect(-100000, Math.round(sb.yTop), 200000, 1)
                r.fill({ color: 0xC084FC, alpha: 0.3 })
                r.rect(-100000, Math.round(sb.yBottom), 200000, 1)
                r.fill({ color: 0xC084FC, alpha: 0.3 })

                container.addChild(r)
            }
        }
    }

    // Map time signature "N/D" to days-per-measure where the denominator D directly
    // defines the number of days per measure. If invalid, default to 4.
    private measureLengthDaysFromTimeSignature(sig?: string): number {
        try {
            const parts = (sig || '4/4').split('/')
            const d = Math.max(1, Math.round(parseInt(parts[1] || '4', 10)))
            return Math.max(1, d)
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[GridRenderer]measureLengthDaysFromTimeSignature', err)
            return 4
        }
    }

    // Render dependency connections between tasks
    renderDependencies(
        container: Container,
        dependencies: { srcTaskId: string; dstTaskId: string }[],
        layout: { id: string; x: number; y: number; w: number; h: number }[]
    ) {
        for (const dep of dependencies) {
            const src = layout.find(r => r.id === dep.srcTaskId)
            const dst = layout.find(r => r.id === dep.dstTaskId)
            if (!src || !dst) continue

            const x0 = src.x + src.w
            const y0 = src.y + src.h / 2
            const x1 = dst.x
            const y1 = dst.y + dst.h / 2
            const cx1 = x0 + Math.max(30, Math.abs(x1 - x0) * 0.4)
            const cx2 = x1 - Math.max(30, Math.abs(x1 - x0) * 0.4)
            const line = new Graphics()

            // Shadow curve
            line.moveTo(Math.round(x0), Math.round(y0 + 1))
            line.bezierCurveTo(Math.round(cx1), Math.round(y0 + 1), Math.round(cx2), Math.round(y1 + 1), Math.round(x1), Math.round(y1 + 1))
            line.stroke({ width: 3, color: 0x000000, alpha: 0.2 })

            // Main curve with gradient effect
            line.moveTo(Math.round(x0), Math.round(y0))
            line.bezierCurveTo(Math.round(cx1), Math.round(y0), Math.round(cx2), Math.round(y1), Math.round(x1), Math.round(y1))
            line.stroke({ width: 2, color: 0x8B5CF6, alpha: 0.7 })

            // Highlight curve
            line.moveTo(Math.round(x0), Math.round(y0 - 1))
            line.bezierCurveTo(Math.round(cx1), Math.round(y0 - 1), Math.round(cx2), Math.round(y1 - 1), Math.round(x1), Math.round(y1 - 1))
            line.stroke({ width: 1, color: 0xC084FC, alpha: 0.4 })

            // Musical tie endpoints (like slur notation)
            line.circle(x0, y0, 3)
            line.fill({ color: 0x8B5CF6, alpha: 0.9 })
            line.circle(x0, y0, 1.5)
            line.fill({ color: 0xffffff, alpha: 0.5 })

            // Arrowhead with style
            const angle = Math.atan2(y1 - y0, x1 - x0)
            const arrow = 8
            line.beginPath()
            line.moveTo(Math.round(x1), Math.round(y1))
            line.lineTo(Math.round(x1 - arrow * Math.cos(angle - Math.PI / 5)), Math.round(y1 - arrow * Math.sin(angle - Math.PI / 5)))
            line.lineTo(Math.round(x1 - arrow * 0.6 * Math.cos(angle)), Math.round(y1 - arrow * 0.6 * Math.sin(angle)))
            line.lineTo(Math.round(x1 - arrow * Math.cos(angle + Math.PI / 5)), Math.round(y1 - arrow * Math.sin(angle + Math.PI / 5)))
            line.closePath()
            line.fill({ color: 0x8B5CF6, alpha: 0.9 })

            container.addChild(line)
        }
    }

    // Get grid information for external use
    getGridMetrics(
        staffs: Staff[],
        scaledTimeline: { topMargin: number; staffSpacing: number; lineSpacing: number },
        viewport: { x: number; y: number; zoom: number },
        pxPerDay: number
    ): { pxPerDay: number; staffBlocks: StaffBlock[] } {
        const staffBlocks: StaffBlock[] = []
        let yCursor = scaledTimeline.topMargin - viewport.y

        for (const staff of staffs) {
            const spacing = scaledTimeline.lineSpacing
            staffBlocks.push({
                id: staff.id,
                yTop: yCursor,
                yBottom: yCursor + (staff.numberOfLines - 1) * spacing,
                lineSpacing: spacing
            })
            yCursor += scaledTimeline.staffSpacing
        }

        return { pxPerDay, staffBlocks }
    }

    // Check if a point is within staff bounds (for hit testing)
    findStaffAtY(staffBlocks: StaffBlock[], y: number): StaffBlock | null {
        return staffBlocks.find(b => y >= b.yTop && y <= b.yBottom) || null
    }

    // Calculate staff center Y position
    calculateStaffCenterY(staffBlock: StaffBlock, lineIndex: number): number {
        const lineStep = staffBlock.lineSpacing / 2
        return staffBlock.yTop + lineIndex * lineStep
    }

    // Get visible day range for the current viewport
    getVisibleDayRange(
        viewport: { x: number; y: number; zoom: number },
        screenWidth: number,
        leftMargin: number,
        pxPerDay: number
    ): { startDay: number; endDay: number } {
        const leftWorldDays = viewport.x + (0 - leftMargin) / Math.max(pxPerDay, EPS)
        const rightWorldDays = viewport.x + (screenWidth - leftMargin) / Math.max(pxPerDay, EPS)

        return {
            startDay: Math.floor(leftWorldDays),
            endDay: Math.ceil(rightWorldDays)
        }
    }

    // Calculate grid snap positions
    snapToGrid(
        x: number,
        y: number,
        pxPerDay: number,
        staffBlocks: StaffBlock[],
        leftMargin: number,
        viewport: { x: number; y: number; zoom: number }
    ): { dayIndex: number; staffId: string | null; staffLine: number } {
        // Snap to day boundary
        const worldX = viewport.x + (x - leftMargin) / pxPerDay
        const dayIndex = Math.round(worldX)

        // Find closest staff block and line
        const staffBlock = this.findStaffAtY(staffBlocks, y)
        const staffLine = staffBlock ?
            Math.round((y - staffBlock.yTop) / (staffBlock.lineSpacing / 2)) : 0

        return {
            dayIndex: Math.max(0, dayIndex),
            staffId: staffBlock?.id || null,
            staffLine: Math.max(0, staffLine)
        }
    }


    // Clear all grid graphics (for cleanup)
    clear(container: Container) {
        try {
            const children = container.removeChildren()
            for (const child of children) {
                try {
                    (child as any).destroy?.({ children: true })
                } catch (err) {
                    if (import.meta?.env?.DEV) console.debug('[GridRenderer]destroy child', err)
                }
            }
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[GridRenderer]clear', err)
        }
    }
}
