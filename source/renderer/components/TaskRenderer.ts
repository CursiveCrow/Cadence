/**
 * TaskRenderer Component
 * Manages rendering of all tasks in the timeline
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Task } from '../../core/domain/entities/Task'
import type { Staff } from '../../core/domain/entities/Staff'
import { TaskStatus } from '../../core/domain/value-objects/TaskStatus'
import { drawNoteBodyPathAbsolute } from '../utils/shapes'
import { computeViewportAlignment, worldDayToScreenX } from '../utils/alignment'
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
    private interactions?: {
        onPointerDown?: (args: { taskId: string; globalX: number; globalY: number; localX: number; localY: number }) => void
        onPointerUp?: (args: { taskId: string; globalX: number; globalY: number }) => void
        onPointerEnter?: (args: { taskId: string }) => void
        onPointerLeave?: (args: { taskId: string }) => void
    }

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

        // Compute horizontal alignment once, shared with GridRenderer
        const dayWidth = this.config.DEFAULT_DAY_WIDTH * viewportState.zoom
        const leftMargin = this.config.DEFAULT_LEFT_MARGIN
        const align = computeViewportAlignment({ LEFT_MARGIN: leftMargin, DAY_WIDTH: dayWidth }, (viewportState.x || 0) / Math.max(1, dayWidth))

        for (const task of this.tasks) {
            validIds.add(task.id)

            // Calculate task position
            const layout = this.calculateTaskLayout(task, projectStartDate, staffs, viewportState, align)
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
                // Attach interactions once
                if (!(taskContainer as any).__wired) {
                    taskContainer.on('pointerdown', (e: any) => {
                        const global = (e as any).global || { x: 0, y: 0 }
                        const local = taskContainer!.toLocal(global)
                        this.interactions?.onPointerDown?.({
                            taskId: (taskContainer as any).taskId || task.id,
                            globalX: global.x,
                            globalY: global.y,
                            localX: local.x,
                            localY: local.y,
                            // Extended payload fields passed through loosely
                            ...(typeof (e as any).button !== 'undefined' ? { button: (e as any).button } : {}),
                            ...((taskContainer as any).__layoutWidth ? { layoutWidth: (taskContainer as any).__layoutWidth } : {})
                        })
                    })
                    taskContainer.on('pointerup', (e: any) => {
                        const global = (e as any).global || { x: 0, y: 0 }
                        this.interactions?.onPointerUp?.({
                            taskId: (taskContainer as any).taskId || task.id,
                            globalX: global.x,
                            globalY: global.y
                        })
                    })
                    taskContainer.on('pointerenter', () => {
                        this.interactions?.onPointerEnter?.({ taskId: task.id })
                    })
                    taskContainer.on('pointerleave', () => {
                        this.interactions?.onPointerLeave?.({ taskId: task.id })
                    })
                        ; (taskContainer as any).__wired = true
                }
            }

            // Clear and redraw
            taskContainer.removeChildren()

            // Determine style
            const isSelected = selectedTaskIds.includes(task.id)
            const isHighlighted = task.id === highlightedTaskId

                // Draw task
                ; (taskContainer as any).__layoutWidth = layout.width
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
        viewportState: { x: number; y: number; zoom: number; verticalScale?: number },
        align?: { viewportXDaysQuantized: number; viewportPixelOffsetX: number }
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
        const leftMargin = this.config.DEFAULT_LEFT_MARGIN
        // Use quantized alignment if provided to avoid drift when panning
        const x = align
            ? worldDayToScreenX({ LEFT_MARGIN: leftMargin, DAY_WIDTH: dayWidth }, daysSinceStart, align)
            : leftMargin + daysSinceStart * dayWidth + viewportState.x
        const width = task.durationDays * dayWidth

        // Calculate vertical position
        const topMargin = this.config.DEFAULT_TOP_MARGIN * verticalScale
        const staffSpacing = this.config.DEFAULT_STAFF_SPACING * verticalScale
        const lineSpacing = this.config.DEFAULT_STAFF_LINE_SPACING * verticalScale

        const staffY = topMargin + staffIndex * staffSpacing
        const y = staffY + task.staffLine * lineSpacing + viewportState.y

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

        // Get color based on status (dark theme tuned)
        const color = this.getTaskColor(task.status)
        const borderColor = isSelected ? 0x8b5cf6 : (isHighlighted ? 0x8b5cf6 : 0x2a2f36)
        const borderWidth = isSelected ? 2 : 1
        const borderAlpha = isSelected ? 0.9 : (isHighlighted ? 0.7 : 0.4)

        // Draw task body using the note shape
        drawNoteBodyPathAbsolute(graphics, layout.x, layout.y, layout.width, layout.height)
        graphics.fill({ color, alpha: 0.95 })
        graphics.stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha })

        // Add body first so glyph and label render above
        container.addChild(graphics)

        // Selection highlight ring (overlay outline), matching archive behavior
        if (isSelected) {
            const sel = new Graphics()
            sel.roundRect(layout.x - 2, layout.y - 2, layout.width + 4, layout.height + 4, layout.radius + 2)
            sel.stroke({ width: 2, color: 0x4285f4, alpha: 0.9 })
            container.addChild(sel)
        }

        // Draw status glyph in the circular end
        this.drawStatusGlyph(container, task.status, layout.x + layout.radius, layout.y + layout.radius, Math.max(10, layout.radius * 0.9))

        // Add task label
        if (layout.width > 50) {
            const style = new TextStyle({
                fontFamily: 'Arial',
                fontSize: Math.min(12, layout.height * 0.38),
                fill: 0xe5e7eb,
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

        // Set interaction data
        (container as any).taskId = task.id
        // Update cursor on hover near edges for resize affordance
        const threshold = 10
        if (!(container as any).__cursorWired) {
            container.on('pointermove', (e: any) => {
                const global = (e as any).global || { x: 0, y: 0 }
                const local = container.toLocal(global)
                const widthNow = (container as any).__layoutWidth || layout.width
                const nearLeft = local.x >= 0 && local.x <= threshold
                const nearRight = local.x >= 0 && widthNow - local.x <= threshold
                container.cursor = (nearLeft || nearRight) ? 'ew-resize' : 'pointer'
            })
            container.on('pointerout', () => {
                container.cursor = 'pointer'
            })
                ; (container as any).__cursorWired = true
        }
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
                glyph = '•' // dot for not-started
                break
            case TaskStatus.IN_PROGRESS:
                glyph = '♯' // Sharp
                break
            case TaskStatus.COMPLETED:
                glyph = '♭' // Flat
                break
            case TaskStatus.BLOCKED:
                glyph = '!'
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
                return 0x2b3138 // neutral pill on dark
            case TaskStatus.IN_PROGRESS:
                return 0x1e3a8a // blue
            case TaskStatus.COMPLETED:
                return 0x14532d // green
            case TaskStatus.BLOCKED:
                return 0x7f1d1d // red
            case TaskStatus.CANCELLED:
                return 0x374151 // grey
            default:
                return 0x2b3138
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

    /**
     * Wire interaction handlers provided by engine options
     */
    setInteractionHandlers(handlers: {
        onPointerDown?: (args: { taskId: string; globalX: number; globalY: number; localX: number; localY: number }) => void
        onPointerUp?: (args: { taskId: string; globalX: number; globalY: number }) => void
        onPointerEnter?: (args: { taskId: string }) => void
        onPointerLeave?: (args: { taskId: string }) => void
    }): void {
        this.interactions = handlers
    }
}