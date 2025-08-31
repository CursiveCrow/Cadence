import { Application, Container, Graphics, Rectangle } from 'pixi.js'
import { TimelineConfig, TaskLike, TaskLayout, TimelineSceneManager } from './scene'
import { drawNoteBodyPathAbsolute } from '../rendering/shapes'
import { DependencyType } from '@cadence/core'

type StaffLike = any

interface Layers {
  viewport: Container
  background: Container
  dependencies: Container
  tasks: Container
  selection: Container
  dragLayer: Container
}

interface Utils {
  getProjectStartDate: () => Date
  findNearestStaffLine: (y: number) => { staff: StaffLike; staffLine: number; centerY: number } | null
  snapXToDay: (x: number) => { snappedX: number; dayIndex: number }
  dayIndexToIsoDate: (dayIndex: number) => string
  // Optional: time-aware snapping provided by host (uses current zoom/scale)
  snapXToTime?: (x: number) => { snappedX: number; dayIndex: number }
}

interface DataProviders {
  getTasks: () => Record<string, TaskLike & { id: string; startDate: string; durationDays: number; staffId: string; staffLine: number }>
  getStaffs: () => StaffLike[]
  getDependencies: () => Record<string, any>
}

interface Callbacks {
  select: (ids: string[]) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  updateTask: (projectId: string, taskId: string, updates: Partial<any>) => void
  createDependency: (projectId: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }) => void
}

interface DnDOptions {
  app: Application
  layers: Layers
  scene: TimelineSceneManager
  config: TimelineConfig
  projectId: string
  utils: Utils
  data: DataProviders
  callbacks: Callbacks
  getDayWidth?: () => number
  getTaskHeight?: () => number
  getScaledConfig?: () => { TOP_MARGIN: number; STAFF_SPACING: number; STAFF_LINE_SPACING: number }
}

export class TimelineDnDController {
  private app: Application
  private layers: Layers
  private scene: TimelineSceneManager
  private config: TimelineConfig
  private projectId: string
  private utils: Utils
  private data: DataProviders
  private callbacks: Callbacks
  private getDayWidthFn?: () => number
  private getTaskHeightFn?: () => number
  private getScaledConfigFn?: () => { TOP_MARGIN: number; STAFF_SPACING: number; STAFF_LINE_SPACING: number }

  private dragPreview: Graphics | null = null
  private dependencyPreview: Graphics | null = null
  private backgroundHitRect: Graphics | null = null

  private state: {
    isDragging: boolean
    isResizing: boolean
    isCreatingDependency: boolean
    dragPending: boolean
    stageDownOnEmpty?: boolean
    draggedTaskId: string | null
    draggedTask: TaskLike | null
    dragStartX: number
    dragStartY: number
    offsetX: number
    offsetY: number
    clickLocalX?: number
    clickLocalY?: number
    initialDuration: number
    snapDayIndex?: number
    snapStaffId?: string
    snapStaffLine?: number
    snapSnappedX?: number
    dropProcessed?: boolean
    dependencySourceTaskId?: string | null
    dependencyHoverTargetId?: string | null
    minAllowedDayIndex?: number
    pointerDownOnStage?: boolean
  }

  constructor(opts: DnDOptions) {
    this.app = opts.app
    this.layers = opts.layers
    this.scene = opts.scene
    this.config = opts.config
    this.projectId = opts.projectId
    this.utils = opts.utils
    this.data = opts.data
    this.callbacks = opts.callbacks
    this.getDayWidthFn = opts.getDayWidth
    this.getTaskHeightFn = opts.getTaskHeight
    this.getScaledConfigFn = opts.getScaledConfig

    this.state = {
      isDragging: false,
      isResizing: false,
      isCreatingDependency: false,
      dragPending: false,
      stageDownOnEmpty: false,
      draggedTaskId: null,
      draggedTask: null,
      dragStartX: 0,
      dragStartY: 0,
      offsetX: 0,
      offsetY: 0,
      clickLocalX: undefined,
      clickLocalY: undefined,
      initialDuration: 0,
      snapDayIndex: undefined,
      snapStaffId: undefined,
      snapStaffLine: undefined,
      snapSnappedX: undefined,
      dropProcessed: false,
      dependencySourceTaskId: null,
      dependencyHoverTargetId: null,
      minAllowedDayIndex: undefined,
      pointerDownOnStage: false
    }

    this.attach()
  }

  destroy(): void {
    this.app.stage.off('globalpointermove', this.onMove)
    this.app.stage.off('globalpointerup', this.onUp)
    this.app.stage.off('pointerup', this.onUp)
    this.app.stage.off('pointerupoutside', this.onUp)
    this.app.stage.off('pointertap', this.onTap)
    this.app.stage.off('rightup', this.onUp)
    this.app.stage.off('rightupoutside', this.onUp)
    this.app.stage.off('pointerdown', this.onStageDown)
    this.layers.viewport.off('pointerdown', this.onStageDown as any)
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerup', this.onUpWindow as any, true)
      window.removeEventListener('mouseup', this.onUpWindow as any, true)
    }
    if (this.app.view) {
      (this.app.view as HTMLCanvasElement).removeEventListener('contextmenu', this.onContextMenu as any, true)
    }
  }

  registerTask(task: TaskLike, container: Container, layout: TaskLayout): void {
    container.eventMode = 'static'
    container.cursor = 'pointer'
    const taskHReg = this.getTaskHeightFn ? this.getTaskHeightFn() : this.config.TASK_HEIGHT
    container.hitArea = new Rectangle(0, 0, layout.width, taskHReg)

    if (!(container as any).__wired) {
      container.on('pointermove', (event) => {
        const localPos = container.toLocal((event as any).global)
        const relativeX = localPos.x
        // Use the latest layout from the scene to respect zoom/resize changes
        const currentLayout = this.scene.taskLayouts.get((task as any).id)
        const widthNow = currentLayout ? currentLayout.width : layout.width
        const isNearRightEdge = relativeX > widthNow - 10 && relativeX >= 0
        container.cursor = isNearRightEdge ? 'ew-resize' : 'grab'
      })
      container.on('pointerout', () => {
        if (!this.state.isDragging && !this.state.isResizing) container.cursor = 'pointer'
      })
      container.on('rightclick', (e) => { (e as any).preventDefault?.() })
      container.on('contextmenu', (e) => { (e as any).preventDefault?.() })
      container.on('pointerdown', (event) => this.onDownTask(event as any, task, container))
      container.on('rightdown', () => {
        this.state.isCreatingDependency = true
        this.state.dependencySourceTaskId = (task as any).id
        this.callbacks.onDragStart && this.callbacks.onDragStart()
      })
        ; (container as any).__wired = true
    }
  }

  private attach(): void {
    this.app.stage.eventMode = 'static'
    this.app.stage.off('globalpointermove', this.onMove)
    this.app.stage.off('globalpointerup', this.onUp)
    this.app.stage.off('pointerup', this.onUp)
    this.app.stage.off('pointerupoutside', this.onUp)
    this.app.stage.off('rightup', this.onUp)
    this.app.stage.off('rightupoutside', this.onUp)
    this.app.stage.on('globalpointermove', this.onMove)
    this.app.stage.on('globalpointerup', this.onUp)
    this.app.stage.on('pointerup', this.onUp)
    this.app.stage.on('pointerupoutside', this.onUp)
    this.app.stage.on('pointertap', this.onTap)
    this.app.stage.on('rightup', this.onUp)
    this.app.stage.on('rightupoutside', this.onUp)
    this.app.stage.on('pointerdown', this.onStageDown)
    this.layers.viewport.on('pointerdown', this.onStageDown as any)
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerup', this.onUpWindow as any, true)
      window.addEventListener('mouseup', this.onUpWindow as any, true)
    }
    if (this.app.view) {
      (this.app.view as HTMLCanvasElement).addEventListener('contextmenu', this.onContextMenu as any, true)
    }
    // Ensure a large, passive hit rectangle sits behind tasks to capture empty-space clicks reliably
    this.ensureBackgroundHitRect()
  }

  private ensureBackgroundHitRect(): void {
    if (!this.backgroundHitRect) {
      this.backgroundHitRect = new Graphics()
      // Transparent fill just to maintain a drawable; events use hitArea below
      this.backgroundHitRect.alpha = 0
        ; (this.backgroundHitRect as any).eventMode = 'none' // no overlay handlers; stage handles default behavior
      this.layers.background.addChildAt(this.backgroundHitRect, 0)
    }
    // Cover a very large area in viewport space so panning/zooming still finds empty clicks
    const w = Math.max(this.app.screen.width * 4, 10000)
    const h = Math.max(this.app.screen.height * 4, 10000)
    const x = -w / 2
    const y = -h / 2
    this.backgroundHitRect.clear()
    this.backgroundHitRect.rect(x, y, w, h)
    this.backgroundHitRect.fill({ color: 0x000000, alpha: 0 })
    this.backgroundHitRect.hitArea = new Rectangle(x, y, w, h)
  }

  // Removed overlay 'empty pointer up' logic per default-case behavior

  private onDownTask = (event: any, task: TaskLike, container: Container) => {
    const globalPos = event.global
    const viewportPos = this.layers.viewport ? this.layers.viewport.toLocal(globalPos) : globalPos
    const localPos = container.toLocal(globalPos)
    const layout = this.scene.taskLayouts.get((task as any).id) as TaskLayout | undefined
    const isRightButton = event.button === 2
    if (isRightButton) {
      this.state.isCreatingDependency = true
      this.state.dependencySourceTaskId = (task as any).id
      this.callbacks.onDragStart && this.callbacks.onDragStart()
      return
    }

    // Record the last selection pointer position in CSS pixels for UI popups
    try {
      const view = this.app.view as HTMLCanvasElement
      const rect = view.getBoundingClientRect()
      const cssX = rect.left + (globalPos.x * (rect.width / view.width))
      const cssY = rect.top + (globalPos.y * (rect.height / view.height))
        ; (window as any).__CADENCE_LAST_SELECT_POS = { x: Math.round(cssX), y: Math.round(cssY) }
    } catch { }
    this.callbacks.select([(task as any).id])
    const widthNow = layout ? layout.width : (container as any).hitArea?.width || 0
    const isNearRightEdge = localPos.x > widthNow - 10 && localPos.x >= 0
    if (isNearRightEdge) {
      this.state = {
        ...this.state,
        isDragging: false,
        isResizing: true,
        isCreatingDependency: false,
        dragPending: false,
        draggedTaskId: (task as any).id,
        draggedTask: task,
        dragStartX: globalPos.x,
        dragStartY: globalPos.y,
        offsetX: 0,
        offsetY: 0,
        clickLocalX: localPos.x,
        clickLocalY: localPos.y,
        dragPreview: null,
        dependencyPreview: null,
        initialDuration: (task as any).durationDays,
        dropProcessed: false,
        minAllowedDayIndex: this.computeMinAllowedDayIndex((task as any).id)
      } as any
      container.cursor = 'ew-resize'
      this.app.renderer?.events?.setCursor?.('ew-resize')
      this.callbacks.onDragStart && this.callbacks.onDragStart()
    } else {
      const taskY = (layout ? layout.centerY : (this.scene.taskLayouts.get((task as any).id)?.centerY ?? 0)) - this.config.TASK_HEIGHT / 2
      this.state = {
        ...this.state,
        isDragging: false,
        isResizing: false,
        isCreatingDependency: false,
        dragPending: true,
        draggedTaskId: (task as any).id,
        draggedTask: task,
        dragStartX: globalPos.x,
        dragStartY: globalPos.y,
        offsetX: viewportPos.x - (layout ? layout.startX : (this.scene.taskLayouts.get((task as any).id)?.startX ?? viewportPos.x)),
        offsetY: viewportPos.y - taskY,
        clickLocalX: localPos.x,
        clickLocalY: localPos.y,
        dragPreview: null,
        dependencyPreview: null,
        initialDuration: 0,
        dropProcessed: false,
        minAllowedDayIndex: this.computeMinAllowedDayIndex((task as any).id)
      } as any
      // Do not change cursors or call onDragStart until threshold exceeded
    }
  }

  private onMove = (event: any) => {
    const globalPos = event.global
    const localPos = this.layers.viewport ? this.layers.viewport.toLocal(globalPos) : globalPos

    // Promote pending left-click into a drag once threshold exceeded
    if (this.state.dragPending && !this.state.isDragging) {
      const dx = globalPos.x - this.state.dragStartX
      const dy = globalPos.y - this.state.dragStartY
      const distanceSq = dx * dx + dy * dy
      const thresholdSq = 4 * 4 // 4px movement threshold
      if (distanceSq >= thresholdSq) {
        this.state.isDragging = true
        this.state.dragPending = false
        this.app.renderer?.events?.setCursor?.('grabbing')
        this.callbacks.onDragStart && this.callbacks.onDragStart()
      }
    }

    // Dependency preview
    if (this.state.isCreatingDependency && this.state.dependencySourceTaskId) {
      if (this.dependencyPreview && !this.layers.dragLayer.children.includes(this.dependencyPreview)) {
        this.layers.dragLayer.addChild(this.dependencyPreview)
      }
      const srcA = this.scene.getAnchors(this.state.dependencySourceTaskId)
      if (!srcA) return
      // Determine hover target via precise local hit check only
      let hoverId: string | null = null
      let dstX = localPos.x
      let dstY = localPos.y
      const found = this.findTaskAtGlobal(globalPos, this.state.dependencySourceTaskId || undefined)
      if (found) {
        hoverId = found
        const a = this.scene.getAnchors(found)
        if (a) { dstX = a.leftCenterX; dstY = a.leftCenterY }
      }
      this.state.dependencyHoverTargetId = hoverId
      const g = this.dependencyPreview || new Graphics()
      g.clear()
      // During drag, start at the source note's circle center (left side) for visual consistency
      g.moveTo(srcA.leftCenterX, srcA.leftCenterY)
      g.lineTo(dstX, dstY)
      g.stroke({ width: 2, color: 0x10B981, alpha: 0.9 })
      const angle = Math.atan2(dstY - srcA.rightCenterY, dstX - srcA.rightCenterX)
      const arrow = 8
      g.beginPath()
      g.moveTo(dstX, dstY)
      g.lineTo(dstX - arrow * Math.cos(angle - Math.PI / 6), dstY - arrow * Math.sin(angle - Math.PI / 6))
      g.lineTo(dstX - arrow * Math.cos(angle + Math.PI / 6), dstY - arrow * Math.sin(angle + Math.PI / 6))
      g.closePath()
      g.fill({ color: 0x10B981, alpha: 0.8 })
        ; (g as any).eventMode = 'none'
      if (!this.dependencyPreview) {
        this.layers.dragLayer.addChild(g)
      }
      this.dependencyPreview = g
      return
    }

    // Resize preview
    if (this.state.isResizing && this.state.draggedTask) {
      const g = this.dragPreview || new Graphics()
      g.clear()
      const taskStart = new Date((this.state.draggedTask as any).startDate)
      const projectStartDate = this.utils.getProjectStartDate()
      const dayIndex = Math.floor((taskStart.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
      const dayWidth = this.getDayWidthFn ? this.getDayWidthFn() : this.config.DAY_WIDTH
      const startX = this.config.LEFT_MARGIN + dayIndex * dayWidth
      // Snap the right edge to the current time grid (hour/day/week/month)
      const snapRight = this.utils.snapXToTime
        ? this.utils.snapXToTime(localPos.x)
        : (() => {
          const rel = Math.round((localPos.x - this.config.LEFT_MARGIN) / Math.max(dayWidth, 0.0001))
          const snappedX = this.config.LEFT_MARGIN + rel * dayWidth
          return { snappedX, dayIndex: rel }
        })()
      const snappedRightX = Math.max(startX + dayWidth, snapRight.snappedX)
      const newWidth = Math.max(dayWidth, snappedRightX - startX)
      const taskY = this.scene.taskLayouts.get((this.state.draggedTask as any).id)?.topY ?? 0
      const taskH = this.getTaskHeightFn ? this.getTaskHeightFn() : this.config.TASK_HEIGHT
      drawNoteBodyPathAbsolute(g, startX, taskY, newWidth, taskH)
      g.fill({ color: 0x10B981, alpha: 0.5 })
      g.stroke({ width: 2, color: 0x10B981, alpha: 1 })
      if (!this.dragPreview) this.layers.dragLayer.addChild(g)
      this.dragPreview = g
      return
    }

    // Drag preview (ghost)
    if (this.state.isDragging && this.state.draggedTask) {
      const preview = this.dragPreview || new Graphics()
      preview.clear()
      // Draw preview so that the point originally clicked stays under the cursor
      const localClickX = this.state.clickLocalX ?? 0
      const localClickY = this.state.clickLocalY ?? 0
      const dragX = localPos.x - localClickX
      const dragY = localPos.y - localClickY
      const dayWidth = this.getDayWidthFn ? this.getDayWidthFn() : this.config.DAY_WIDTH
      const layoutForTask = this.scene.taskLayouts.get((this.state.draggedTask as any).id)
      const taskWidth = layoutForTask ? layoutForTask.width : Math.max(dayWidth, (this.state.draggedTask as any).durationDays * dayWidth)
      const taskH2 = this.getTaskHeightFn ? this.getTaskHeightFn() : this.config.TASK_HEIGHT
      const radius = taskH2 / 2
      const scaledCfg = this.getScaledConfigFn ? this.getScaledConfigFn() : { TOP_MARGIN: this.config.TOP_MARGIN, STAFF_SPACING: this.config.STAFF_SPACING, STAFF_LINE_SPACING: this.config.STAFF_LINE_SPACING }
      const nearest = this.findNearestStaffLineScaled(dragY + radius, scaledCfg)
      if (nearest) {
        const targetLineY = nearest.centerY
        const snappedTopY = targetLineY - radius
        const snap = this.utils.snapXToTime ? this.utils.snapXToTime(dragX) : this.utils.snapXToDay(dragX)
        const snappedX = snap.snappedX
        const dayIndex = snap.dayIndex
        const minIdx = this.state.minAllowedDayIndex ?? 0
        const clampedDayIndex = Math.max(dayIndex, minIdx)
        this.state.snapDayIndex = clampedDayIndex
        this.state.snapStaffId = (nearest.staff as any).id
        this.state.snapStaffLine = nearest.staffLine
        const minX = this.config.LEFT_MARGIN + (minIdx * dayWidth)
        const clampedX = Math.max(snappedX, minX)
        this.state.snapSnappedX = clampedX
        const drawX = clampedX
        drawNoteBodyPathAbsolute(preview, drawX, snappedTopY, taskWidth, taskH2)
        preview.fill({ color: 0x8B5CF6, alpha: 0.5 })
        preview.stroke({ width: 2, color: 0xFCD34D, alpha: 1 })
      }
      ; (preview as any).eventMode = 'none'
      if (!this.dragPreview) this.layers.dragLayer.addChild(preview)
      this.dragPreview = preview
    }
  }

  private onUp = (event: any) => {
    const globalPos = event.global
    const localPos = this.layers.viewport ? this.layers.viewport.toLocal(globalPos) : globalPos

    // Clear previews
    if (this.dragPreview && this.layers.dragLayer.children.includes(this.dragPreview)) {
      this.layers.dragLayer.removeChild(this.dragPreview)
      this.dragPreview.destroy()
      this.dragPreview = null
    }
    if (this.dependencyPreview && this.layers.dragLayer.children.includes(this.dependencyPreview)) {
      this.layers.dragLayer.removeChild(this.dependencyPreview)
      this.dependencyPreview.destroy()
      this.dependencyPreview = null
    }

    // Dependency finalize
    if (this.state.isCreatingDependency && this.state.dependencySourceTaskId) {
      let targetTaskId: string | null = this.state.dependencyHoverTargetId || null
      if (!targetTaskId) {
        targetTaskId = this.findTaskAtGlobal(globalPos, this.state.dependencySourceTaskId || undefined)
      }
      if (targetTaskId && targetTaskId !== this.state.dependencySourceTaskId) {
        const sourceTask = this.data.getTasks()[this.state.dependencySourceTaskId]
        const destTask = this.data.getTasks()[targetTaskId]
        if (sourceTask && destTask) {
          const src = new Date(sourceTask.startDate) <= new Date(destTask.startDate) ? sourceTask : destTask
          const dst = src === sourceTask ? destTask : sourceTask
          const id = `dep-${Date.now()}`
          this.callbacks.createDependency(this.projectId, { id, srcTaskId: (src as any).id, dstTaskId: (dst as any).id, type: DependencyType.FINISH_TO_START })
        }
      }
      this.state.isCreatingDependency = false
      this.state.dependencySourceTaskId = null
      this.state.dependencyHoverTargetId = null
      this.callbacks.onDragEnd && this.callbacks.onDragEnd()
      this.resetCursor()
      return
    }

    // Resize finalize
    if (this.state.isResizing && this.state.draggedTask && this.state.draggedTaskId) {
      const taskStart = new Date((this.state.draggedTask as any).startDate)
      const projectStartDate = this.utils.getProjectStartDate()
      const startDayIndex = Math.floor((taskStart.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
      const dayWidth = this.getDayWidthFn ? this.getDayWidthFn() : this.config.DAY_WIDTH
      // compute snapped right index from current pointer
      const snapRight = this.utils.snapXToTime
        ? this.utils.snapXToTime(localPos.x)
        : (() => {
          const rel = Math.round((localPos.x - this.config.LEFT_MARGIN) / Math.max(dayWidth, 0.0001))
          const snappedX = this.config.LEFT_MARGIN + rel * dayWidth
          return { snappedX, dayIndex: rel }
        })()
      const rightIndex = Math.max(startDayIndex + 1, snapRight.dayIndex)
      const newDuration = Math.max(1, rightIndex - startDayIndex)
      this.callbacks.updateTask(this.projectId, this.state.draggedTaskId, { durationDays: newDuration })
      this.resetState()
      this.callbacks.onDragEnd && this.callbacks.onDragEnd()
      this.resetCursor()
      return
    }

    // Drag finalize
    if (this.state.isDragging && this.state.draggedTask && this.state.draggedTaskId) {
      const taskH = this.getTaskHeightFn ? this.getTaskHeightFn() : this.config.TASK_HEIGHT
      const radius = taskH / 2
      // Use the same local anchor convention as the ghost: cursor over the original click point
      const localClickX = this.state.clickLocalX ?? 0
      const localClickY = this.state.clickLocalY ?? 0
      const dropX = localPos.x - localClickX
      const dropY = localPos.y - localClickY
      const nearest = this.utils.findNearestStaffLine(dropY + radius)
      const dayIndex = this.state.snapDayIndex !== undefined
        ? this.state.snapDayIndex
        : (this.state.snapSnappedX !== undefined
          ? Math.round((this.state.snapSnappedX - this.config.LEFT_MARGIN) / ((this.getDayWidthFn ? this.getDayWidthFn() : this.config.DAY_WIDTH)))
          : (this.utils.snapXToTime ? this.utils.snapXToTime(dropX).dayIndex : this.utils.snapXToDay(dropX).dayIndex))
      const clampedDayIndex = Math.max(dayIndex, this.state.minAllowedDayIndex ?? 0)
      const startDate = this.utils.dayIndexToIsoDate(clampedDayIndex)
      const updates: any = { startDate }
      if (this.state.snapStaffId !== undefined && this.state.snapStaffLine !== undefined) {
        updates.staffId = this.state.snapStaffId
        updates.staffLine = this.state.snapStaffLine
      } else if (nearest) {
        updates.staffId = (nearest.staff as any).id
        updates.staffLine = nearest.staffLine
      }
      this.callbacks.updateTask(this.projectId, this.state.draggedTaskId, updates)
      this.resetState()
      this.callbacks.onDragEnd && this.callbacks.onDragEnd()
      this.resetCursor()
    }

    // If no drag/resize/dependency occurred, treat as pure click; reset pending
    if (this.state.dragPending) {
      this.state.dragPending = false
      this.resetCursor()
    }

    // Empty-space click finalize: only if pointerDown began on stage and no interaction occurred
    if (this.state.pointerDownOnStage && !this.state.isDragging && !this.state.isResizing && !this.state.isCreatingDependency && !this.state.dragPending) {
      // Default-case behavior: if pointer up did not end over an interactive task, clear selection
      // Prefer FederatedPointerEvent.target which is already resolved by Pixi's EventSystem
      const target = (event as any).target
      const matchedIdFromTarget = target ? this.resolveTaskIdFromHit(target) : null
      if (!matchedIdFromTarget) {
        this.callbacks.select([])
      }
    }
    this.state.stageDownOnEmpty = false
    this.state.pointerDownOnStage = false
  }

  // Tap fallback: if a simple click occurs and it wasn't on a task, clear selection
  private onTap = (event: any) => {
    if (event?.button === 2) return
    if (this.state.isDragging || this.state.isResizing || this.state.isCreatingDependency) return
    const target = (event as any).target
    const matchedIdFromTarget = target ? this.resolveTaskIdFromHit(target) : null
    if (!matchedIdFromTarget) {
      this.callbacks.select([])
    }
    this.state.pointerDownOnStage = false
  }

  // Fallback for pointer releases outside the canvas/browser window
  private onUpWindow = (e: PointerEvent | MouseEvent) => {
    // Only act if we are in a drag/resize/dependency interaction
    if (!this.state.isDragging && !this.state.isResizing && !this.state.isCreatingDependency) return
    const view = this.app.view as HTMLCanvasElement
    const rect = view.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (view.width / rect.width)
    const y = (e.clientY - rect.top) * (view.height / rect.height)
    const global = { x: x, y: y }
    this.onUp({ global } as any)
  }

  private resolveTaskIdFromHit(hit: any): string | null {
    // Walk up the parent chain and see which task container contains this hit
    let current: any = hit
    while (current) {
      for (const [taskId, cont] of this.scene.taskContainers.entries()) {
        if (current === cont) return taskId
      }
      current = current.parent
    }
    return null
  }

  // Find nearest staff line using scaled config (respects verticalScale)
  private findNearestStaffLineScaled(y: number, scaled: { TOP_MARGIN: number; STAFF_SPACING: number; STAFF_LINE_SPACING: number }): { staff: any; staffLine: number; centerY: number } | null {
    const staffs = this.data.getStaffs()
    if (!staffs || staffs.length === 0) return null
    let closest: { staff: any; staffLine: number; centerY: number } | null = null
    let minDistance = Infinity
    const halfStep = scaled.STAFF_LINE_SPACING / 2
    for (let i = 0; i < staffs.length; i++) {
      const staff = staffs[i]
      const staffStartY = scaled.TOP_MARGIN + i * scaled.STAFF_SPACING
      const maxIndex = (staff.numberOfLines - 1) * 2
      for (let idx = 0; idx <= maxIndex; idx++) {
        const centerY = staffStartY + idx * halfStep
        const dist = Math.abs(y - centerY)
        if (dist < minDistance) {
          minDistance = dist
          closest = { staff, staffLine: idx, centerY }
        }
      }
    }
    return closest
  }

  // More precise: convert global to each container's local and check hitArea.contains
  private findTaskAtGlobal(global: { x: number; y: number }, excludeId?: string): string | null {
    // Convert to viewport space and query scene spatial index for fast candidates
    const local = this.layers.viewport ? this.layers.viewport.toLocal(global as any) : global
    return (this.scene as any).findTaskAtViewportPoint?.(local.x, local.y, excludeId) || null
  }

  private onContextMenu = (e: Event) => {
    e.preventDefault()
  }

  // Clear selection when clicking empty space (left-click only)
  private onStageDown = (event: any) => {
    if (event?.button === 2) return // ignore right-click
    // If currently interacting, don't clear
    if (this.state.isDragging || this.state.isResizing || this.state.isCreatingDependency || this.state.dragPending) return
    // If the resolved target is the stage, it's an empty-space click: clear immediately
    const target = (event as any).target
    this.state.pointerDownOnStage = (target === this.app.stage)
    if (target === this.app.stage) {
      this.callbacks.select([])
      this.state.stageDownOnEmpty = false
      return
    }
    // Otherwise, defer to pointerup default-case
    this.state.stageDownOnEmpty = true
  }

  private resetState(): void {
    this.state = {
      isDragging: false,
      isResizing: false,
      isCreatingDependency: false,
      dragPending: false,
      draggedTaskId: null,
      draggedTask: null,
      dragStartX: 0,
      dragStartY: 0,
      offsetX: 0,
      offsetY: 0,
      initialDuration: 0,
      snapDayIndex: undefined,
      snapStaffId: undefined,
      snapStaffLine: undefined,
      snapSnappedX: undefined,
      dropProcessed: false,
      dependencySourceTaskId: null,
      dependencyHoverTargetId: null,
      minAllowedDayIndex: undefined
    }
  }

  private resetCursor(): void {
    this.app.renderer?.events?.setCursor?.(null as any)
  }

  /**
   * Compute the minimum allowed day index for a task so that it does not start before
   * any of its predecessors (dependencies with edges incoming to this task).
   * Falls back to 0 if unknown.
   */
  private computeMinAllowedDayIndex(taskId: string): number {
    try {
      const deps = this.data.getDependencies()
      const tasks = this.data.getTasks()
      let minIdx = 0
      for (const dep of Object.values(deps)) {
        if (dep.dstTaskId === taskId) {
          const src = tasks[dep.srcTaskId]
          if (!src) continue
          const start = new Date(src.startDate)
          const projStart = this.utils.getProjectStartDate()
          const srcDayIndex = Math.floor((start.getTime() - projStart.getTime()) / (1000 * 60 * 60 * 24))
          const requiredIdx = srcDayIndex + (src as any).durationDays
          if (requiredIdx > minIdx) minIdx = requiredIdx
        }
      }
      return minIdx
    } catch {
      return 0
    }
  }
}


