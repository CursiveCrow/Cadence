/**
 * TaskRenderer Component
 * Manages rendering of all tasks in the timeline
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Task } from '../../core/domain/entities/Task'
import type { Staff } from '../../core/domain/entities/Staff'
import { TaskStatus } from '../../core/domain/value-objects/TaskStatus'
import { drawNoteBodyPathAbsolute } from '../utils/shapes'
import { CONSTANTS } from '../../config/constants'

export interface TaskAnchors {
    leftCenterX: number
    leftCenterY: number
    rightCenterX: number
    rightCenterY: number
}

export interface TaskRendererOptions {
    container: Container
    config?: Partial<typeof CONSTANTS>
}

export interface TaskRenderContext {
    projectStartDate: Date
    staffs: Staff[]
    viewportState: { x: number; y: number; zoom: number; verticalScale?: number }
    selectedTaskIds?: string[]
    highlightedTaskId?: string | null
}

export class TaskRenderer {
    private container: Container
    private taskGraphics: Map<string, Container> = new Map()
    private taskAnchors: Map<string, TaskAnchors> = new Map()
    private tasks: Task[] = []
    private config: typeof CONSTANTS

    constructor(options: TaskRendererOptions) {
        this.container = options.container
        this.config = { ...CONSTANTS, ...options.config }
    }

    /**
     * Update tasks data
     */
    updateTasks(tasks: Task[]): void {
        this.tasks = tasks
    }

    /**
     * Render all tasks
     */
    public render(context: TaskRenderContext): void {
        const { projectStartDate, staffs, viewportState, selectedTaskIds = [], highlightedTaskId } = context

        // Track which tasks are still valid
        const validIds = new Set<string>()

        for (const task of this.tasks) {
            validIds.add(task.id)

            // Calculate task position
            const layout = this.calculateTaskLayout(task, projectStartDate, staffs, viewportState)
            if (!layout) continue

            // Store anchors for dependency rendering
            this.taskAnchors.set(task.id, {
                leftCenterX: layout.x + layout.radius,
                leftCenterY: layout.y + layout.height / 2,
                rightCenterX: layout.x + layout.width,
                rightCenterY: layout.y + layout.height / 2
            })

            // Get or create container for this task
            let taskContainer = this.taskGraphics.get(task.id)
            if (!taskContainer) {
                taskContainer = new Container()
                    ; (taskContainer as any).label = `task-${task.id}`
                taskContainer.eventMode = 'static'
                taskContainer.cursor = 'pointer'
                this.container.addChild(taskContainer)
                this.taskGraphics.set(task.id, taskContainer)
            }

            // Clear and redraw
            taskContainer.removeChildren()

            // Determine style
            const isSelected = selectedTaskIds.includes(task.id)
            const isHighlighted = task.id === highlightedTaskId

            // Draw task
            this.drawTask(taskContainer, task, layout, isSelected, isHighlighted)
        }

        // Remove graphics for tasks that no longer exist
        for (const [id, container] of this.taskGraphics) {
            if (!validIds.has(id)) {
                this.container.removeChild(container)
                container.destroy({ children: true })
                this.taskGraphics.delete(id)
                this.taskAnchors.delete(id)
            }
        }
    }

    /**
     * Calculate task layout
     */
    private calculateTaskLayout(
        task: Task,
        projectStartDate: Date,
        staffs: Staff[],
        viewportState: { x: number; y: number; zoom: number; verticalScale?: number }
    ): { x: number; y: number; width: number; height: number; radius: number } | null {
        // Find staff
        const staffIndex = staffs.findIndex(s => s.id === task.staffId)
        if (staffIndex === -1) return null

        const staff = staffs[staffIndex]
        const verticalScale = viewportState.verticalScale || 1

        // Calculate horizontal position
        const startDate = new Date(task.startDate)
        const daysSinceStart = Math.floor(
            (startDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        const dayWidth = this.config.DEFAULT_DAY_WIDTH * viewportState.zoom
        const x = this.config.DEFAULT_LEFT_MARGIN + daysSinceStart * dayWidth
        const width = task.durationDays * dayWidth

        // Calculate vertical position
        const topMargin = this.config.DEFAULT_TOP_MARGIN * verticalScale
        const staffSpacing = this.config.DEFAULT_STAFF_SPACING * verticalScale
        const lineSpacing = this.config.DEFAULT_STAFF_LINE_SPACING * verticalScale

        const staffY = topMargin + staffIndex * staffSpacing
        const y = staffY + task.staffLine * lineSpacing

        const height = this.config.DEFAULT_TASK_HEIGHT * verticalScale
        const radius = height / 2

        return { x, y, width, height, radius }
    }

    /**
     * Draw a single task
     */
    private drawTask(
        container: Container,
        task: Task,
        layout: { x: number; y: number; width: number; height: number; radius: number },
        isSelected: boolean,
        isHighlighted: boolean
    ): void {
        // Create graphics
        const graphics = new Graphics()

        // Get color based on status
        const color = this.getTaskColor(task.status)
        const borderColor = isSelected ? 0x4285f4 : (isHighlighted ? 0x5a95f5 : 0x333333)
        const borderWidth = isSelected ? 2 : 1
        const borderAlpha = isSelected ? 1 : (isHighlighted ? 0.8 : 0.5)

        // Draw task body using the note shape
        drawNoteBodyPathAbsolute(graphics, layout.x, layout.y, layout.width, layout.height)
        graphics.fill({ color, alpha: 0.9 })
        graphics.stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha })

        // Draw status glyph in the circular end
        this.drawStatusGlyph(container, task.status, layout.x + layout.radius, layout.y + layout.radius, layout.radius)

        // Add task label
        if (layout.width > 50) {
            const style = new TextStyle({
                fontFamily: 'Arial',
                fontSize: Math.min(12, layout.height * 0.4),
                fill: 0x000000,
                align: 'left'
            })

            const text = new Text({
                text: task.title,
                style
            })

            text.x = layout.x + layout.radius * 2 + 5
            text.y = layout.y + (layout.height - text.height) / 2

            // Clip text to task width
            const maxWidth = layout.width - layout.radius * 2 - 10
            if (text.width > maxWidth) {
                const truncated = task.title.substring(0, Math.floor(task.title.length * (maxWidth / text.width) - 3)) + '...'
                text.text = truncated
            }

            container.addChild(text)
        }

        container.addChild(graphics);

        // Set interaction data
        (container as any).taskId = task.id
    }

    /**
     * Draw status glyph (musical accidentals)
     */
    private drawStatusGlyph(
        container: Container,
        status: TaskStatus,
        centerX: number,
        centerY: number,
        radius: number
    ): void {
        const glyphStyle = new TextStyle({
            fontFamily: 'serif',
            fontSize: radius * 1.2,
            fill: 0xffffff,
            align: 'center'
        })

        let glyph = ''
        switch (status) {
            case TaskStatus.NOT_STARTED:
                glyph = '♮' // Natural
                break
            case TaskStatus.IN_PROGRESS:
                glyph = '♯' // Sharp
                break
            case TaskStatus.COMPLETED:
                glyph = '♭' // Flat
                break
            case TaskStatus.BLOCKED:
                glyph = '𝄪' // Double sharp
                break
            case TaskStatus.CANCELLED:
                glyph = '𝄪'
                break
            default:
                glyph = '♮'
        }

        const text = new Text({
            text: glyph,
            style: glyphStyle
        })

        text.x = centerX - text.width / 2
        text.y = centerY - text.height / 2

        container.addChild(text)
    }

    /**
     * Get color based on task status
     */
    private getTaskColor(status: TaskStatus): number {
        switch (status) {
            case TaskStatus.NOT_STARTED:
                return 0xf0f0f0
            case TaskStatus.IN_PROGRESS:
                return 0x4285f4
            case TaskStatus.COMPLETED:
                return 0x34a853
            case TaskStatus.BLOCKED:
                return 0xea4335
            case TaskStatus.CANCELLED:
                return 0x9e9e9e
            default:
                return 0xf0f0f0
        }
    }

    /**
     * Get task anchors for dependency rendering
     */
    getTaskAnchors(taskId: string): TaskAnchors | undefined {
        return this.taskAnchors.get(taskId)
    }

    /**
     * Highlight a task
     */
    highlight(taskId: string | null): void {
        // This would trigger a re-render with the highlighted task
    }

    /**
     * Select tasks
     */
    select(taskIds: string[]): void {
        // This would trigger a re-render with selected tasks
    }

    /**
     * Clear all graphics
     */
    clear(): void {
        for (const container of this.taskGraphics.values()) {
            container.removeChildren()
        }
    }

    /**
     * Destroy the renderer
     */
    destroy(): void {
        for (const container of this.taskGraphics.values()) {
            this.container.removeChild(container)
            container.destroy({ children: true })
        }
        this.taskGraphics.clear()
        this.taskAnchors.clear()
    }
}