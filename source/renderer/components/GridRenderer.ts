/**
 * GridRenderer Component
 * Renders timeline grid, staff lines, and background elements
 */

import { Container, Graphics, Text } from 'pixi.js'
import { Staff } from '../../core/domain/entities/Staff'
import { CONSTANTS } from '../../config/constants'
import type { TimelineConfig } from '../../infrastructure/persistence/redux/slices/timelineSlice'
import { computeViewportAlignment, worldDayToScreenX } from '../utils/alignment'
import type { ViewportAlignment } from '../utils/alignment'
import { drawGridLine, drawWeekendHighlight, drawTodayMarker } from '../utils/shapes'

export interface GridRendererOptions {
    container: Container
    projectStartDate: Date
    staffs: Staff[]
    viewportState: { x: number; y: number; zoom: number; verticalScale?: number }
    screenWidth: number
    screenHeight: number
    config?: Partial<typeof CONSTANTS>
}

export class GridRenderer {
    private container: Container
    private gridGraphics: Graphics
    private staffGraphics: Graphics
    private weekendGraphics: Graphics
    private todayGraphics: Graphics
    private measureGraphics: Graphics

    private options: GridRendererOptions
    // Accept either legacy CONSTANTS keys (DEFAULT_*) or TimelineConfig keys
    private config: (typeof CONSTANTS) & Partial<TimelineConfig>

    constructor(options: GridRendererOptions) {
        this.options = options
        // Merge runtime config on top of legacy constants; supports both key shapes
        this.config = { ...CONSTANTS, ...(options.config as any) }
        this.container = options.container

        // Create graphics layers
        this.weekendGraphics = new Graphics()
        this.gridGraphics = new Graphics()
        this.staffGraphics = new Graphics()
        this.measureGraphics = new Graphics()
        this.todayGraphics = new Graphics()

        // Add to container in rendering order
        this.container.addChild(this.weekendGraphics)
        this.container.addChild(this.gridGraphics)
        this.container.addChild(this.staffGraphics)
        this.container.addChild(this.measureGraphics)
        this.container.addChild(this.todayGraphics)
    }

    /**
     * Render the grid
     */
    render(): void {
        this.clear()

        const { viewportState, screenWidth, screenHeight, projectStartDate, staffs } = this.options
        const zoom = viewportState.zoom
        const verticalScale = viewportState.verticalScale || 1

        // Calculate visible day range
        const dayWidthBase = (this.config.DAY_WIDTH ?? this.config.DEFAULT_DAY_WIDTH)
        const leftMargin = (this.config.LEFT_MARGIN ?? this.config.DEFAULT_LEFT_MARGIN)
        const topMargin = (this.config.TOP_MARGIN ?? this.config.DEFAULT_TOP_MARGIN) * verticalScale
        const dayWidth = dayWidthBase * zoom

        const align = computeViewportAlignment({ LEFT_MARGIN: leftMargin, DAY_WIDTH: dayWidth }, this.options.viewportState.x / Math.max(1, dayWidth))

        const leftMostDays = Math.floor(align.viewportXDaysQuantized - leftMargin / Math.max(dayWidth, 0.0001))
        const visibleDays = Math.ceil(screenWidth / Math.max(dayWidth, 0.0001))
        const startDay = leftMostDays - 5
        const endDay = leftMostDays + visibleDays + 5

        // Draw weekends (low alpha on dark)
        this.drawWeekends(startDay, endDay, dayWidth, screenHeight, projectStartDate, align)

        // Draw vertical grid lines (days)
        this.drawVerticalGrid(startDay, endDay, dayWidth, screenHeight, projectStartDate, align)

        // Draw horizontal grid lines (staff lines)
        this.drawStaffLines(staffs, verticalScale, screenWidth)

        // Draw measure markers
        this.drawMeasureMarkers(startDay, endDay, dayWidth, screenHeight, staffs, verticalScale, align)

        // Draw today marker
        this.drawTodayMarker(dayWidth, screenHeight, projectStartDate, align)
    }

    /**
     * Draw weekend highlights
     */
    private drawWeekends(
        startDay: number,
        endDay: number,
        dayWidth: number,
        screenHeight: number,
        projectStartDate: Date,
        align: ViewportAlignment
    ): void {
        const leftMargin = (this.config.LEFT_MARGIN ?? this.config.DEFAULT_LEFT_MARGIN)

        for (let day = startDay; day <= endDay; day++) {
            const date = new Date(projectStartDate)
            date.setDate(date.getDate() + day)
            const dayOfWeek = date.getDay()

            // Saturday = 6, Sunday = 0
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                const x = Math.round(worldDayToScreenX({ LEFT_MARGIN: leftMargin, DAY_WIDTH: dayWidth }, day, align))
                drawWeekendHighlight(
                    this.weekendGraphics,
                    x,
                    this.options.viewportState.y,
                    dayWidth,
                    screenHeight,
                    this.config.WEEKEND_FILL_COLOR,
                    0.3
                )
            }
        }
    }

    /**
     * Draw vertical grid lines
     */
    private drawVerticalGrid(
        startDay: number,
        endDay: number,
        dayWidth: number,
        screenHeight: number,
        projectStartDate: Date,
        align: ViewportAlignment
    ): void {
        const leftMargin = (this.config.LEFT_MARGIN ?? this.config.DEFAULT_LEFT_MARGIN)

        for (let day = startDay; day <= endDay; day++) {
            const x = Math.round(worldDayToScreenX({ LEFT_MARGIN: leftMargin, DAY_WIDTH: dayWidth }, day, align))
            const date = new Date(projectStartDate)
            date.setDate(date.getDate() + day)

            // Major grid lines on week boundaries (Sunday) to match DateHeader
            const isMajor = date.getDay() === 0

            drawGridLine(
                this.gridGraphics,
                Math.round(x) + 0.5,
                this.options.viewportState.y,
                Math.round(x) + 0.5,
                this.options.viewportState.y + screenHeight,
                isMajor ? this.config.GRID_COLOR_MAJOR : this.config.GRID_COLOR_MINOR,
                isMajor ? 0.35 : 0.18,
                isMajor ? 1 : 1
            )
        }
    }

    /**
     * Draw staff lines
     */
    private drawStaffLines(
        staffs: Staff[],
        verticalScale: number,
        screenWidth: number
    ): void {
        const topMargin = (this.config.TOP_MARGIN ?? this.config.DEFAULT_TOP_MARGIN) * verticalScale + this.options.viewportState.y
        const staffSpacing = (this.config.STAFF_SPACING ?? this.config.DEFAULT_STAFF_SPACING) * verticalScale
        const lineSpacing = (this.config.STAFF_LINE_SPACING ?? this.config.DEFAULT_STAFF_LINE_SPACING) * verticalScale

        staffs.forEach((staff, staffIndex) => {
            const staffY = topMargin + staffIndex * staffSpacing

            // Draw each staff line
            for (let lineIndex = 0; lineIndex < staff.numberOfLines; lineIndex++) {
                const y = staffY + lineIndex * lineSpacing

                drawGridLine(
                    this.staffGraphics,
                    0,
                    Math.round(y) + 0.5,
                    screenWidth,
                    Math.round(y) + 0.5,
                    0x9aa0a6,
                    0.22,
                    1
                )
            }
        })
    }

    /**
     * Draw measure markers
     */
    private drawMeasureMarkers(
        startDay: number,
        endDay: number,
        dayWidth: number,
        screenHeight: number,
        staffs: Staff[],
        verticalScale: number,
        align: ViewportAlignment
    ): void {
        const leftMargin = (this.config.LEFT_MARGIN ?? this.config.DEFAULT_LEFT_MARGIN)
        const topMargin = (this.config.TOP_MARGIN ?? this.config.DEFAULT_TOP_MARGIN) * verticalScale + this.options.viewportState.y
        const staffSpacing = (this.config.STAFF_SPACING ?? this.config.DEFAULT_STAFF_SPACING) * verticalScale
        const lineSpacing = (this.config.STAFF_LINE_SPACING ?? this.config.DEFAULT_STAFF_LINE_SPACING) * verticalScale

        staffs.forEach((staff, staffIndex) => {
            if (!staff.timeSignature) return

            const staffY = topMargin + staffIndex * staffSpacing
            const staffHeight = (staff.numberOfLines - 1) * lineSpacing

            // Get time signature values (support domain TimeSignature or plain string)
            let beatsPerMeasure = 4
            let beatValue = 1

            const ts: any = staff.timeSignature as any
            if (typeof ts?.getBeatsPerMeasure === 'function' && typeof ts?.getBeatValue === 'function') {
                beatsPerMeasure = ts.getBeatsPerMeasure()
                beatValue = ts.getBeatValue()
            } else if (typeof ts === 'string') {
                const parts = ts.split('/')
                const num = parseInt(parts[0] || '4', 10)
                const den = parseInt(parts[1] || '4', 10)
                if (!isNaN(num) && num > 0) beatsPerMeasure = num
                if (!isNaN(den) && den > 0) beatValue = 4 / den
            }
            const measureLength = beatsPerMeasure * beatValue // Days per measure

            // Draw measure lines
            for (let day = startDay; day <= endDay; day += measureLength) {
                if (day < 0) continue

                const x = Math.round(worldDayToScreenX({ LEFT_MARGIN: leftMargin, DAY_WIDTH: dayWidth }, day, align))
                const measureNumber = Math.floor(day / measureLength)
                const isDownbeat = measureNumber % 4 === 0 // Every 4th measure

                // Draw measure line
                this.measureGraphics.moveTo(x, staffY)
                this.measureGraphics.lineTo(x, staffY + staffHeight)
                this.measureGraphics.stroke({
                    width: isDownbeat ? 1 : 1,
                    color: 0xb0b6ba,
                    alpha: isDownbeat ? 0.28 : 0.14
                })

                // Draw double bar for downbeats
                if (isDownbeat && x > 3) {
                    this.measureGraphics.moveTo(x - 3, staffY)
                    this.measureGraphics.lineTo(x - 3, staffY + staffHeight)
                    this.measureGraphics.stroke({
                        width: 1,
                        color: 0xb0b6ba,
                        alpha: 0.12
                    })
                }
            }
        })
    }

    /**
     * Draw today marker
     */
    private drawTodayMarker(
        dayWidth: number,
        screenHeight: number,
        projectStartDate: Date,
        align: ViewportAlignment
    ): void {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        projectStartDate.setHours(0, 0, 0, 0)

        const daysSinceStart = Math.floor(
            (today.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        const leftMargin = (this.config.LEFT_MARGIN ?? this.config.DEFAULT_LEFT_MARGIN)
        const x = Math.round(worldDayToScreenX({ LEFT_MARGIN: leftMargin, DAY_WIDTH: dayWidth }, daysSinceStart, align))

        drawTodayMarker(
            this.todayGraphics,
            x,
            this.options.viewportState.y,
            screenHeight,
            this.config.TODAY_LINE_COLOR,
            0.8
        )
    }

    /**
     * Clear all graphics
     */
    clear(): void {
        this.gridGraphics.clear()
        this.staffGraphics.clear()
        this.weekendGraphics.clear()
        this.todayGraphics.clear()
        this.measureGraphics.clear()
    }

    /**
     * Update options
     */
    updateOptions(options: Partial<GridRendererOptions>): void {
        this.options = { ...this.options, ...options }
        if (options.config) {
            this.config = { ...CONSTANTS, ...options.config }
        }
    }

    /**
     * Destroy the renderer
     */
    destroy(): void {
        this.clear()
        this.gridGraphics.destroy()
        this.staffGraphics.destroy()
        this.weekendGraphics.destroy()
        this.todayGraphics.destroy()
        this.measureGraphics.destroy()
    }
}