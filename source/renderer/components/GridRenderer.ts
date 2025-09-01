/**
 * GridRenderer Component
 * Handles rendering of the timeline grid
 */

import { Graphics, Container, Text, TextStyle } from 'pixi.js'
import type { TimelineConfig } from '../../infrastructure/persistence/redux/slices/timelineSlice'

export interface GridRendererOptions {
    container: Container
    config: TimelineConfig
    projectStartDate: Date
    viewportState: { x: number; y: number; zoom: number }
    screenWidth: number
    screenHeight: number
}

export class GridRenderer {
    private gridGraphics: Graphics
    private weekendGraphics: Graphics
    private todayLine: Graphics
    private dateLabels: Container
    private monthLabels: Container

    constructor(private options: GridRendererOptions) {
        this.gridGraphics = new Graphics()
        this.gridGraphics.name = 'grid'

        this.weekendGraphics = new Graphics()
        this.weekendGraphics.name = 'weekends'

        this.todayLine = new Graphics()
        this.todayLine.name = 'todayLine'

        this.dateLabels = new Container()
        this.dateLabels.name = 'dateLabels'

        this.monthLabels = new Container()
        this.monthLabels.name = 'monthLabels'

        // Add to container in correct order
        options.container.addChild(this.weekendGraphics)
        options.container.addChild(this.gridGraphics)
        options.container.addChild(this.todayLine)
        options.container.addChild(this.dateLabels)
        options.container.addChild(this.monthLabels)
    }

    render(): void {
        const { config, projectStartDate, viewportState, screenWidth, screenHeight } = this.options

        // Clear existing graphics
        this.gridGraphics.clear()
        this.weekendGraphics.clear()
        this.todayLine.clear()
        this.dateLabels.removeChildren()
        this.monthLabels.removeChildren()

        if (!config.SHOW_GRID) return

        const dayWidth = config.DAY_WIDTH * viewportState.zoom

        // Calculate visible date range
        const startDay = Math.floor(-viewportState.x / dayWidth) - 1
        const endDay = Math.ceil((screenWidth - viewportState.x) / dayWidth) + 1

        // Draw weekend backgrounds
        if (config.SHOW_WEEKENDS) {
            this.drawWeekends(startDay, endDay, dayWidth, screenHeight)
        }

        // Draw grid lines
        this.drawGridLines(startDay, endDay, dayWidth, screenHeight)

        // Draw date labels
        if (config.SHOW_LABELS && viewportState.zoom > 0.5) {
            this.drawDateLabels(startDay, endDay, dayWidth)
        }

        // Draw month labels
        if (config.SHOW_LABELS) {
            this.drawMonthLabels(startDay, endDay, dayWidth)
        }

        // Draw today line
        if (config.SHOW_TODAY_LINE) {
            this.drawTodayLine(dayWidth, screenHeight)
        }
    }

    private drawWeekends(startDay: number, endDay: number, dayWidth: number, screenHeight: number): void {
        const { config, projectStartDate } = this.options

        for (let day = startDay; day <= endDay; day++) {
            const date = new Date(projectStartDate)
            date.setDate(date.getDate() + day)

            const dayOfWeek = date.getDay()
            if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
                const x = config.LEFT_MARGIN + day * dayWidth

                this.weekendGraphics.rect(x, 0, dayWidth, screenHeight)
                this.weekendGraphics.fill({ color: config.WEEKEND_FILL_COLOR, alpha: 0.5 })
            }
        }
    }

    private drawGridLines(startDay: number, endDay: number, dayWidth: number, screenHeight: number): void {
        const { config, projectStartDate } = this.options

        for (let day = startDay; day <= endDay; day++) {
            const x = config.LEFT_MARGIN + day * dayWidth

            const date = new Date(projectStartDate)
            date.setDate(date.getDate() + day)

            // Determine line style based on date
            let isMajor = false
            let color = config.GRID_COLOR_MINOR
            let width = 0.5
            let alpha = 0.2

            if (date.getDate() === 1) {
                // First day of month
                isMajor = true
                color = config.GRID_COLOR_MAJOR
                width = 2
                alpha = 0.4
            } else if (date.getDay() === 1) {
                // Monday (start of week)
                color = config.GRID_COLOR_MAJOR
                width = 1
                alpha = 0.3
            }

            this.gridGraphics.moveTo(x, 0)
            this.gridGraphics.lineTo(x, screenHeight)
            this.gridGraphics.stroke({ width, color, alpha })
        }

        // Draw horizontal lines for staff divisions
        const numStaffLines = 5 // This should come from staff data
        for (let i = 0; i <= numStaffLines; i++) {
            const y = config.TOP_MARGIN + i * config.STAFF_SPACING

            this.gridGraphics.moveTo(0, y)
            this.gridGraphics.lineTo(screenWidth, y)
            this.gridGraphics.stroke({
                width: i === 0 ? 1 : 0.5,
                color: config.GRID_COLOR_MINOR,
                alpha: 0.2
            })
        }
    }

    private drawDateLabels(startDay: number, endDay: number, dayWidth: number): void {
        const { config, projectStartDate, viewportState } = this.options

        // Only show labels if zoomed in enough
        if (dayWidth < 20) return

        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 10,
            fill: 0x666666,
            align: 'center'
        })

        for (let day = startDay; day <= endDay; day++) {
            const date = new Date(projectStartDate)
            date.setDate(date.getDate() + day)

            const x = config.LEFT_MARGIN + day * dayWidth + dayWidth / 2
            const y = config.TOP_MARGIN - 20

            const text = new Text({
                text: date.getDate().toString(),
                style
            })
            text.x = x
            text.y = y
            text.anchor.set(0.5, 0.5)

            this.dateLabels.addChild(text)
        }
    }

    private drawMonthLabels(startDay: number, endDay: number, dayWidth: number): void {
        const { config, projectStartDate } = this.options

        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 12,
            fontWeight: 'bold',
            fill: 0x333333,
            align: 'left'
        })

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]

        let lastMonth = -1

        for (let day = startDay; day <= endDay; day++) {
            const date = new Date(projectStartDate)
            date.setDate(date.getDate() + day)

            const month = date.getMonth()
            const year = date.getFullYear()

            if (month !== lastMonth) {
                lastMonth = month

                const x = config.LEFT_MARGIN + day * dayWidth + 5
                const y = config.TOP_MARGIN - 40

                const text = new Text({
                    text: `${monthNames[month]} ${year}`,
                    style
                })
                text.x = x
                text.y = y

                this.monthLabels.addChild(text)
            }
        }
    }

    private drawTodayLine(dayWidth: number, screenHeight: number): void {
        const { config, projectStartDate } = this.options

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const daysSinceStart = Math.floor(
            (today.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        const x = config.LEFT_MARGIN + daysSinceStart * dayWidth

        // Draw line
        this.todayLine.moveTo(x, 0)
        this.todayLine.lineTo(x, screenHeight)
        this.todayLine.stroke({ width: 2, color: config.TODAY_LINE_COLOR, alpha: 0.8 })

        // Draw label
        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 10,
            fontWeight: 'bold',
            fill: config.TODAY_LINE_COLOR,
            align: 'center'
        })

        const text = new Text({
            text: 'TODAY',
            style
        })
        text.x = x
        text.y = 5
        text.anchor.set(0.5, 0)

        this.todayLine.addChild(text)
    }

    update(options: Partial<GridRendererOptions>): void {
        Object.assign(this.options, options)
        this.render()
    }

    destroy(): void {
        this.gridGraphics.destroy()
        this.weekendGraphics.destroy()
        this.todayLine.destroy({ children: true })
        this.dateLabels.destroy({ children: true })
        this.monthLabels.destroy({ children: true })
    }
}
