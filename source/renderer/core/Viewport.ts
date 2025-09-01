/**
 * Viewport
 * Manages viewport transformations, panning, and zooming
 */

import { Application, Container, EventSystem } from 'pixi.js'
import type { TimelineConfig } from '../../infrastructure/persistence/redux/slices/timelineSlice'

export interface ViewportOptions {
    app: Application
    container: Container
    config: TimelineConfig
}

export interface ViewportState {
    x: number
    y: number
    zoom: number
}

export interface ViewportCallbacks {
    onViewportChange?: (state: ViewportState) => void
    onDragStart?: () => void
    onDragEnd?: () => void
    onZoom?: (zoom: number) => void
}

export class Viewport {
    private state: ViewportState = { x: 0, y: 0, zoom: 1 }
    private isDragging = false
    private dragStartPoint = { x: 0, y: 0 }
    private dragStartViewport = { x: 0, y: 0 }
    private callbacks: ViewportCallbacks = {}

    private minZoom = 0.1
    private maxZoom = 5
    private zoomSpeed = 0.1
    private wheelSpeed = 1

    constructor(private options: ViewportOptions) {
        this.setupInteraction()
    }

    private setupInteraction(): void {
        const stage = this.options.app.stage

        // Make stage interactive
        stage.eventMode = 'static'
        stage.hitArea = this.options.app.screen

        // Mouse wheel zoom
        stage.on('wheel', this.handleWheel.bind(this))

        // Pan with middle mouse button or space + left mouse
        stage.on('pointerdown', this.handlePointerDown.bind(this))
        stage.on('pointermove', this.handlePointerMove.bind(this))
        stage.on('pointerup', this.handlePointerUp.bind(this))
        stage.on('pointerupoutside', this.handlePointerUp.bind(this))

        // Keyboard shortcuts
        this.setupKeyboardShortcuts()
    }

    private setupKeyboardShortcuts(): void {
        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case '=':
                case '+':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault()
                        this.zoomIn()
                    }
                    break
                case '-':
                case '_':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault()
                        this.zoomOut()
                    }
                    break
                case '0':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault()
                        this.resetZoom()
                    }
                    break
                case 'Home':
                    e.preventDefault()
                    this.resetViewport()
                    break
            }
        })
    }

    private handleWheel(event: any): void {
        const e = event.nativeEvent || event
        e.preventDefault()

        const delta = e.deltaY * -0.001 * this.wheelSpeed
        const newZoom = Math.max(
            this.minZoom,
            Math.min(this.maxZoom, this.state.zoom * (1 + delta))
        )

        if (newZoom !== this.state.zoom) {
            // Get mouse position relative to canvas
            const rect = this.options.app.canvas.getBoundingClientRect()
            const mouseX = e.clientX - rect.left
            const mouseY = e.clientY - rect.top

            // Zoom towards mouse position
            this.zoomTo(newZoom, mouseX, mouseY)
        }
    }

    private handlePointerDown(event: any): void {
        // Check if middle mouse button or space + left mouse
        if (event.data.button === 1 || (event.data.button === 0 && event.data.originalEvent.shiftKey)) {
            this.startDragging(event.data.global.x, event.data.global.y)
            event.stopPropagation()
        }
    }

    private handlePointerMove(event: any): void {
        if (this.isDragging) {
            this.updateDragging(event.data.global.x, event.data.global.y)
            event.stopPropagation()
        }
    }

    private handlePointerUp(event: any): void {
        if (this.isDragging) {
            this.stopDragging()
            event.stopPropagation()
        }
    }

    private startDragging(x: number, y: number): void {
        this.isDragging = true
        this.dragStartPoint = { x, y }
        this.dragStartViewport = { x: this.state.x, y: this.state.y }

        // Change cursor
        this.options.app.canvas.style.cursor = 'grabbing'

        // Notify callbacks
        this.callbacks.onDragStart?.()
    }

    private updateDragging(x: number, y: number): void {
        if (!this.isDragging) return

        const dx = x - this.dragStartPoint.x
        const dy = y - this.dragStartPoint.y

        this.setViewport({
            x: this.dragStartViewport.x + dx,
            y: this.dragStartViewport.y + dy
        })
    }

    private stopDragging(): void {
        this.isDragging = false

        // Reset cursor
        this.options.app.canvas.style.cursor = 'default'

        // Notify callbacks
        this.callbacks.onDragEnd?.()
    }

    update(state: ViewportState): void {
        this.state = state
        this.applyTransform()
    }

    setViewport(updates: Partial<ViewportState>): void {
        const changed =
            (updates.x !== undefined && updates.x !== this.state.x) ||
            (updates.y !== undefined && updates.y !== this.state.y) ||
            (updates.zoom !== undefined && updates.zoom !== this.state.zoom)

        if (!changed) return

        if (updates.x !== undefined) this.state.x = updates.x
        if (updates.y !== undefined) this.state.y = updates.y
        if (updates.zoom !== undefined) {
            this.state.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, updates.zoom))
        }

        this.applyTransform()
        this.callbacks.onViewportChange?.(this.state)
    }

    private applyTransform(): void {
        const container = this.options.container

        // Apply viewport transform
        container.position.set(this.state.x, this.state.y)
        container.scale.set(this.state.zoom)
    }

    pan(dx: number, dy: number): void {
        this.setViewport({
            x: this.state.x + dx,
            y: this.state.y + dy
        })
    }

    zoomIn(): void {
        const centerX = this.options.app.screen.width / 2
        const centerY = this.options.app.screen.height / 2
        this.zoomTo(this.state.zoom * (1 + this.zoomSpeed), centerX, centerY)
    }

    zoomOut(): void {
        const centerX = this.options.app.screen.width / 2
        const centerY = this.options.app.screen.height / 2
        this.zoomTo(this.state.zoom * (1 - this.zoomSpeed), centerX, centerY)
    }

    zoomTo(zoom: number, centerX: number, centerY: number): void {
        const oldZoom = this.state.zoom
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom))

        if (newZoom === oldZoom) return

        // Calculate new position to keep the center point fixed
        const zoomRatio = newZoom / oldZoom
        const newX = centerX - (centerX - this.state.x) * zoomRatio
        const newY = centerY - (centerY - this.state.y) * zoomRatio

        this.setViewport({ x: newX, y: newY, zoom: newZoom })
        this.callbacks.onZoom?.(newZoom)
    }

    resetZoom(): void {
        const centerX = this.options.app.screen.width / 2
        const centerY = this.options.app.screen.height / 2
        this.zoomTo(1, centerX, centerY)
    }

    resetViewport(): void {
        this.setViewport({ x: 0, y: 0, zoom: 1 })
    }

    fitToContent(contentBounds: { x: number; y: number; width: number; height: number }): void {
        const screenWidth = this.options.app.screen.width
        const screenHeight = this.options.app.screen.height

        const padding = 50 // Add some padding around content

        const zoomX = (screenWidth - padding * 2) / contentBounds.width
        const zoomY = (screenHeight - padding * 2) / contentBounds.height
        const zoom = Math.min(zoomX, zoomY, 1) // Don't zoom in beyond 100%

        const x = (screenWidth - contentBounds.width * zoom) / 2 - contentBounds.x * zoom
        const y = (screenHeight - contentBounds.height * zoom) / 2 - contentBounds.y * zoom

        this.setViewport({ x, y, zoom })
    }

    centerOn(x: number, y: number): void {
        const screenWidth = this.options.app.screen.width
        const screenHeight = this.options.app.screen.height

        const viewX = screenWidth / 2 - x * this.state.zoom
        const viewY = screenHeight / 2 - y * this.state.zoom

        this.setViewport({ x: viewX, y: viewY })
    }

    getState(): ViewportState {
        return { ...this.state }
    }

    setCallbacks(callbacks: ViewportCallbacks): void {
        this.callbacks = callbacks
    }

    screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        return {
            x: (screenX - this.state.x) / this.state.zoom,
            y: (screenY - this.state.y) / this.state.zoom
        }
    }

    worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        return {
            x: worldX * this.state.zoom + this.state.x,
            y: worldY * this.state.zoom + this.state.y
        }
    }

    handleResize(width: number, height: number): void {
        // Update hit area
        this.options.app.stage.hitArea = { x: 0, y: 0, width, height }
    }

    destroy(): void {
        const stage = this.options.app.stage

        // Remove event listeners
        stage.removeAllListeners()

        // Reset cursor
        this.options.app.canvas.style.cursor = 'default'
    }
}
