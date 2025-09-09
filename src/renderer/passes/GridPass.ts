import { Container, Graphics } from 'pixi.js'
import { getCssVarColor } from '@shared/colors'
import { drawGridBackgroundOn, drawStaffLinesOn } from '../primitives/grid'
import { drawMeasurePairOn, drawTodayMarkerOn } from '../primitives/markers'
import { dayIndexFromISO, EPS } from '@renderer/timeline'
import { PROJECT_START_DATE } from '@config'
import type { Staff } from '@types'

// Staff block interface for grid rendering
interface StaffBlock {
    id: string
    yTop: number
    yBottom: number
    lineSpacing: number
}

export class GridPass {
    private _bg?: Graphics
    private _grid?: Graphics
    private _staff?: Graphics
    private _measure?: Graphics
    private _hover?: Graphics
    private _today?: Graphics

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
        const widthLocal = Math.max(0, width - leftMargin)

        if (!this._bg) { this._bg = new Graphics(); container.addChild(this._bg) }
        if (!this._grid) { this._grid = new Graphics(); container.addChild(this._grid) }

        this._bg.clear()
        this._grid.clear()

        this._bg.rect(0, 0, widthLocal, Math.max(0, height))
        this._bg.fill({ color: bgColor, alpha: 1 })
        this._bg.rect(0, 0, widthLocal, Math.max(0, height))
        this._bg.fill({ color: 0x000000, alpha: 0.06 })

        drawGridBackgroundOn(this._grid, {
            widthLocal,
            height,
            pxPerDay,
            viewportXDays: viewport.x,
            bgColor,
        })
    }

    // Render staff lines and return staff block metrics
    renderStaffLines(
        container: Container,
        staffs: Staff[],
        scaledTimeline: { topMargin: number; staffSpacing: number; lineSpacing: number },
        viewport: { x: number; y: number; zoom: number },
        screenWidth: number,
        leftMargin: number,
        pxPerDay: number,
    ): StaffBlock[] {
        const staffBlocks: StaffBlock[] = []
        const widthLocal = Math.max(0, screenWidth - leftMargin)
        let yCursor = scaledTimeline.topMargin - viewport.y

        if (!this._staff) { this._staff = new Graphics(); container.addChild(this._staff) }
        this._staff.clear()

        let idx = 0
        for (const staff of staffs) {
            const spacing = scaledTimeline.lineSpacing
            try {
                const bandH = (staff.numberOfLines - 1) * spacing + 10
                const tint = getCssVarColor(idx % 2 === 0 ? '--ui-music-paper-tint' : '--ui-music-paper-tint-strong', 0x000000)
                this._staff.rect(0, Math.round(yCursor - 5), widthLocal, Math.max(0, bandH))
                this._staff.fill({ color: tint, alpha: idx % 2 === 0 ? 0.03 : 0.045 })
            } catch {}

            drawStaffLinesOn(this._staff, {
                widthLocal,
                yTop: yCursor,
                lineSpacing: spacing,
                lines: staff.numberOfLines,
            })

            staffBlocks.push({
                id: staff.id,
                yTop: yCursor,
                yBottom: yCursor + (staff.numberOfLines - 1) * spacing,
                lineSpacing: spacing,
            })
            yCursor += scaledTimeline.staffSpacing
            idx++
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

            if (!this._measure) { this._measure = new Graphics(); container.addChild(this._measure) }
            this._measure.clear()

            for (const sb of staffBlocks) {
                const staff = staffs.find(s => s.id === sb.id)
                const stepDays = this.measureLengthDaysFromTimeSignature(staff?.timeSignature)
                const firstK = Math.floor((leftWorldDays - offsetDays) / Math.max(stepDays, EPS)) - 1
                const lastK = Math.ceil((rightWorldDays - offsetDays) / Math.max(stepDays, EPS)) + 1

                for (let k = firstK; k <= lastK; k++) {
                    const dayIndex = k * stepDays + offsetDays
                    const xLocal = dayIndex * pxPerDay
                    const xThick = Math.round(xLocal) + (thickW % 2 ? 0.5 : 0)
                    const xThin = Math.round(xLocal - pairSpacingPx) + (thinW % 2 ? 0.5 : 0)

                    const yTopStaff = Math.round(sb.yTop)
                    const yBottomStaff = Math.round(sb.yBottom)
                    drawMeasurePairOn(this._measure, xThick, xThin, yTopStaff, yBottomStaff)
                }
            }
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[GridPass]measure markers', err)
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
            const xLocal = dayIndex * pxPerDay
            if (!this._today) { this._today = new Graphics(); container.addChild(this._today) }
            this._today.clear()
            drawTodayMarkerOn(this._today, xLocal, Math.max(0, screenHeight))
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[GridPass]today marker', err)
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
        if (!this._hover) { this._hover = new Graphics(); container.addChild(this._hover) }
        this._hover.clear()

        if (hoverX != null) {
            const xh = Math.round(hoverX) + 0.5
            for (let i = 0; i < screenHeight; i += 20) {
                const alpha = 0.2 * (1 - i / screenHeight)
                this._hover.moveTo(xh, i)
                this._hover.lineTo(xh, Math.min(i + 10, screenHeight))
                this._hover.stroke({ width: 1, color: 0xA855F7, alpha })
            }
            for (const sb of staffBlocks) {
                for (let i = 0; i < 5; i++) {
                    const y = sb.yTop + i * sb.lineSpacing
                    this._hover.circle(xh, y, 2)
                    this._hover.fill({ color: 0xFACC15, alpha: 0.5 })
                }
            }
        }

        if (hoverY != null && staffBlocks.length > 0) {
            const sb = staffBlocks.find(b => hoverY >= b.yTop && hoverY <= b.yBottom)
            if (sb) {
                const height = Math.max(1, Math.round(sb.yBottom - sb.yTop))
                for (let i = 0; i < 3; i++) {
                    this._hover.rect(-100000, Math.round(sb.yTop - i * 2), 200000, height + i * 4)
                    this._hover.fill({ color: 0xA855F7, alpha: 0.02 * (3 - i) })
                }
                this._hover.rect(-100000, Math.round(sb.yTop), 200000, height)
                this._hover.fill({ color: 0xffffff, alpha: 0.08 })
                this._hover.rect(-100000, Math.round(sb.yTop), 200000, 1)
                this._hover.fill({ color: 0xC084FC, alpha: 0.3 })
                this._hover.rect(-100000, Math.round(sb.yBottom), 200000, 1)
                this._hover.fill({ color: 0xC084FC, alpha: 0.3 })
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
            if (import.meta?.env?.DEV) console.debug('[GridPass]measureLengthDaysFromTimeSignature', err)
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
