/**
 * TaskRenderer Component
 * Handles rendering of individual tasks
 */

import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js'
import type { Task } from '../../core/domain/entities/Task'
import type { TaskLayout } from '../core/SceneGraph'

export interface TaskRendererOptions {
    task: Task
    layout: TaskLayout
    isSelected: boolean
    config: any
    zoom: number
}

export class TaskRenderer {
    private container: Container
    private background: Graphics
    private label: Text
    private statusIcon: Graphics | null = null

    constructor(private options: TaskRendererOptions) {
        this.container = new Container()
        this.container.name = `task-${options.task.id}`
        this.background = new Graphics()
        this.label = new Text()
        this.render()
    }

    private render(): void {
        const { task, layout, isSelected, config, zoom } = this.options

        // Clear existing graphics
        this.background.clear()

        // Determine colors based on status and selection
        const color = this.getTaskColor()
        const borderColor = isSelected ? config.TASK_COLOR_SELECTED : 0x000000
        const borderWidth = isSelected ? 2 : 1
        const borderAlpha = isSelected ? 1 : 0.3

        // Draw task background with rounded corners
        const cornerRadius = Math.min(4, layout.height / 4)
        this.background.roundRect(0, 0, layout.width, layout.height, cornerRadius)
        this.background.fill({ color, alpha: 0.9 })
        this.background.stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha })

        // Add status indicator
        this.renderStatusIndicator()

        // Update label
        this.updateLabel()

        // Add to container
        this.container.removeChildren()
        this.container.addChild(this.background)
        if (this.statusIcon) {
            this.container.addChild(this.statusIcon)
        }
        this.container.addChild(this.label)

        // Set position
        this.container.position.set(Math.round(layout.startX), Math.round(layout.topY))

        // Make interactive
        this.container.eventMode = 'static'
        this.container.cursor = 'pointer'
        this.container.hitArea = new Rectangle(0, 0, layout.width, layout.height)
    }

    private getTaskColor(): number {
        const { task, isSelected, config } = this.options

        if (isSelected) {
            return config.TASK_COLOR_SELECTED
        }

        switch (task.status) {
            case 'completed':
                return 0x4caf50 // Green
            case 'in_progress':
                return 0x2196f3 // Blue
            case 'blocked':
                return 0xf44336 // Red
            case 'cancelled':
                return 0x9e9e9e // Gray
            case 'not_started':
            default:
                return config.TASK_COLOR
        }
    }

    private renderStatusIndicator(): void {
        const { task, layout } = this.options

        if (this.statusIcon) {
            this.statusIcon.clear()
        } else {
            this.statusIcon = new Graphics()
        }

        const iconSize = Math.min(12, layout.height * 0.6)
        const iconX = layout.width - iconSize - 4
        const iconY = (layout.height - iconSize) / 2

        switch (task.status) {
            case 'completed':
                // Draw checkmark
                this.statusIcon.moveTo(iconX + iconSize * 0.2, iconY + iconSize * 0.5)
                this.statusIcon.lineTo(iconX + iconSize * 0.4, iconY + iconSize * 0.7)
                this.statusIcon.lineTo(iconX + iconSize * 0.8, iconY + iconSize * 0.3)
                this.statusIcon.stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
                break

            case 'blocked':
                // Draw X
                this.statusIcon.moveTo(iconX + iconSize * 0.3, iconY + iconSize * 0.3)
                this.statusIcon.lineTo(iconX + iconSize * 0.7, iconY + iconSize * 0.7)
                this.statusIcon.moveTo(iconX + iconSize * 0.7, iconY + iconSize * 0.3)
                this.statusIcon.lineTo(iconX + iconSize * 0.3, iconY + iconSize * 0.7)
                this.statusIcon.stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
                break

            case 'in_progress':
                // Draw progress circle
                this.statusIcon.circle(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2 - 1)
                this.statusIcon.stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
                // Draw progress arc (example: 60% complete)
                const progress = 0.6
                const startAngle = -Math.PI / 2
                const endAngle = startAngle + progress * Math.PI * 2
                this.statusIcon.arc(
                    iconX + iconSize / 2,
                    iconY + iconSize / 2,
                    iconSize / 2 - 1,
                    startAngle,
                    endAngle
                )
                this.statusIcon.fill({ color: 0xffffff, alpha: 0.9 })
                break

            case 'cancelled':
                // Draw strikethrough
                this.statusIcon.moveTo(iconX, iconY + iconSize / 2)
                this.statusIcon.lineTo(iconX + iconSize, iconY + iconSize / 2)
                this.statusIcon.stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
                break
        }
    }

    private updateLabel(): void {
        const { task, layout, zoom } = this.options

        // Calculate font size based on zoom and task height
        const fontSize = Math.max(8, Math.min(14, layout.height * 0.6))

        const style = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize,
            fill: 0xffffff,
            align: 'left',
            wordWrap: true,
            wordWrapWidth: layout.width - 20,
            lineHeight: fontSize * 1.2
        })

        this.label.text = task.title
        this.label.style = style

        // Position label with padding
        this.label.x = 6
        this.label.y = (layout.height - this.label.height) / 2

        // Truncate if too long
        if (this.label.width > layout.width - 30) {
            const maxChars = Math.floor((layout.width - 30) / (fontSize * 0.5))
            this.label.text = task.title.substring(0, maxChars) + '...'
        }
    }

    update(options: Partial<TaskRendererOptions>): void {
        Object.assign(this.options, options)
        this.render()
    }

    getContainer(): Container {
        return this.container
    }

    highlight(enabled: boolean): void {
        if (enabled) {
            this.background.tint = 0xffff00 // Yellow tint
            this.background.alpha = 1
        } else {
            this.background.tint = 0xffffff // Reset tint
            this.background.alpha = 0.9
        }
    }

    setDragging(isDragging: boolean): void {
        if (isDragging) {
            this.container.alpha = 0.5
            this.container.cursor = 'grabbing'
        } else {
            this.container.alpha = 1
            this.container.cursor = 'pointer'
        }
    }

    destroy(): void {
        this.container.destroy({ children: true })
    }
}
