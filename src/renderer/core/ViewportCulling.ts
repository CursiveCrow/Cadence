import { ViewportState } from '../../state/ui'
import { UI_CONSTANTS } from '../../config/ui'
import { dayIndexFromISO, TIMELINE } from '../utils'
import { PROJECT_START_DATE } from '../../config'
import type { Task, Dependency, Staff } from '../../types'

// Viewport bounds for culling calculations
export interface ViewportBounds {
    left: number    // World X coordinate (days)
    right: number   // World X coordinate (days)
    top: number     // World Y coordinate (pixels)
    bottom: number  // World Y coordinate (pixels)
}

// Bounding box interface for objects that can be culled
export interface BoundingBox {
    x: number       // World X coordinate
    y: number       // World Y coordinate  
    width: number   // Width in world units
    height: number  // Height in world units
}

// Culling result interface
export interface CullingResult<T> {
    visible: T[]
    culled: T[]
    stats: {
        totalCount: number
        visibleCount: number
        culledCount: number
        cullRatio: number
    }
}

export class ViewportCulling {
    private margin: number

    constructor(margin: number = UI_CONSTANTS.VIEWPORT.CULLING_MARGIN) {
        this.margin = margin
    }

    // Calculate viewport bounds in world coordinates
    calculateViewportBounds(
        viewport: ViewportState,
        screenDimensions: { width: number; height: number }
    ): ViewportBounds {
        const { width, height } = screenDimensions
        const pixelsPerDay = TIMELINE.DAY_WIDTH * viewport.zoom

        // Calculate world bounds with margin for smoother culling
        const leftWorldDays = viewport.x - this.margin / pixelsPerDay
        const rightWorldDays = viewport.x + (width + this.margin) / pixelsPerDay
        const topWorldY = viewport.y - this.margin
        const bottomWorldY = viewport.y + height + this.margin

        return {
            left: leftWorldDays,
            right: rightWorldDays,
            top: topWorldY,
            bottom: bottomWorldY
        }
    }

    // Check if a bounding box intersects with viewport bounds
    isVisible(boundingBox: BoundingBox, viewportBounds: ViewportBounds): boolean {
        const { x, y, width, height } = boundingBox
        const { left, right, top, bottom } = viewportBounds

        // Check for intersection using separating axis theorem
        return !(x + width < left ||   // Box is to the left of viewport
            x > right ||          // Box is to the right of viewport  
            y + height < top ||   // Box is above viewport
            y > bottom)           // Box is below viewport
    }

    // Cull tasks based on viewport visibility
    cullTasks(
        tasks: Task[],
        viewport: ViewportState,
        screenDimensions: { width: number; height: number },
        staffBlocks: Array<{ id: string; yTop: number; yBottom: number; lineSpacing: number }>
    ): CullingResult<Task> {
        const viewportBounds = this.calculateViewportBounds(viewport, screenDimensions)
        const visible: Task[] = []
        const culled: Task[] = []

        for (const task of tasks) {
            const boundingBox = this.getTaskBoundingBox(task, staffBlocks)

            if (boundingBox && this.isVisible(boundingBox, viewportBounds)) {
                visible.push(task)
            } else {
                culled.push(task)
            }
        }

        return {
            visible,
            culled,
            stats: {
                totalCount: tasks.length,
                visibleCount: visible.length,
                culledCount: culled.length,
                cullRatio: tasks.length > 0 ? culled.length / tasks.length : 0
            }
        }
    }

    // Cull dependencies based on their connected tasks
    cullDependencies(
        dependencies: Dependency[],
        visibleTasks: Task[],
        _viewport: ViewportState,
        _screenDimensions: { width: number; height: number }
    ): CullingResult<Dependency> {
        const visibleTaskIds = new Set(visibleTasks.map(task => task.id))
        const visible: Dependency[] = []
        const culled: Dependency[] = []

        for (const dependency of dependencies) {
            // Include dependency if either connected task is visible
            const srcVisible = visibleTaskIds.has(dependency.srcTaskId)
            const dstVisible = visibleTaskIds.has(dependency.dstTaskId)

            if (srcVisible || dstVisible) {
                visible.push(dependency)
            } else {
                culled.push(dependency)
            }
        }

        return {
            visible,
            culled,
            stats: {
                totalCount: dependencies.length,
                visibleCount: visible.length,
                culledCount: culled.length,
                cullRatio: dependencies.length > 0 ? culled.length / dependencies.length : 0
            }
        }
    }

    // Get bounding box for a task in world coordinates
    private getTaskBoundingBox(
        task: Task,
        staffBlocks: Array<{ id: string; yTop: number; yBottom: number; lineSpacing: number }>
    ): BoundingBox | null {
        const staffBlock = staffBlocks.find(block => block.id === task.staffId)
        if (!staffBlock) return null

        // Calculate task position in world coordinates
        const dayIndex = dayIndexFromISO(task.startDate, PROJECT_START_DATE)
        const lineStep = staffBlock.lineSpacing / 2
        const centerY = staffBlock.yTop + task.staffLine * lineStep
        const noteHeight = this.calculateNoteHeight(staffBlock.lineSpacing)

        return {
            x: dayIndex,                           // Days from project start
            y: centerY - noteHeight / 2,          // Top Y position
            width: task.durationDays,              // Duration in days
            height: noteHeight                     // Height in pixels
        }
    }

    // Level-of-detail (LOD) culling - reduce detail for distant objects
    calculateLevelOfDetail(
        viewport: ViewportState,
        boundingBox: BoundingBox
    ): 'high' | 'medium' | 'low' {
        const zoom = viewport.zoom
        const pixelWidth = boundingBox.width * TIMELINE.DAY_WIDTH * zoom

        if (pixelWidth > 50) {
            return 'high'   // Show full detail
        } else if (pixelWidth > 10) {
            return 'medium' // Show simplified detail
        } else {
            return 'low'    // Show minimal detail or placeholder
        }
    }

    // Frustum culling for 3D-style effects (future extension)
    cullWithFrustum(
        objects: Array<BoundingBox & { id: string }>,
        viewportBounds: ViewportBounds,
        frustumDepth: number = 100
    ): CullingResult<BoundingBox & { id: string }> {
        const visible: Array<BoundingBox & { id: string }> = []
        const culled: Array<BoundingBox & { id: string }> = []

        for (const obj of objects) {
            // Extended culling with depth consideration for 3D effects
            const inFrustum = this.isVisible(obj, viewportBounds) &&
                Math.abs(obj.y - viewportBounds.top) < frustumDepth

            if (inFrustum) {
                visible.push(obj)
            } else {
                culled.push(obj)
            }
        }

        return {
            visible,
            culled,
            stats: {
                totalCount: objects.length,
                visibleCount: visible.length,
                culledCount: culled.length,
                cullRatio: objects.length > 0 ? culled.length / objects.length : 0
            }
        }
    }

    // Adaptive margin based on zoom level
    getAdaptiveMargin(zoom: number): number {
        // Increase margin at higher zoom levels to account for larger pixel sizes
        const baseMargin = this.margin
        const zoomFactor = Math.max(1, zoom)
        return baseMargin * zoomFactor
    }

    // Smart culling that considers object importance
    cullWithPriority<T extends { id: string }>(
        objects: T[],
        getBoundingBox: (obj: T) => BoundingBox | null,
        getPriority: (obj: T) => number, // Higher numbers = higher priority
        viewport: ViewportState,
        screenDimensions: { width: number; height: number },
        maxVisible: number = 1000
    ): CullingResult<T> {
        const viewportBounds = this.calculateViewportBounds(viewport, screenDimensions)

        // First pass: basic visibility culling
        const potentiallyVisible: Array<T & { priority: number; boundingBox: BoundingBox }> = []
        const culled: T[] = []

        for (const obj of objects) {
            const boundingBox = getBoundingBox(obj)
            if (boundingBox && this.isVisible(boundingBox, viewportBounds)) {
                potentiallyVisible.push({
                    ...obj,
                    priority: getPriority(obj),
                    boundingBox
                })
            } else {
                culled.push(obj)
            }
        }

        // Second pass: priority-based culling if too many objects
        let visible: Array<T & { priority: number; boundingBox: BoundingBox }>
        if (potentiallyVisible.length <= maxVisible) {
            visible = potentiallyVisible
        } else {
            // Sort by priority and take top N
            potentiallyVisible.sort((a, b) => b.priority - a.priority)
            visible = potentiallyVisible.slice(0, maxVisible)
            culled.push(...potentiallyVisible.slice(maxVisible).map(({ priority, boundingBox, ...obj }) => obj as unknown as T))
        }

        return {
            visible: visible.map((item) => {
                const { priority, boundingBox, ...obj } = item
                return obj as unknown as T
            }),
            culled,
            stats: {
                totalCount: objects.length,
                visibleCount: visible.length,
                culledCount: culled.length,
                cullRatio: objects.length > 0 ? culled.length / objects.length : 0
            }
        }
    }

    // Spatial indexing for improved culling performance (quadtree-like)
    private spatialIndex = new Map<string, Array<BoundingBox & { id: string }>>()

    updateSpatialIndex<T extends { id: string }>(
        objects: T[],
        getBoundingBox: (obj: T) => BoundingBox | null,
        cellSize: number = 100 // World units per cell
    ) {
        this.spatialIndex.clear()

        for (const obj of objects) {
            const boundingBox = getBoundingBox(obj)
            if (!boundingBox) continue

            const cellX = Math.floor(boundingBox.x / cellSize)
            const cellY = Math.floor(boundingBox.y / cellSize)
            const cellKey = `${cellX},${cellY}`

            if (!this.spatialIndex.has(cellKey)) {
                this.spatialIndex.set(cellKey, [])
            }

            this.spatialIndex.get(cellKey)!.push({ ...boundingBox, id: obj.id })
        }
    }

    // Fast culling using spatial index
    cullWithSpatialIndex(
        viewportBounds: ViewportBounds,
        cellSize: number = 100
    ): Array<{ id: string }> {
        const visible: Array<{ id: string }> = []

        const leftCell = Math.floor(viewportBounds.left / cellSize)
        const rightCell = Math.ceil(viewportBounds.right / cellSize)
        const topCell = Math.floor(viewportBounds.top / cellSize)
        const bottomCell = Math.ceil(viewportBounds.bottom / cellSize)

        for (let x = leftCell; x <= rightCell; x++) {
            for (let y = topCell; y <= bottomCell; y++) {
                const cellKey = `${x},${y}`
                const cellObjects = this.spatialIndex.get(cellKey) || []

                for (const obj of cellObjects) {
                    if (this.isVisible(obj, viewportBounds)) {
                        visible.push({ id: obj.id })
                    }
                }
            }
        }

        return visible
    }

    // Helper method to calculate note height (matches TaskRenderer logic)
    private calculateNoteHeight(lineSpacing: number): number {
        const raw = Math.round(lineSpacing * UI_CONSTANTS.TASK.HEIGHT_RATIO)
        return Math.max(UI_CONSTANTS.TASK.MIN_HEIGHT, Math.min(UI_CONSTANTS.TASK.MAX_HEIGHT, raw))
    }

    // Performance metrics for culling effectiveness
    getPerformanceMetrics(): {
        averageCullRatio: number
        spatialIndexSize: number
        memoryUsage: number // Estimated
    } {
        let totalCells = 0
        let totalObjects = 0

        for (const cellObjects of this.spatialIndex.values()) {
            totalCells++
            totalObjects += cellObjects.length
        }

        return {
            averageCullRatio: totalCells > 0 ? 1 - (totalObjects / (totalCells * 10)) : 0, // Rough estimate
            spatialIndexSize: totalCells,
            memoryUsage: totalObjects * 64 // Rough bytes estimate per object
        }
    }

    // Clear spatial index (call when data changes significantly)
    clearSpatialIndex() {
        this.spatialIndex.clear()
    }
}

// Specialized culling utilities for different object types

export class TaskCuller {
    private culling: ViewportCulling

    constructor(margin?: number) {
        this.culling = new ViewportCulling(margin)
    }

    cull(
        tasks: Task[],
        viewport: ViewportState,
        screenDimensions: { width: number; height: number },
        staffBlocks: Array<{ id: string; yTop: number; yBottom: number; lineSpacing: number }>
    ): CullingResult<Task> {
        return this.culling.cullTasks(tasks, viewport, screenDimensions, staffBlocks)
    }

    // Cull with level of detail
    cullWithLOD(
        tasks: Task[],
        viewport: ViewportState,
        screenDimensions: { width: number; height: number },
        staffBlocks: Array<{ id: string; yTop: number; yBottom: number; lineSpacing: number }>
    ): {
        high: Task[]
        medium: Task[]
        low: Task[]
        culled: Task[]
    } {
        const viewportBounds = this.culling.calculateViewportBounds(viewport, screenDimensions)
        const high: Task[] = []
        const medium: Task[] = []
        const low: Task[] = []
        const culled: Task[] = []

        for (const task of tasks) {
            const staffBlock = staffBlocks.find(block => block.id === task.staffId)
            if (!staffBlock) {
                culled.push(task)
                continue
            }

            const dayIndex = dayIndexFromISO(task.startDate, PROJECT_START_DATE)
            const lineStep = staffBlock.lineSpacing / 2
            const centerY = staffBlock.yTop + task.staffLine * lineStep
            const noteHeight = Math.round(staffBlock.lineSpacing * 0.8)

            const boundingBox: BoundingBox = {
                x: dayIndex,
                y: centerY - noteHeight / 2,
                width: task.durationDays,
                height: noteHeight
            }

            if (this.culling.isVisible(boundingBox, viewportBounds)) {
                const lod = this.culling.calculateLevelOfDetail(viewport, boundingBox)

                switch (lod) {
                    case 'high':
                        high.push(task)
                        break
                    case 'medium':
                        medium.push(task)
                        break
                    case 'low':
                        low.push(task)
                        break
                }
            } else {
                culled.push(task)
            }
        }

        return { high, medium, low, culled }
    }
}

export class DependencyCuller {
    private culling: ViewportCulling

    constructor(margin?: number) {
        this.culling = new ViewportCulling(margin)
    }

    cull(
        dependencies: Dependency[],
        visibleTasks: Task[],
        viewport: ViewportState,
        screenDimensions: { width: number; height: number }
    ): CullingResult<Dependency> {
        return this.culling.cullDependencies(dependencies, visibleTasks, viewport, screenDimensions)
    }

    // Advanced dependency culling with curve bounds checking
    cullWithCurveBounds(
        dependencies: Dependency[],
        taskLayout: Map<string, { x: number; y: number; width: number; height: number }>,
        viewport: ViewportState,
        screenDimensions: { width: number; height: number }
    ): CullingResult<Dependency> {
        const viewportBounds = this.culling.calculateViewportBounds(viewport, screenDimensions)
        const visible: Dependency[] = []
        const culled: Dependency[] = []

        for (const dependency of dependencies) {
            const srcLayout = taskLayout.get(dependency.srcTaskId)
            const dstLayout = taskLayout.get(dependency.dstTaskId)

            if (!srcLayout || !dstLayout) {
                culled.push(dependency)
                continue
            }

            // Calculate bounding box that encompasses the entire dependency curve
            const curveBoundingBox = this.calculateCurveBoundingBox(srcLayout, dstLayout)

            if (this.culling.isVisible(curveBoundingBox, viewportBounds)) {
                visible.push(dependency)
            } else {
                culled.push(dependency)
            }
        }

        return {
            visible,
            culled,
            stats: {
                totalCount: dependencies.length,
                visibleCount: visible.length,
                culledCount: culled.length,
                cullRatio: dependencies.length > 0 ? culled.length / dependencies.length : 0
            }
        }
    }

    private calculateCurveBoundingBox(
        src: { x: number; y: number; width: number; height: number },
        dst: { x: number; y: number; width: number; height: number }
    ): BoundingBox {
        const x0 = src.x + src.width
        const y0 = src.y + src.height / 2
        const x1 = dst.x
        const y1 = dst.y + dst.height / 2

        // Control points for bezier curve
        const cx1 = x0 + Math.max(30, Math.abs(x1 - x0) * 0.4)
        const cx2 = x1 - Math.max(30, Math.abs(x1 - x0) * 0.4)

        // Calculate bounding box that encompasses curve and control points
        const minX = Math.min(x0, x1, cx1, cx2)
        const maxX = Math.max(x0, x1, cx1, cx2)
        const minY = Math.min(y0, y1) - 20 // Add some padding for curve height
        const maxY = Math.max(y0, y1) + 20

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        }
    }
}

// Global culling instances
export const taskCuller = new TaskCuller()
export const dependencyCuller = new DependencyCuller()

// Convenience function for complete scene culling
export function cullScene(
    data: { tasks: Task[]; dependencies: Dependency[]; staffs: Staff[] },
    viewport: ViewportState,
    screenDimensions: { width: number; height: number },
    staffBlocks: Array<{ id: string; yTop: number; yBottom: number; lineSpacing: number }>
) {
    // Cull tasks first
    const taskResult = taskCuller.cull(data.tasks, viewport, screenDimensions, staffBlocks)

    // Then cull dependencies based on visible tasks
    const dependencyResult = dependencyCuller.cull(
        data.dependencies,
        taskResult.visible,
        viewport,
        screenDimensions
    )

    return {
        tasks: taskResult,
        dependencies: dependencyResult,
        stats: {
            totalObjects: data.tasks.length + data.dependencies.length,
            culledObjects: taskResult.stats.culledCount + dependencyResult.stats.culledCount,
            overallCullRatio: (taskResult.stats.culledCount + dependencyResult.stats.culledCount) /
                (data.tasks.length + data.dependencies.length)
        }
    }
}
