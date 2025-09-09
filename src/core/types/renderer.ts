// TypeScript interfaces for Renderer interactions
import type { Staff, Task, Dependency } from './index'

// Renderer action interfaces
export interface RendererActions {
    addTask: (task: Task) => void
    updateTask: (payload: { id: string; updates: Partial<Task> }) => void
    addDependency: (dep: any) => void
    addStaff: (staff: Staff) => void
    updateStaff: (payload: { id: string; updates: Partial<Staff> }) => void
    deleteStaff: (id: string) => void
    reorderStaffs: (payload: { staffId: string; newPosition: number }) => void
    setSelection: (ids: string[]) => void
}

// Renderer UI interaction interfaces
export interface RendererUIActions {
    setActions: (actions: Partial<RendererActions>) => void
    openStaffManager: () => void
    handleUIAction: (key: string) => void
    getHeaderHeight: () => number
    getSidebarWidth: () => number
    hitTestUI: (x: number, y: number) => string | null
    setVerticalScale: (scale: number) => void
}

// Renderer data interface
export interface RendererData {
    staffs: Staff[]
    tasks: Task[]
    dependencies: Dependency[]
    selection: string[]
}

// Renderer geometry interfaces
export interface StaffBlock {
    id: string
    yTop: number
    yBottom: number
    lineSpacing: number
}

export interface TaskRect {
    x: number
    y: number
    w: number
    h: number
}

export interface RendererMetrics {
    pxPerDay: number
    staffBlocks: StaffBlock[]
}

// Full Renderer interface combining all capabilities
export interface IRenderer {
    // Core rendering
    render(): void
    resize(): void

    // Data management
    setData(data: RendererData): void
    setViewport(viewport: { x: number; y: number; zoom: number }): void

    // Hit testing
    hitTest(x: number, y: number): string | null
    getTaskRect(taskId: string): TaskRect | null
    getMetrics(): RendererMetrics

    // Hover handling
    setHover(x: number | null, y: number | null): void

    // Preview rendering
    drawDragPreview(x: number, y: number, width: number, height: number): void
    clearPreview(): void
    drawDependencyPreview(src: TaskRect, dst: { x: number; y: number }): void
    clearDependencyPreview(): void

    // UI actions (extend with RendererUIActions)
    setActions(actions: Partial<RendererActions>): void
    openStaffManager(): void
    handleUIAction(key: string): void
    getHeaderHeight(): number
    getSidebarWidth(): number
    hitTestUI(x: number, y: number): string | null
    setVerticalScale(scale: number): void
}


// Event context interface for better type safety in event handlers
export interface EventContext {
    canvas: HTMLCanvasElement
    renderer: IRenderer
    viewportRef: { current: { x: number; y: number; zoom: number } }
}

// Specific event handler interfaces
export interface PointerEventHandler {
    (event: PointerEvent, context: EventContext): void | boolean
}

export interface WheelEventHandler {
    (event: WheelEvent, context: EventContext): void | boolean
}

export interface ResizeEventHandler {
    (event: Event, context: EventContext): void | boolean
}
