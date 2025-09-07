import { Graphics, Text, Container } from 'pixi.js'
import { UI_CONSTANTS } from '../../config/ui'

// Generic object pool interface
interface Pool<T> {
    acquire(): T
    release(item: T): void
    clear(): void
    size(): number
    activeCount(): number
}

// Base object pool implementation
class BasePool<T> implements Pool<T> {
    protected pool: T[] = []
    protected active = new Set<T>()
    protected maxSize: number
    protected factory: () => T
    protected resetFn?: (item: T) => void
    protected destroyFn?: (item: T) => void

    constructor(
        factory: () => T,
        maxSize: number = 50,
        resetFn?: (item: T) => void,
        destroyFn?: (item: T) => void
    ) {
        this.factory = factory
        this.maxSize = maxSize
        this.resetFn = resetFn
        this.destroyFn = destroyFn
    }

    acquire(): T {
        let item = this.pool.pop()

        if (!item) {
            item = this.factory()
        } else {
            this.resetFn?.(item)
        }

        this.active.add(item)
        return item
    }

    release(item: T): void {
        if (!this.active.has(item)) return

        this.active.delete(item)

        if (this.pool.length < this.maxSize) {
            this.pool.push(item)
        } else {
            // Pool is full, destroy the item
            this.destroyFn?.(item)
        }
    }

    clear(): void {
        // Destroy all pooled items
        for (const item of this.pool) {
            this.destroyFn?.(item)
        }

        // Destroy all active items
        for (const item of this.active) {
            this.destroyFn?.(item)
        }

        this.pool = []
        this.active.clear()
    }

    size(): number {
        return this.pool.length
    }

    activeCount(): number {
        return this.active.size
    }

    // Get pool statistics
    getStats() {
        return {
            pooled: this.pool.length,
            active: this.active.size,
            total: this.pool.length + this.active.size,
            maxSize: this.maxSize
        }
    }
}

// Specialized pools for different PixiJS object types

class GraphicsPool extends BasePool<Graphics> {
    constructor(maxSize: number = UI_CONSTANTS.PERFORMANCE.MAX_CACHED_TASKS) {
        super(
            () => new Graphics(),
            maxSize,
            (graphics) => {
                // Reset graphics state
                graphics.clear()
                graphics.alpha = 1
                graphics.visible = true
                graphics.x = 0
                graphics.y = 0
                graphics.scale.set(1)
                graphics.rotation = 0
                graphics.removeFromParent()
            },
            (graphics) => {
                try {
                    graphics.destroy({ children: true })
                } catch (err) {
                    if (import.meta?.env?.DEV) console.debug('[GraphicsPool] destroy error', err)
                }
            }
        )
    }
}

class TextPool extends BasePool<Text> {
    constructor(maxSize: number = 100) {
        super(
            () => new Text(),
            maxSize,
            (text) => {
                // Reset text state
                text.text = ''
                text.alpha = 1
                text.visible = true
                text.x = 0
                text.y = 0
                text.scale.set(1)
                text.rotation = 0
                text.removeFromParent()
            },
            (text) => {
                try {
                    text.destroy()
                } catch (err) {
                    if (import.meta?.env?.DEV) console.debug('[TextPool] destroy error', err)
                }
            }
        )
    }
}

class ContainerPool extends BasePool<Container> {
    constructor(maxSize: number = 50) {
        super(
            () => new Container(),
            maxSize,
            (container) => {
                // Reset container state
                container.removeChildren()
                container.alpha = 1
                container.visible = true
                container.x = 0
                container.y = 0
                container.scale.set(1)
                container.rotation = 0
                container.removeFromParent()
            },
            (container) => {
                try {
                    container.destroy({ children: true })
                } catch (err) {
                    if (import.meta?.env?.DEV) console.debug('[ContainerPool] destroy error', err)
                }
            }
        )
    }
}

// Object pool manager for coordinating multiple pools
export class ObjectPoolManager {
    private pools: Map<string, Pool<any>> = new Map()
    private graphics: GraphicsPool
    private text: TextPool
    private container: ContainerPool

    constructor() {
        // Initialize standard pools
        this.graphics = new GraphicsPool()
        this.text = new TextPool()
        this.container = new ContainerPool()

        this.pools.set('graphics', this.graphics)
        this.pools.set('text', this.text)
        this.pools.set('container', this.container)
    }

    // Acquire objects from pools
    acquireGraphics(): Graphics {
        return this.graphics.acquire()
    }

    acquireText(): Text {
        return this.text.acquire()
    }

    acquireContainer(): Container {
        return this.container.acquire()
    }

    // Release objects back to pools
    releaseGraphics(graphics: Graphics): void {
        this.graphics.release(graphics)
    }

    releaseText(text: Text): void {
        this.text.release(text)
    }

    releaseContainer(container: Container): void {
        this.container.release(container)
    }

    // Bulk operations for containers with children
    releaseContainerWithChildren(container: Container): void {
        // Release all children first
        const children = container.removeChildren()
        for (const child of children) {
            if (child instanceof Graphics) {
                this.releaseGraphics(child)
            } else if (child instanceof Text) {
                this.releaseText(child)
            } else if (child instanceof Container) {
                this.releaseContainerWithChildren(child) // Recursive
            }
            // Other types (Sprite, etc.) are not pooled and will be garbage collected
        }

        // Release the container itself
        this.releaseContainer(container)
    }

    // Create a graphics object with common setup
    createStyledGraphics(style?: {
        fillColor?: number
        fillAlpha?: number
        strokeColor?: number
        strokeWidth?: number
        strokeAlpha?: number
    }): Graphics {
        const graphics = this.acquireGraphics()

        if (style) {
            if (style.fillColor !== undefined) {
                graphics.rect(0, 0, 1, 1) // Placeholder rect
                graphics.fill({
                    color: style.fillColor,
                    alpha: style.fillAlpha ?? 1
                })
            }

            if (style.strokeColor !== undefined) {
                graphics.stroke({
                    color: style.strokeColor,
                    width: style.strokeWidth ?? 1,
                    alpha: style.strokeAlpha ?? 1
                })
            }
        }

        return graphics
    }

    // Create a text object with common setup
    createStyledText(
        text: string = '',
        style?: {
            fontSize?: number
            fontFamily?: string
            fontWeight?: string
            fill?: number
            alpha?: number
        }
    ): Text {
        const textObj = this.acquireText()
        textObj.text = text

        if (style) {
            const textStyle = textObj.style as any
            if (style.fontSize !== undefined) textStyle.fontSize = style.fontSize
            if (style.fontFamily !== undefined) textStyle.fontFamily = style.fontFamily
            if (style.fontWeight !== undefined) textStyle.fontWeight = style.fontWeight
            if (style.fill !== undefined) textStyle.fill = style.fill
            if (style.alpha !== undefined) textObj.alpha = style.alpha
        }

        return textObj
    }

    // Cleanup all pools
    clearAll(): void {
        for (const pool of this.pools.values()) {
            pool.clear()
        }
    }

    // Get statistics for all pools
    getStats(): Record<string, { pooled: number; active: number; total: number; maxSize: number }> {
        const stats: Record<string, any> = {}

        for (const [name, pool] of this.pools) {
            if ('getStats' in pool && typeof pool.getStats === 'function') {
                stats[name] = pool.getStats()
            } else {
                stats[name] = {
                    pooled: pool.size(),
                    active: pool.activeCount(),
                    total: pool.size() + pool.activeCount(),
                    maxSize: 'unknown'
                }
            }
        }

        return stats
    }

    // Memory pressure handling
    handleMemoryPressure(): void {
        // Reduce pool sizes when memory is tight
        for (const pool of this.pools.values()) {
            if ('getStats' in pool && typeof pool.getStats === 'function') {
                const stats = (pool as any).getStats()
                if (stats.pooled > 10) {
                    // Release half of pooled objects
                    const toRelease = Math.floor(stats.pooled / 2)
                    for (let i = 0; i < toRelease; i++) {
                        const item = (pool as any).pool.pop()
                        if (item) {
                            (pool as any).destroyFn?.(item)
                        }
                    }
                }
            }
        }

        if (import.meta?.env?.DEV) {
            console.log('[ObjectPoolManager] Memory pressure handled, reduced pool sizes')
        }
    }

    // Automated pool maintenance
    performMaintenance(): void {
        const memoryCheck = this.checkMemoryUsage()

        if (memoryCheck.warning) {
            this.handleMemoryPressure()
        }

        // Log pool statistics in development
        if (import.meta?.env?.DEV) {
            const stats = this.getStats()
            console.debug('[ObjectPoolManager] Pool stats:', stats)
        }
    }

    private checkMemoryUsage(): { warning: boolean; heapUsed?: number } {
        try {
            if (typeof performance === 'object' && 'memory' in performance) {
                const memory = (performance as any).memory
                const heapUsed = memory.usedJSHeapSize
                const heapLimit = memory.totalJSHeapSize

                return {
                    heapUsed,
                    warning: heapUsed > heapLimit * 0.8 // Warning if using > 80% of heap
                }
            }
        } catch { }

        return { warning: false }
    }
}

// Global object pool manager instance
export const objectPool = new ObjectPoolManager()

// Convenience functions for common operations
export const PooledGraphics = {
    create: (style?: Parameters<ObjectPoolManager['createStyledGraphics']>[0]) =>
        objectPool.createStyledGraphics(style),
    release: (graphics: Graphics) => objectPool.releaseGraphics(graphics)
}

export const PooledText = {
    create: (text?: string, style?: Parameters<ObjectPoolManager['createStyledText']>[1]) =>
        objectPool.createStyledText(text, style),
    release: (text: Text) => objectPool.releaseText(text)
}

export const PooledContainer = {
    create: () => objectPool.acquireContainer(),
    release: (container: Container) => objectPool.releaseContainer(container),
    releaseWithChildren: (container: Container) => objectPool.releaseContainerWithChildren(container)
}

// Setup automatic maintenance (call this once during app initialization)
export function setupPoolMaintenance(intervalMs: number = 30000) {
    setInterval(() => {
        objectPool.performMaintenance()
    }, intervalMs)
}

// Emergency cleanup (call this when memory is critical)
export function emergencyCleanup() {
    objectPool.handleMemoryPressure()

    // Force garbage collection if available (non-standard)
    if (typeof (window as any).gc === 'function') {
        try {
            (window as any).gc()
        } catch {
            // Ignore if not available
        }
    }
}
