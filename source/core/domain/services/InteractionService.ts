/**
 * InteractionService Domain Service
 * Handles user interaction logic for timeline manipulation
 */

import { ViewportService, ViewportState } from './ViewportService'

export interface InteractionConfig {
    panSpeed: number
    zoomSpeed: number
    wheelSpeed: number
    enableTouch: boolean
    enableKeyboard: boolean
}

export interface InteractionCallbacks {
    onViewportChange?: (state: ViewportState) => void
    onPanStart?: () => void
    onPanEnd?: () => void
    onZoomStart?: () => void
    onZoomEnd?: () => void
}

export class InteractionService {
    private viewportService: ViewportService
    private config: InteractionConfig
    private callbacks: InteractionCallbacks

    private isPanning = false
    private panStart = { x: 0, y: 0 }
    private viewportStart = { x: 0, y: 0 }

    private isZooming = false
    private pinchDistance = 0

    constructor(
        viewportService: ViewportService,
        config: Partial<InteractionConfig> = {},
        callbacks: InteractionCallbacks = {}
    ) {
        this.viewportService = viewportService
        this.callbacks = callbacks
        this.config = {
            panSpeed: 1,
            zoomSpeed: 0.1,
            wheelSpeed: 1,
            enableTouch: true,
            enableKeyboard: true,
            ...config
        }
    }

    /**
     * Start panning interaction
     */
    startPan(x: number, y: number): void {
        if (this.isPanning) return

        this.isPanning = true
        this.panStart = { x, y }
        const viewport = this.viewportService.getState()
        this.viewportStart = { x: viewport.x, y: viewport.y }

        this.callbacks.onPanStart?.()
    }

    /**
     * Update panning interaction
     */
    updatePan(x: number, y: number): void {
        if (!this.isPanning) return

        const deltaX = (x - this.panStart.x) * this.config.panSpeed
        const deltaY = (y - this.panStart.y) * this.config.panSpeed

        const newState = this.viewportService.setState({
            x: this.viewportStart.x + deltaX,
            y: this.viewportStart.y + deltaY
        })

        this.callbacks.onViewportChange?.(newState)
    }

    /**
     * End panning interaction
     */
    endPan(): void {
        if (!this.isPanning) return

        this.isPanning = false
        this.callbacks.onPanEnd?.()
    }

    /**
     * Handle wheel zoom
     */
    handleWheel(deltaY: number, centerX: number, centerY: number, ctrlKey: boolean = false): void {
        const delta = -deltaY * 0.001 * this.config.wheelSpeed
        const factor = Math.pow(1.1, delta)

        if (ctrlKey) {
            // Vertical scale adjustment
            const currentState = this.viewportService.getState()
            const newScale = currentState.verticalScale * factor
            const newState = this.viewportService.setVerticalScale(newScale)
            this.callbacks.onViewportChange?.(newState)
        } else {
            // Regular zoom
            const newState = this.viewportService.zoom(factor, centerX, centerY)
            this.callbacks.onViewportChange?.(newState)
        }
    }

    /**
     * Handle pinch zoom (touch)
     */
    startPinch(distance: number): void {
        if (!this.config.enableTouch) return

        this.isZooming = true
        this.pinchDistance = distance
        this.callbacks.onZoomStart?.()
    }

    /**
     * Update pinch zoom
     */
    updatePinch(distance: number, centerX: number, centerY: number): void {
        if (!this.isZooming || !this.config.enableTouch) return

        const factor = distance / this.pinchDistance
        this.pinchDistance = distance

        const newState = this.viewportService.zoom(factor, centerX, centerY)
        this.callbacks.onViewportChange?.(newState)
    }

    /**
     * End pinch zoom
     */
    endPinch(): void {
        if (!this.isZooming) return

        this.isZooming = false
        this.callbacks.onZoomEnd?.()
    }

    /**
     * Handle keyboard zoom
     */
    zoomIn(centerX?: number, centerY?: number): void {
        if (!this.config.enableKeyboard) return

        const viewport = this.viewportService.getState()
        const cx = centerX ?? 0
        const cy = centerY ?? 0

        const newState = this.viewportService.zoom(1.2, cx, cy)
        this.callbacks.onViewportChange?.(newState)
    }

    /**
     * Handle keyboard zoom out
     */
    zoomOut(centerX?: number, centerY?: number): void {
        if (!this.config.enableKeyboard) return

        const viewport = this.viewportService.getState()
        const cx = centerX ?? 0
        const cy = centerY ?? 0

        const newState = this.viewportService.zoom(0.8, cx, cy)
        this.callbacks.onViewportChange?.(newState)
    }

    /**
     * Reset viewport
     */
    reset(): void {
        const newState = this.viewportService.reset()
        this.callbacks.onViewportChange?.(newState)
    }

    /**
     * Fit to content
     */
    fitToContent(contentWidth: number, contentHeight: number, viewWidth: number, viewHeight: number): void {
        const newState = this.viewportService.fitToBounds(
            contentWidth,
            contentHeight,
            viewWidth,
            viewHeight
        )
        this.callbacks.onViewportChange?.(newState)
    }

    /**
     * Pan by keyboard
     */
    panByKeyboard(direction: 'up' | 'down' | 'left' | 'right', amount: number = 50): void {
        if (!this.config.enableKeyboard) return

        let deltaX = 0
        let deltaY = 0

        switch (direction) {
            case 'up':
                deltaY = amount
                break
            case 'down':
                deltaY = -amount
                break
            case 'left':
                deltaX = amount
                break
            case 'right':
                deltaX = -amount
                break
        }

        const newState = this.viewportService.pan(deltaX, deltaY)
        this.callbacks.onViewportChange?.(newState)
    }

    /**
     * Check if currently panning
     */
    getIsPanning(): boolean {
        return this.isPanning
    }

    /**
     * Check if currently zooming
     */
    getIsZooming(): boolean {
        return this.isZooming
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<InteractionConfig>): void {
        this.config = {
            ...this.config,
            ...config
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): InteractionConfig {
        return { ...this.config }
    }
}
