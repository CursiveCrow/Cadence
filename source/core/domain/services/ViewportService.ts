/**
 * ViewportService Domain Service
 * Manages viewport state and transformations for timeline visualization
 */

export interface ViewportState {
    x: number
    y: number
    zoom: number
    verticalScale: number
}

export interface ViewportBounds {
    minX: number
    maxX: number
    minY: number
    maxY: number
    minZoom: number
    maxZoom: number
    minVerticalScale: number
    maxVerticalScale: number
}

export class ViewportService {
    private state: ViewportState = {
        x: 0,
        y: 0,
        zoom: 1,
        verticalScale: 1
    }

    private bounds: ViewportBounds = {
        minX: -10000,
        maxX: 10000,
        minY: -10000,
        maxY: 10000,
        minZoom: 0.1,
        maxZoom: 5,
        minVerticalScale: 0.5,
        maxVerticalScale: 2
    }

    /**
     * Get current viewport state
     */
    getState(): ViewportState {
        return { ...this.state }
    }

    /**
     * Set viewport state
     */
    setState(newState: Partial<ViewportState>): ViewportState {
        this.state = {
            ...this.state,
            ...this.clampState(newState)
        }
        return this.getState()
    }

    /**
     * Pan the viewport
     */
    pan(deltaX: number, deltaY: number): ViewportState {
        return this.setState({
            x: this.state.x + deltaX,
            y: this.state.y + deltaY
        })
    }

    /**
     * Zoom the viewport around a point
     */
    zoom(factor: number, centerX: number, centerY: number): ViewportState {
        const newZoom = this.state.zoom * factor

        // Calculate new position to maintain center point
        const scale = newZoom / this.state.zoom
        const newX = centerX - (centerX - this.state.x) * scale
        const newY = centerY - (centerY - this.state.y) * scale

        return this.setState({
            zoom: newZoom,
            x: newX,
            y: newY
        })
    }

    /**
     * Set vertical scale
     */
    setVerticalScale(scale: number): ViewportState {
        return this.setState({
            verticalScale: scale
        })
    }

    /**
     * Reset viewport to default state
     */
    reset(): ViewportState {
        return this.setState({
            x: 0,
            y: 0,
            zoom: 1,
            verticalScale: 1
        })
    }

    /**
     * Fit viewport to content bounds
     */
    fitToBounds(contentWidth: number, contentHeight: number, viewWidth: number, viewHeight: number): ViewportState {
        const zoomX = viewWidth / contentWidth
        const zoomY = viewHeight / contentHeight
        const zoom = Math.min(zoomX, zoomY) * 0.9 // 90% to add padding

        return this.setState({
            x: (viewWidth - contentWidth * zoom) / 2,
            y: (viewHeight - contentHeight * zoom) / 2,
            zoom
        })
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        return {
            x: (screenX - this.state.x) / this.state.zoom,
            y: (screenY - this.state.y) / (this.state.zoom * this.state.verticalScale)
        }
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        return {
            x: worldX * this.state.zoom + this.state.x,
            y: worldY * this.state.zoom * this.state.verticalScale + this.state.y
        }
    }

    /**
     * Set viewport bounds
     */
    setBounds(bounds: Partial<ViewportBounds>): void {
        this.bounds = {
            ...this.bounds,
            ...bounds
        }
        // Re-clamp current state
        this.setState(this.state)
    }

    /**
     * Get viewport bounds
     */
    getBounds(): ViewportBounds {
        return { ...this.bounds }
    }

    /**
     * Clamp viewport state to bounds
     */
    private clampState(state: Partial<ViewportState>): Partial<ViewportState> {
        const clamped: Partial<ViewportState> = {}

        if (state.x !== undefined) {
            clamped.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, state.x))
        }

        if (state.y !== undefined) {
            clamped.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, state.y))
        }

        if (state.zoom !== undefined) {
            clamped.zoom = Math.max(this.bounds.minZoom, Math.min(this.bounds.maxZoom, state.zoom))
        }

        if (state.verticalScale !== undefined) {
            clamped.verticalScale = Math.max(
                this.bounds.minVerticalScale,
                Math.min(this.bounds.maxVerticalScale, state.verticalScale)
            )
        }

        return clamped
    }

    /**
     * Calculate visible bounds in world coordinates
     */
    getVisibleBounds(viewWidth: number, viewHeight: number): {
        left: number
        top: number
        right: number
        bottom: number
        width: number
        height: number
    } {
        const topLeft = this.screenToWorld(0, 0)
        const bottomRight = this.screenToWorld(viewWidth, viewHeight)

        return {
            left: topLeft.x,
            top: topLeft.y,
            right: bottomRight.x,
            bottom: bottomRight.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y
        }
    }

    /**
     * Smoothly animate to a new viewport state
     */
    animateTo(
        targetState: Partial<ViewportState>,
        duration: number,
        onUpdate: (state: ViewportState) => void,
        onComplete?: () => void
    ): () => void {
        const startState = this.getState()
        const startTime = Date.now()
        let animationFrame: number

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Easing function (ease-in-out)
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2

            const interpolated: Partial<ViewportState> = {}

            if (targetState.x !== undefined) {
                interpolated.x = startState.x + (targetState.x - startState.x) * eased
            }
            if (targetState.y !== undefined) {
                interpolated.y = startState.y + (targetState.y - startState.y) * eased
            }
            if (targetState.zoom !== undefined) {
                interpolated.zoom = startState.zoom + (targetState.zoom - startState.zoom) * eased
            }
            if (targetState.verticalScale !== undefined) {
                interpolated.verticalScale = startState.verticalScale + (targetState.verticalScale - startState.verticalScale) * eased
            }

            const newState = this.setState(interpolated)
            onUpdate(newState)

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate)
            } else {
                onComplete?.()
            }
        }

        animate()

        // Return cancel function
        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame)
            }
        }
    }
}
