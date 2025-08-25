/**
 * Spatial Index for hit-testing and viewport culling
 * As specified in Design.md for 60fps performance
 */

export interface SpatialObject {
  id: string
  x: number
  y: number
  width: number
  height: number
  type: 'task' | 'dependency' | 'milestone'
}

export interface SpatialQuery {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Spatial Hash implementation for fast spatial queries
 * Used for hit-testing and viewport culling
 */
export class SpatialHash {
  private cellSize: number
  private cells: Map<string, Set<SpatialObject>>

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize
    this.cells = new Map()
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize)
    const cellY = Math.floor(y / this.cellSize)
    return `${cellX},${cellY}`
  }

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

  insert(obj: SpatialObject): void {
    const keys = this.getCellsForBounds(obj.x, obj.y, obj.width, obj.height)
    
    for (const key of keys) {
      if (!this.cells.has(key)) {
        this.cells.set(key, new Set())
      }
      this.cells.get(key)!.add(obj)
    }
  }

  remove(obj: SpatialObject): void {
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
  }

  query(bounds: SpatialQuery): SpatialObject[] {
    const keys = this.getCellsForBounds(bounds.x, bounds.y, bounds.width, bounds.height)
    const candidates = new Set<SpatialObject>()
    
    for (const key of keys) {
      const cell = this.cells.get(key)
      if (cell) {
        for (const obj of cell) {
          candidates.add(obj)
        }
      }
    }

    // Filter candidates to only include objects that actually intersect
    const result: SpatialObject[] = []
    for (const obj of candidates) {
      if (this.intersects(bounds, obj)) {
        result.push(obj)
      }
    }

    return result
  }

  private intersects(a: SpatialQuery, b: SpatialObject): boolean {
    return !(
      a.x > b.x + b.width ||
      a.x + a.width < b.x ||
      a.y > b.y + b.height ||
      a.y + a.height < b.y
    )
  }

  clear(): void {
    this.cells.clear()
  }

  /**
   * Get objects at a specific point (for hit-testing)
   */
  pointQuery(x: number, y: number): SpatialObject[] {
    return this.query({ x, y, width: 1, height: 1 })
  }

  /**
   * Get objects within viewport (for culling)
   */
  viewportQuery(viewport: { x: number; y: number; width: number; height: number }): SpatialObject[] {
    return this.query(viewport)
  }
}
