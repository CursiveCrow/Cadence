import { ViewportState } from '../../state/slices/uiSlice'
import { pixelsPerDay, applyAnchorZoom } from '@renderer/timeline'
import { TIMELINE } from '../../shared/timeline'

// Centralized viewport operations manager
export class ViewportManager {
    private viewport: ViewportState = { x: 0, y: 0, zoom: 1 }
    private screenDimensions = { width: 1, height: 1 }
    private leftMargin = 0

    constructor(initialViewport?: ViewportState) {
        if (initialViewport) {
            this.viewport = { ...initialViewport }
        }
    }

    // Update viewport state
    setViewport(newViewport: ViewportState) {
        this.viewport = this.clampViewport(newViewport)
    }

    // Update screen dimensions
    setScreenDimensions(width: number, height: number) {
        this.screenDimensions = { width: Math.max(1, width), height: Math.max(1, height) }
    }

    // Update dynamic left margin (usually UI.sidebarWidth)
    setLeftMargin(leftMargin: number) {
        this.leftMargin = Math.max(0, Math.round(leftMargin || 0))
    }

    // Get current viewport
    getViewport(): ViewportState {
        return { ...this.viewport }
    }

    // Get screen dimensions
    getScreenDimensions() {
        return { ...this.screenDimensions }
    }

    // Calculate pixels per day for current zoom
    getPixelsPerDay(): number {
        return pixelsPerDay(this.viewport.zoom, TIMELINE.DAY_WIDTH)
    }

    // Convert world coordinates to screen coordinates
    worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        const ppd = this.getPixelsPerDay()
        return {
            x: this.leftMargin + (worldX - this.viewport.x) * ppd,
            y: worldY - this.viewport.y
        }
    }

    // Convert screen coordinates to world coordinates
    screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        const ppd = this.getPixelsPerDay()
        return {
            x: this.viewport.x + (screenX - this.leftMargin) / ppd,
            y: this.viewport.y + screenY
        }
    }

    // Check if a rectangle is visible in the current viewport
    isRectVisible(
        worldX: number,
        worldY: number,
        worldWidth: number,
        worldHeight: number,
        margin: number = 50
    ): boolean {
        const screen = this.worldToScreen(worldX, worldY)
        const screenWidth = worldWidth * this.getPixelsPerDay()

        return !(screen.x + screenWidth < -margin ||
            screen.x > this.screenDimensions.width + margin ||
            screen.y + worldHeight < -margin ||
            screen.y > this.screenDimensions.height + margin)
    }

    // Get visible world bounds
    getVisibleWorldBounds(): { left: number; right: number; top: number; bottom: number } {
        const ppd = this.getPixelsPerDay()
        const leftWorldDays = this.viewport.x + (0 - this.leftMargin) / ppd
        const rightWorldDays = this.viewport.x + (this.screenDimensions.width - this.leftMargin) / ppd

        return {
            left: leftWorldDays,
            right: rightWorldDays,
            top: this.viewport.y,
            bottom: this.viewport.y + this.screenDimensions.height
        }
    }

    // Pan viewport by pixel amounts
    pan(deltaX: number, deltaY: number): ViewportState {
        const ppd = this.getPixelsPerDay()
        const newViewport = {
            x: this.viewport.x - deltaX / ppd,
            y: this.viewport.y - deltaY,
            zoom: this.viewport.zoom
        }

        this.viewport = this.clampViewport(newViewport)
        return this.getViewport()
    }

    // Zoom at a specific screen point
    zoomAtPoint(zoomFactor: number, screenX: number, _screenY: number): ViewportState {
        const newZoom = Math.max(0.1, Math.min(20, this.viewport.zoom * zoomFactor))
        const newViewport = applyAnchorZoom(
            this.viewport,
            newZoom,
            screenX,
            this.leftMargin,
            TIMELINE.DAY_WIDTH
        )

        this.viewport = this.clampViewport(newViewport)
        return this.getViewport()
    }

    // Zoom to fit content with padding
    fitContent(
        contentBounds: { minX: number; maxX: number; minY: number; maxY: number },
        padding: number = 50
    ): ViewportState {
        const { minX, maxX, minY, maxY } = contentBounds
        const contentWidth = maxX - minX
        const contentHeight = maxY - minY

        // Calculate zoom to fit content
        const availableWidth = this.screenDimensions.width - this.leftMargin - padding * 2
        const availableHeight = this.screenDimensions.height - padding * 2

        const zoomX = availableWidth / (contentWidth * TIMELINE.DAY_WIDTH)
        const zoomY = availableHeight / contentHeight
        const zoom = Math.min(zoomX, zoomY, 2) // Cap at 2x zoom

        // Center content
        const x = minX - (availableWidth / (TIMELINE.DAY_WIDTH * zoom) - contentWidth) / 2
        const y = minY - (availableHeight / zoom - contentHeight) / 2

        const newViewport = this.clampViewport({ x, y, zoom })
        this.viewport = newViewport
        return this.getViewport()
    }

    // Smooth viewport animation
    animateTo(
        targetViewport: ViewportState,
        duration: number,
        onUpdate: (viewport: ViewportState) => void,
        onComplete?: () => void
    ): () => void {
        const startViewport = { ...this.viewport }
        const startTime = performance.now()
        let animationId: number

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Easing function (ease-out cubic)
            const eased = 1 - Math.pow(1 - progress, 3)

            const interpolated: ViewportState = {
                x: startViewport.x + (targetViewport.x - startViewport.x) * eased,
                y: startViewport.y + (targetViewport.y - startViewport.y) * eased,
                zoom: startViewport.zoom + (targetViewport.zoom - startViewport.zoom) * eased
            }

            this.viewport = this.clampViewport(interpolated)
            onUpdate(this.getViewport())

            if (progress < 1) {
                animationId = requestAnimationFrame(animate)
            } else {
                onComplete?.()
            }
        }

        animationId = requestAnimationFrame(animate)

        // Return cancel function
        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId)
            }
        }
    }

    // Snap viewport to grid boundaries
    snapToGrid(): ViewportState {
        const ppd = this.getPixelsPerDay()
        const newViewport = {
            x: Math.round(this.viewport.x * ppd) / ppd,
            y: Math.round(this.viewport.y),
            zoom: this.viewport.zoom
        }

        this.viewport = newViewport
        return this.getViewport()
    }

    // Clamp viewport to valid ranges
    private clampViewport(viewport: ViewportState): ViewportState {
        return {
            x: Math.max(0, viewport.x),
            y: Math.max(0, viewport.y),
            zoom: Math.max(0.1, Math.min(20, viewport.zoom))
        }
    }

    // Get viewport center in world coordinates
    getCenter(): { x: number; y: number } {
        const bounds = this.getVisibleWorldBounds()
        return {
            x: (bounds.left + bounds.right) / 2,
            y: (bounds.top + bounds.bottom) / 2
        }
    }

    // Check if viewport has changed significantly (for optimization)
    hasSignificantChange(other: ViewportState, threshold: number = 0.1): boolean {
        return Math.abs(this.viewport.x - other.x) > threshold ||
            Math.abs(this.viewport.y - other.y) > threshold ||
            Math.abs(this.viewport.zoom - other.zoom) > threshold * 0.1
    }

    // Calculate optimal zoom level for given content
    calculateOptimalZoom(contentWidth: number, padding: number = 50): number {
        const availableWidth = this.screenDimensions.width - this.leftMargin - padding * 2
        const zoom = availableWidth / (contentWidth * TIMELINE.DAY_WIDTH)
        return Math.max(0.1, Math.min(20, zoom))
    }

    // Transform a point from viewport space to container space
    transformPoint(x: number, y: number): { x: number; y: number } {
        return {
            x: x * this.viewport.zoom - this.viewport.x * this.viewport.zoom,
            y: y - this.viewport.y
        }
    }
}
