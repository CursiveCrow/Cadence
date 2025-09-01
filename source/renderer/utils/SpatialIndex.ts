/**
 * SpatialIndex
 * Efficient spatial indexing for hit testing and collision detection
 */

export interface SpatialObject {
    id: string
    x: number
    y: number
    width: number
    height: number
    type: 'task' | 'dependency' | 'milestone' | 'staff'
    data?: any
}

export interface SpatialQuery {
    x: number
    y: number
    width?: number
    height?: number
}

/**
 * Spatial hash implementation for efficient hit testing
 */
export class SpatialIndex {
    private cellSize: number
    private cells: Map<string, Set<SpatialObject>>
    private objects: Map<string, SpatialObject>

    constructor(cellSize: number = 100) {
        this.cellSize = cellSize
        this.cells = new Map()
        this.objects = new Map()
    }

    /**
     * Get cell keys for a bounding box
     */
    private getCellsForBounds(x: number, y: number, width: number, height: number): string[] {
        const keys: string[] = []
        const startX = Math.floor(x / this.cellSize)
        const startY = Math.floor(y / this.cellSize)
        const endX = Math.floor((x + width) / this.cellSize)
        const endY = Math.floor((y + height) / this.cellSize)

        for (let cellX = startX; cellX <= endX; cellX++) {
            for (let cellY = startY; cellY <= endY; cellY++) {
                keys.push(`${cellX},${cellY}`)
            }
        }

        return keys
    }

    /**
     * Insert an object into the spatial index
     */
    insert(obj: SpatialObject): void {
        // Remove if already exists
        if (this.objects.has(obj.id)) {
            this.remove(obj.id)
        }

        // Store object
        this.objects.set(obj.id, obj)

        // Add to cells
        const keys = this.getCellsForBounds(obj.x, obj.y, obj.width, obj.height)
        for (const key of keys) {
            if (!this.cells.has(key)) {
                this.cells.set(key, new Set())
            }
            this.cells.get(key)!.add(obj)
        }
    }

    /**
     * Remove an object from the spatial index
     */
    remove(id: string): void {
        const obj = this.objects.get(id)
        if (!obj) return

        const keys = this.getCellsForBounds(obj.x, obj.y, obj.width, obj.height)
        for (const key of keys) {
            const cell = this.cells.get(key)
            if (cell) {
                cell.delete(obj)
                if (cell.size === 0) {
                    this.cells.delete(key)
                }
            }
        }

        this.objects.delete(id)
    }

    /**
     * Update an object's position
     */
    update(id: string, x: number, y: number, width?: number, height?: number): void {
        const obj = this.objects.get(id)
        if (!obj) return

        // Create updated object
        const updated: SpatialObject = {
            ...obj,
            x,
            y,
            width: width ?? obj.width,
            height: height ?? obj.height
        }

        // Reinsert (handles removal and insertion)
        this.insert(updated)
    }

    /**
     * Query objects at a point
     */
    queryPoint(x: number, y: number): SpatialObject[] {
        return this.query({ x, y, width: 1, height: 1 })
    }

    /**
     * Query objects in a rectangle
     */
    query(bounds: SpatialQuery): SpatialObject[] {
        const width = bounds.width ?? 1
        const height = bounds.height ?? 1
        const keys = this.getCellsForBounds(bounds.x, bounds.y, width, height)
        const candidates = new Set<SpatialObject>()

        // Collect candidates from cells
        for (const key of keys) {
            const cell = this.cells.get(key)
            if (cell) {
                for (const obj of cell) {
                    candidates.add(obj)
                }
            }
        }

        // Filter by actual intersection
        const result: SpatialObject[] = []
        for (const obj of candidates) {
            if (this.intersects(bounds.x, bounds.y, width, height, obj)) {
                result.push(obj)
            }
        }

        return result
    }

    /**
     * Check if two rectangles intersect
     */
    private intersects(
        x1: number,
        y1: number,
        w1: number,
        h1: number,
        obj: SpatialObject
    ): boolean {
        return !(
            x1 > obj.x + obj.width ||
            x1 + w1 < obj.x ||
            y1 > obj.y + obj.height ||
            y1 + h1 < obj.y
        )
    }

    /**
     * Get nearest object to a point
     */
    nearest(x: number, y: number, maxDistance?: number): SpatialObject | null {
        let nearest: SpatialObject | null = null
        let minDistance = maxDistance ?? Infinity

        for (const obj of this.objects.values()) {
            const centerX = obj.x + obj.width / 2
            const centerY = obj.y + obj.height / 2
            const distance = Math.sqrt(
                Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
            )

            if (distance < minDistance) {
                minDistance = distance
                nearest = obj
            }
        }

        return nearest
    }

    /**
     * Get objects by type
     */
    getByType(type: SpatialObject['type']): SpatialObject[] {
        const result: SpatialObject[] = []
        for (const obj of this.objects.values()) {
            if (obj.type === type) {
                result.push(obj)
            }
        }
        return result
    }

    /**
     * Get object by ID
     */
    get(id: string): SpatialObject | undefined {
        return this.objects.get(id)
    }

    /**
     * Check if object exists
     */
    has(id: string): boolean {
        return this.objects.has(id)
    }

    /**
     * Get all objects
     */
    all(): SpatialObject[] {
        return Array.from(this.objects.values())
    }

    /**
     * Get viewport query (visible objects)
     */
    viewportQuery(viewport: {
        x: number
        y: number
        width: number
        height: number
    }): SpatialObject[] {
        return this.query(viewport)
    }

    /**
     * Clear all objects
     */
    clear(): void {
        this.cells.clear()
        this.objects.clear()
    }

    /**
     * Get statistics
     */
    getStats(): {
        objectCount: number
        cellCount: number
        avgObjectsPerCell: number
    } {
        const objectCount = this.objects.size
        const cellCount = this.cells.size

        let totalObjectsInCells = 0
        for (const cell of this.cells.values()) {
            totalObjectsInCells += cell.size
        }

        return {
            objectCount,
            cellCount,
            avgObjectsPerCell: cellCount > 0 ? totalObjectsInCells / cellCount : 0
        }
    }

    /**
     * Optimize cell size based on current distribution
     */
    optimizeCellSize(): number {
        if (this.objects.size === 0) return this.cellSize

        // Calculate average object size
        let totalWidth = 0
        let totalHeight = 0
        for (const obj of this.objects.values()) {
            totalWidth += obj.width
            totalHeight += obj.height
        }

        const avgWidth = totalWidth / this.objects.size
        const avgHeight = totalHeight / this.objects.size
        const avgSize = Math.max(avgWidth, avgHeight)

        // Optimal cell size is 2-3x average object size
        const optimalSize = Math.round(avgSize * 2.5)

        // Rebuild if significantly different
        if (Math.abs(optimalSize - this.cellSize) > this.cellSize * 0.5) {
            this.rebuild(optimalSize)
        }

        return optimalSize
    }

    /**
     * Rebuild index with new cell size
     */
    private rebuild(newCellSize: number): void {
        const objects = Array.from(this.objects.values())
        this.cells.clear()
        this.objects.clear()
        this.cellSize = newCellSize

        for (const obj of objects) {
            this.insert(obj)
        }
    }
}
