/**
 * SceneGraph
 * Manages the scene graph for rendering tasks, dependencies, and other elements
 */

import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { TimelineConfig } from '../../infrastructure/persistence/redux/slices/timelineSlice'

export interface SceneGraphOptions {
    app: Application
    layers: {
        viewport: Container
        background: Container
        dependencies: Container
        tasks: Container
        selection: Container
        dragLayer: Container
    }
    config: TimelineConfig
}

export interface TaskLayout {
    startX: number
    topY: number
    width: number
    height: number
    centerX: number
    centerY: number
}

export interface TaskAnchors {
    leftCenterX: number
    leftCenterY: number
    rightCenterX: number
    rightCenterY: number
    topCenterX: number
    topCenterY: number
    bottomCenterX: number
    bottomCenterY: number
}

export class SceneGraph {
    private taskContainers = new Map<string, Container>()
    private taskLayouts = new Map<string, TaskLayout>()
    private dependencyGraphics = new Map<string, Graphics>()
    private selectionGraphics = new Map<string, Graphics>()
    private staffLabels = new Map<string, Text>()
    private gridGraphics: Graphics | null = null
    private todayLine: Graphics | null = null

    constructor(private options: SceneGraphOptions) {
        this.initializeGrid()
    }

    private initializeGrid(): void {
        this.gridGraphics = new Graphics()
        this.gridGraphics.name = 'grid'
        this.options.layers.background.addChild(this.gridGraphics)

        if (this.options.config.SHOW_TODAY_LINE) {
            this.todayLine = new Graphics()
            this.todayLine.name = 'todayLine'
            this.options.layers.background.addChild(this.todayLine)
        }
    }

    update(data: any, viewportState: { x: number; y: number; zoom: number }): void {
        // Update tasks
        this.updateTasks(data.tasks, data.staffs, data.selection, viewportState)

        // Update dependencies
        this.updateDependencies(data.dependencies)

        // Update selection
        this.updateSelection(data.selection)

        // Update grid
        this.updateGrid(viewportState)
    }

    private updateTasks(
        tasks: Record<string, any>,
        staffs: any[],
        selection: string[],
        viewportState: { x: number; y: number; zoom: number }
    ): void {
        const currentTaskIds = new Set(Object.keys(tasks))

        // Remove tasks that no longer exist
        for (const [taskId, container] of this.taskContainers) {
            if (!currentTaskIds.has(taskId)) {
                container.destroy({ children: true })
                this.taskContainers.delete(taskId)
                this.taskLayouts.delete(taskId)
            }
        }

        // Update or create task containers
        for (const task of Object.values(tasks)) {
            const isSelected = selection.includes(task.id)
            const layout = this.calculateTaskLayout(task, staffs, viewportState)

            let container = this.taskContainers.get(task.id)
            if (!container) {
                container = this.createTaskContainer(task, layout, isSelected)
                this.taskContainers.set(task.id, container)
            } else {
                this.updateTaskContainer(container, task, layout, isSelected)
            }

            this.taskLayouts.set(task.id, layout)
        }
    }

    private calculateTaskLayout(
        task: any,
        staffs: any[],
        viewportState: { x: number; y: number; zoom: number }
    ): TaskLayout {
        const config = this.options.config
        const dayWidth = config.DAY_WIDTH * viewportState.zoom
        const taskHeight = config.TASK_HEIGHT

        // Calculate task position based on dates
        const projectStart = new Date('2024-01-01') // This should come from project data
        const taskStart = new Date(task.startDate)
        const daysSinceStart = Math.floor(
            (taskStart.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
        )

        const startX = config.LEFT_MARGIN + daysSinceStart * dayWidth
        const width = task.durationDays * dayWidth

        // Calculate Y position based on staff and line
        const staff = staffs.find(s => s.id === task.staffId)
        const staffIndex = staffs.indexOf(staff)
        const topY = config.TOP_MARGIN +
            staffIndex * config.STAFF_SPACING +
            task.staffLine * config.STAFF_LINE_SPACING

        return {
            startX,
            topY,
            width,
            height: taskHeight,
            centerX: startX + width / 2,
            centerY: topY + taskHeight / 2
        }
    }

    private createTaskContainer(task: any, layout: TaskLayout, isSelected: boolean): Container {
        const container = new Container()
        container.name = `task-${task.id}`

        // Create task rectangle
        const graphics = new Graphics()
        const color = this.getTaskColor(task.status, isSelected)

        graphics.rect(0, 0, layout.width, layout.height)
        graphics.fill({ color, alpha: 0.9 })
        graphics.stroke({ width: 1, color: 0x000000, alpha: 0.3 })

        container.addChild(graphics)

        // Add task label
        const style = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 11,
            fill: 0xffffff,
            align: 'center'
        })

        const text = new Text({ text: task.title, style })
        text.x = layout.width / 2
        text.y = layout.height / 2
        text.anchor.set(0.5)

        container.addChild(text)

        // Position container
        container.position.set(Math.round(layout.startX), Math.round(layout.topY))

        // Make interactive
        container.eventMode = 'static'
        container.cursor = 'pointer'

        this.options.layers.tasks.addChild(container)

        return container
    }

    private updateTaskContainer(
        container: Container,
        task: any,
        layout: TaskLayout,
        isSelected: boolean
    ): void {
        // Update position
        container.position.set(Math.round(layout.startX), Math.round(layout.topY))

        // Update graphics
        const graphics = container.children[0] as Graphics
        if (graphics) {
            graphics.clear()
            const color = this.getTaskColor(task.status, isSelected)
            graphics.rect(0, 0, layout.width, layout.height)
            graphics.fill({ color, alpha: 0.9 })
            graphics.stroke({ width: 1, color: 0x000000, alpha: 0.3 })
        }

        // Update text
        const text = container.children[1] as Text
        if (text) {
            text.text = task.title
            text.x = layout.width / 2
        }
    }

    private getTaskColor(status: string, isSelected: boolean): number {
        if (isSelected) {
            return this.options.config.TASK_COLOR_SELECTED
        }

        switch (status) {
            case 'completed':
                return 0x4caf50 // Green
            case 'in_progress':
                return 0x2196f3 // Blue
            case 'blocked':
                return 0xf44336 // Red
            case 'cancelled':
                return 0x9e9e9e // Gray
            default:
                return this.options.config.TASK_COLOR
        }
    }

    private updateDependencies(dependencies: Record<string, any>): void {
        const currentDepIds = new Set(Object.keys(dependencies))

        // Remove dependencies that no longer exist
        for (const [depId, graphics] of this.dependencyGraphics) {
            if (!currentDepIds.has(depId)) {
                graphics.destroy()
                this.dependencyGraphics.delete(depId)
            }
        }

        // Update or create dependency graphics
        for (const dep of Object.values(dependencies)) {
            const srcAnchors = this.getTaskAnchors(dep.srcTaskId)
            const dstAnchors = this.getTaskAnchors(dep.dstTaskId)

            if (!srcAnchors || !dstAnchors) continue

            let graphics = this.dependencyGraphics.get(dep.id)
            if (!graphics) {
                graphics = new Graphics()
                graphics.name = `dependency-${dep.id}`
                this.options.layers.dependencies.addChild(graphics)
                this.dependencyGraphics.set(dep.id, graphics)
            }

            this.drawDependencyArrow(
                graphics,
                srcAnchors.rightCenterX,
                srcAnchors.rightCenterY,
                dstAnchors.leftCenterX,
                dstAnchors.leftCenterY
            )
        }
    }

    private drawDependencyArrow(
        graphics: Graphics,
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ): void {
        graphics.clear()

        const color = this.options.config.DEPENDENCY_COLOR

        // Draw line
        graphics.moveTo(x1, y1)
        graphics.lineTo(x2, y2)
        graphics.stroke({ width: 2, color, alpha: 0.6 })

        // Draw arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const arrowLength = 10
        const arrowAngle = Math.PI / 6

        const x3 = x2 - arrowLength * Math.cos(angle - arrowAngle)
        const y3 = y2 - arrowLength * Math.sin(angle - arrowAngle)
        const x4 = x2 - arrowLength * Math.cos(angle + arrowAngle)
        const y4 = y2 - arrowLength * Math.sin(angle + arrowAngle)

        graphics.moveTo(x2, y2)
        graphics.lineTo(x3, y3)
        graphics.moveTo(x2, y2)
        graphics.lineTo(x4, y4)
        graphics.stroke({ width: 2, color, alpha: 0.6 })
    }

    private updateSelection(selection: string[]): void {
        // Clear existing selection graphics
        for (const graphics of this.selectionGraphics.values()) {
            graphics.destroy()
        }
        this.selectionGraphics.clear()

        // Draw selection rectangles
        for (const taskId of selection) {
            const layout = this.taskLayouts.get(taskId)
            if (!layout) continue

            const graphics = new Graphics()
            graphics.name = `selection-${taskId}`

            // Draw selection outline
            graphics.rect(
                layout.startX - 2,
                layout.topY - 2,
                layout.width + 4,
                layout.height + 4
            )
            graphics.stroke({ width: 2, color: this.options.config.SELECTION_COLOR, alpha: 1 })

            this.options.layers.selection.addChild(graphics)
            this.selectionGraphics.set(taskId, graphics)
        }
    }

    private updateGrid(viewportState: { x: number; y: number; zoom: number }): void {
        if (!this.gridGraphics || !this.options.config.SHOW_GRID) return

        const config = this.options.config
        const dayWidth = config.DAY_WIDTH * viewportState.zoom
        const screenWidth = this.options.app.screen.width
        const screenHeight = this.options.app.screen.height

        this.gridGraphics.clear()

        // Draw vertical lines (days)
        const startDay = Math.floor(-viewportState.x / dayWidth)
        const endDay = Math.ceil((screenWidth - viewportState.x) / dayWidth)

        for (let day = startDay; day <= endDay; day++) {
            const x = config.LEFT_MARGIN + day * dayWidth
            const isMajor = day % 7 === 0 // Week lines

            const color = isMajor ? config.GRID_COLOR_MAJOR : config.GRID_COLOR_MINOR
            const width = isMajor ? 1 : 0.5
            const alpha = isMajor ? 0.3 : 0.2

            this.gridGraphics.moveTo(x, 0)
            this.gridGraphics.lineTo(x, screenHeight)
            this.gridGraphics.stroke({ width, color, alpha })
        }

        // Draw today line
        if (this.todayLine && this.options.config.SHOW_TODAY_LINE) {
            this.todayLine.clear()

            const today = new Date()
            const projectStart = new Date('2024-01-01') // This should come from project data
            const daysSinceStart = Math.floor(
                (today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
            )

            const todayX = config.LEFT_MARGIN + daysSinceStart * dayWidth

            this.todayLine.moveTo(todayX, 0)
            this.todayLine.lineTo(todayX, screenHeight)
            this.todayLine.stroke({ width: 2, color: config.TODAY_LINE_COLOR, alpha: 0.8 })
        }
    }

    getTaskAnchors(taskId: string): TaskAnchors | null {
        const layout = this.taskLayouts.get(taskId)
        if (!layout) return null

        return {
            leftCenterX: layout.startX,
            leftCenterY: layout.centerY,
            rightCenterX: layout.startX + layout.width,
            rightCenterY: layout.centerY,
            topCenterX: layout.centerX,
            topCenterY: layout.topY,
            bottomCenterX: layout.centerX,
            bottomCenterY: layout.topY + layout.height
        }
    }

    getTaskLayout(taskId: string): TaskLayout | null {
        return this.taskLayouts.get(taskId) || null
    }

    getTaskContainer(taskId: string): Container | null {
        return this.taskContainers.get(taskId) || null
    }

    destroy(): void {
        // Clear all containers
        for (const container of this.taskContainers.values()) {
            container.destroy({ children: true })
        }
        this.taskContainers.clear()
        this.taskLayouts.clear()

        // Clear dependency graphics
        for (const graphics of this.dependencyGraphics.values()) {
            graphics.destroy()
        }
        this.dependencyGraphics.clear()

        // Clear selection graphics
        for (const graphics of this.selectionGraphics.values()) {
            graphics.destroy()
        }
        this.selectionGraphics.clear()

        // Clear staff labels
        for (const text of this.staffLabels.values()) {
            text.destroy()
        }
        this.staffLabels.clear()

        // Clear grid
        this.gridGraphics?.destroy()
        this.gridGraphics = null

        // Clear today line
        this.todayLine?.destroy()
        this.todayLine = null
    }
}
