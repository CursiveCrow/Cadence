/**
 * Scene drawing helpers for PixiJS v8
 * Provides reusable, testable functions for Cadence timeline rendering.
 */

import { Container, Graphics, Text, Application, Rectangle } from 'pixi.js'
import { STATUS_TO_ACCIDENTAL } from './config'

// Renderer plugin interface and registry (extensibility)
export interface RendererPlugin {
  // Called after layers created; can add display objects or listeners
  onLayersCreated?(app: Application, layers: ReturnType<typeof createTimelineLayers>): void
  // Called after a task container is upserted and positioned
  onTaskUpserted?(taskId: string, container: Container): void
}

const rendererPlugins: RendererPlugin[] = []
export function registerRendererPlugin(plugin: RendererPlugin) {
  rendererPlugins.push(plugin)
}

export interface TimelineConfig {
  LEFT_MARGIN: number
  TOP_MARGIN: number
  DAY_WIDTH: number
  STAFF_SPACING: number
  STAFF_LINE_SPACING: number
  TASK_HEIGHT: number
  STAFF_LINE_COUNT: number
  BACKGROUND_COLOR: number
  GRID_COLOR_MAJOR: number
  GRID_COLOR_MINOR: number
  STAFF_LINE_COLOR: number
  TASK_COLORS: Record<string, number>
  DEPENDENCY_COLOR: number
  SELECTION_COLOR: number
  /** When false, suppress staff name/clef labels from the Pixi scene (for external sidebar labels) */
  DRAW_STAFF_LABELS?: boolean
  /** Horizontal padding after each date/grid line before a note body starts */
  NOTE_START_PADDING?: number
}

export interface StaffLike {
  id: string
  name: string
  numberOfLines: number
}

export interface TaskLike {
  id: string
  title?: string
  startDate: string
  durationDays: number
  status?: string
  staffId: string
  staffLine: number
}

export interface DependencyLike {
  id: string
  srcTaskId: string
  dstTaskId: string
}

export interface TaskLayout {
  startX: number
  centerY: number
  topY: number
  width: number
  radius: number
}

export interface TaskAnchors {
  leftCenterX: number
  leftCenterY: number
  rightCenterX: number
  rightCenterY: number
}

export function computeTaskLayout(
  config: TimelineConfig,
  task: TaskLike,
  projectStartDate: Date,
  staffs: StaffLike[]
): TaskLayout {
  const taskStart = new Date(task.startDate)
  const dayIndex = Math.floor((taskStart.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
  const startX = config.LEFT_MARGIN + dayIndex * config.DAY_WIDTH + (config.NOTE_START_PADDING || 0)
  const width = Math.max(task.durationDays * config.DAY_WIDTH - 8, 40)

  const staffIndex = staffs.findIndex(s => s.id === task.staffId)
  const staffStartY = config.TOP_MARGIN + (staffIndex === -1 ? 0 : staffIndex * config.STAFF_SPACING)

  const centerY = staffStartY + (task.staffLine * config.STAFF_LINE_SPACING / 2)
  const topY = centerY - config.TASK_HEIGHT / 2
  const radius = config.TASK_HEIGHT / 2

  return { startX, centerY, topY, width, radius }
}

export function drawGridAndStaff(
  container: Container,
  config: TimelineConfig,
  staffs: StaffLike[],
  projectStartDate: Date,
  screenWidth: number,
  screenHeight: number,
  zoom: number = 1
): void {
  container.removeChildren()

  const graphics = new Graphics()
    // Use crisp edges by turning off antialias on vector strokes when zoomed out
    ; (graphics as any).resolution = Math.max(1, Math.round((zoom || 1) * ((typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1)))
  const extendedWidth = Math.max(screenWidth, config.DAY_WIDTH * 365)
  const extendedHeight = Math.max(screenHeight * 3, 2000)

  // Align world coordinates to pixel grid at current zoom to reduce blur
  const align = (v: number) => Math.round(v * (zoom || 1)) / (zoom || 1)

  for (let x = config.LEFT_MARGIN; x < extendedWidth; x += config.DAY_WIDTH * 7) {
    const ax = align(x)
    graphics.moveTo(ax, 0)
    graphics.lineTo(ax, extendedHeight)
    graphics.stroke({ width: Math.max(1, 2 / (zoom || 1)), color: config.GRID_COLOR_MAJOR, alpha: 0.1 })
  }

  for (let x = config.LEFT_MARGIN; x < extendedWidth; x += config.DAY_WIDTH) {
    const ax = align(x)
    graphics.moveTo(ax, 0)
    graphics.lineTo(ax, extendedHeight)
    graphics.stroke({ width: Math.max(1, 1 / (zoom || 1)), color: config.GRID_COLOR_MINOR, alpha: 0.05 })
  }

  let currentY = config.TOP_MARGIN
  staffs.forEach((staff) => {
    for (let line = 0; line < staff.numberOfLines; line++) {
      const y = align(currentY + line * config.STAFF_LINE_SPACING)
      graphics.moveTo(config.LEFT_MARGIN, y)
      graphics.lineTo(extendedWidth, y)
      graphics.stroke({ width: Math.max(1, 1 / (zoom || 1)), color: config.STAFF_LINE_COLOR, alpha: 0.6 })
    }

    if ((config as any).DRAW_STAFF_LABELS !== false) {
      const labelText = new Text({
        text: staff.name,
        style: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 14,
          fontWeight: 'bold',
          fill: 0xffffff,
          align: 'right'
        }
      })
      const staffCenterY = currentY + ((staff.numberOfLines - 1) * config.STAFF_LINE_SPACING) / 2
      labelText.x = config.LEFT_MARGIN - 15 - labelText.width
      labelText.y = staffCenterY - labelText.height / 2
      container.addChild(labelText)

      const clefSymbol = staff.name.toLowerCase().includes('treble') ? '𝄞' :
        staff.name.toLowerCase().includes('bass') ? '𝄢' : '♪'
      const clefText = new Text({
        text: clefSymbol,
        style: {
          fontFamily: 'serif',
          fontSize: 20,
          fontWeight: 'bold',
          fill: 0xffffff
        }
      })
      clefText.x = config.LEFT_MARGIN + 15 - clefText.width / 2
      clefText.y = staffCenterY - clefText.height / 2
      container.addChild(clefText)
    }

    currentY += config.STAFF_SPACING
  })

  if ((config as any).DRAW_STAFF_LABELS !== false) {
    const maxDays = Math.floor((extendedWidth - config.LEFT_MARGIN) / config.DAY_WIDTH)
    for (let i = 0; i < maxDays; i++) {
      const x = config.LEFT_MARGIN + i * config.DAY_WIDTH
      const date = new Date(projectStartDate)
      date.setDate(date.getDate() + i)
      const dateText = new Text({
        text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        style: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 11,
          fill: 0xffffff
        }
      })
      dateText.x = x + 5
      dateText.y = 25 - dateText.height / 2
      container.addChild(dateText)
    }
  }

  container.addChildAt(graphics, 0)
}

export function drawTaskNote(
  container: Container,
  config: TimelineConfig,
  layout: TaskLayout,
  title: string,
  status: string | undefined,
  isSelected: boolean
): void {
  container.removeChildren()

  const graphics = new Graphics()

  // Container will be positioned at (layout.startX, layout.topY)
  // Draw relative to (0,0)
  graphics.roundRect(2, 2, layout.width, config.TASK_HEIGHT, 4)
  graphics.fill({ color: 0x000000, alpha: 0.2 })

  const centerYLocal = config.TASK_HEIGHT / 2
  const r = layout.radius

  graphics.beginPath()
  graphics.moveTo(r, 0)
  graphics.lineTo(layout.width - 4, 0)
  graphics.quadraticCurveTo(layout.width, 0, layout.width, 4)
  graphics.lineTo(layout.width, config.TASK_HEIGHT - 4)
  graphics.quadraticCurveTo(layout.width, config.TASK_HEIGHT, layout.width - 4, config.TASK_HEIGHT)
  graphics.lineTo(r, config.TASK_HEIGHT)
  graphics.arc(r, centerYLocal, r, Math.PI / 2, -Math.PI / 2, false)
  graphics.closePath()

  const statusKey = (status || 'default')
  const fillColor = isSelected ? config.SELECTION_COLOR : (config.TASK_COLORS[statusKey] || config.TASK_COLORS.default)
  graphics.fill({ color: fillColor, alpha: 0.9 })
  graphics.stroke({ width: isSelected ? 2 : 1, color: isSelected ? 0xFCD34D : 0xffffff, alpha: 0.3 })

  graphics.circle(r, centerYLocal, r - 2)
  graphics.fill({ color: 0xffffff, alpha: 0.2 })

  const accidental = status ? (STATUS_TO_ACCIDENTAL[status] || '') : ''

  if (accidental) {
    const accidentalText = new Text({
      text: accidental,
      style: {
        fontFamily: 'serif',
        fontSize: status === 'cancelled' ? 16 : 14,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'center'
      }
    })
    accidentalText.x = r - accidentalText.width / 2
    accidentalText.y = centerYLocal - accidentalText.height / 2
    container.addChild(accidentalText)
  }

  if (layout.width > 30) {
    const titleText = title || ''
    const text = new Text({
      text: titleText,
      style: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 11,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'left'
      }
    })

    const textX = config.TASK_HEIGHT + 8
    text.x = textX
    text.y = centerYLocal - text.height / 2

    const maxTextWidth = layout.width - config.TASK_HEIGHT - 16
    if (text.width > maxTextWidth) {
      let truncatedText = titleText
      while (text.width > maxTextWidth && truncatedText.length > 0) {
        truncatedText = truncatedText.slice(0, -1)
        text.text = truncatedText + '...'
      }
    }

    container.addChild(text)
  }

  container.addChildAt(graphics, 0)
}

/**
 * Draws the task note body path at absolute coordinates into the provided Graphics.
 * This mirrors the rounded-rectangle-with-left-circle shape used for tasks.
 */
export function drawNoteBodyPathAbsolute(
  graphics: Graphics,
  x: number,
  topY: number,
  width: number,
  height: number
): void {
  const radius = height / 2
  graphics.beginPath()
  graphics.moveTo(x + radius, topY)
  graphics.lineTo(x + width - 4, topY)
  graphics.quadraticCurveTo(x + width, topY, x + width, topY + 4)
  graphics.lineTo(x + width, topY + height - 4)
  graphics.quadraticCurveTo(x + width, topY + height, x + width - 4, topY + height)
  graphics.lineTo(x + radius, topY + height)
  graphics.arc(x + radius, topY + radius, radius, Math.PI / 2, -Math.PI / 2, false)
  graphics.closePath()
}

export function drawDependencyArrow(
  graphics: Graphics,
  srcX: number,
  srcY: number,
  dstX: number,
  dstY: number,
  color: number
): void {
  graphics.clear()
  graphics.moveTo(srcX, srcY)
  const controlOffset = Math.abs(dstX - srcX) * 0.3
  graphics.bezierCurveTo(
    srcX + controlOffset, srcY,
    dstX - controlOffset, dstY,
    dstX, dstY
  )
  graphics.stroke({ width: 2, color, alpha: 0.6 })

  const angle = Math.atan2(dstY - srcY, dstX - srcX)
  const arrowSize = 8
  graphics.beginPath()
  graphics.moveTo(dstX, dstY)
  graphics.lineTo(
    dstX - arrowSize * Math.cos(angle - Math.PI / 6),
    dstY - arrowSize * Math.sin(angle - Math.PI / 6)
  )
  graphics.lineTo(
    dstX - arrowSize * Math.cos(angle + Math.PI / 6),
    dstY - arrowSize * Math.sin(angle + Math.PI / 6)
  )
  graphics.closePath()
  graphics.fill({ color, alpha: 0.6 })
}

/**
 * Draw a selection highlight around a task note shape. Returns the created Graphics.
 */
export function drawSelectionHighlight(
  container: Container,
  config: TimelineConfig,
  layout: TaskLayout
): Graphics {
  const selectionGraphics = new Graphics()
  const selectionPadding = 3

  selectionGraphics.beginPath()
  const selectionRadius = layout.radius + selectionPadding
  selectionGraphics.moveTo(layout.startX + layout.radius, layout.topY - selectionPadding)
  selectionGraphics.lineTo(layout.startX + layout.width - 4, layout.topY - selectionPadding)
  selectionGraphics.quadraticCurveTo(
    layout.startX + layout.width + selectionPadding, layout.topY - selectionPadding,
    layout.startX + layout.width + selectionPadding, layout.topY + 4
  )
  selectionGraphics.lineTo(layout.startX + layout.width + selectionPadding, layout.topY + config.TASK_HEIGHT - 4)
  selectionGraphics.quadraticCurveTo(
    layout.startX + layout.width + selectionPadding, layout.topY + config.TASK_HEIGHT + selectionPadding,
    layout.startX + layout.width - 4, layout.topY + config.TASK_HEIGHT + selectionPadding
  )
  selectionGraphics.lineTo(layout.startX + layout.radius, layout.topY + config.TASK_HEIGHT + selectionPadding)
  selectionGraphics.arc(
    layout.startX + layout.radius, layout.centerY,
    selectionRadius,
    Math.PI / 2, -Math.PI / 2,
    false
  )
  selectionGraphics.closePath()
  selectionGraphics.stroke({ width: 2, color: config.SELECTION_COLOR, alpha: 1 })
  container.addChild(selectionGraphics)
  return selectionGraphics
}

/**
 * Draw a dependency preview arrow between two points into the given container.
 */
export function drawDependencyPreview(
  container: Container,
  srcX: number,
  srcY: number,
  dstX: number,
  dstY: number,
  color: number = 0x10B981
): Graphics {
  const preview = new Graphics()
  preview.moveTo(srcX, srcY)
  preview.lineTo(dstX, dstY)
  preview.stroke({ width: 2, color, alpha: 0.9 })

  const angle = Math.atan2(dstY - srcY, dstX - srcX)
  const arrow = 8
  preview.beginPath()
  preview.moveTo(dstX, dstY)
  preview.lineTo(dstX - arrow * Math.cos(angle - Math.PI / 6), dstY - arrow * Math.sin(angle - Math.PI / 6))
  preview.lineTo(dstX - arrow * Math.cos(angle + Math.PI / 6), dstY - arrow * Math.sin(angle + Math.PI / 6))
  preview.closePath()
  preview.fill({ color, alpha: 0.8 })
  container.addChild(preview)
  return preview
}

/**
 * Build timeline layers (viewport/background/dependencies/tasks/selection/drag).
 */
export function createTimelineLayers(app: Application): {
  viewport: Container
  background: Container
  dependencies: Container
  tasks: Container
  selection: Container
  dragLayer: Container
} {
  const viewport = new Container()
  app.stage.addChild(viewport)

  const background = new Container()
  const dependencies = new Container()
  const tasksLayer = new Container()
  const selectionLayer = new Container()
  const dragLayer = new Container()

  viewport.addChild(background)
  viewport.addChild(dependencies)
  viewport.addChild(tasksLayer)
  viewport.addChild(selectionLayer)
  viewport.addChild(dragLayer)

  // Event routing: ensure stage routes events; only task containers should receive pointer events
  app.stage.eventMode = 'static'
  // Ensure stage is hit-testable across entire canvas for default-case empty-clicks
  if (!(app.stage as any).hitArea) {
    (app.stage as any).hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height)
  }
  viewport.eventMode = 'passive'
  background.eventMode = 'none'
  dependencies.eventMode = 'none'
  selectionLayer.eventMode = 'none'
  dragLayer.eventMode = 'none'
  tasksLayer.eventMode = 'static'

  // Notify plugins
  for (const p of rendererPlugins) {
    try { p.onLayersCreated?.(app, { viewport, background, dependencies, tasks: tasksLayer, selection: selectionLayer, dragLayer }) } catch { }
  }

  return {
    viewport,
    background,
    dependencies,
    tasks: tasksLayer,
    selection: selectionLayer,
    dragLayer,
  }
}

/**
 * Ensure grid/staff are drawn once; avoids re-building per frame.
 */
export function ensureGridAndStaff(
  container: Container,
  config: TimelineConfig,
  staffs: StaffLike[],
  projectStartDate: Date,
  screenWidth: number,
  screenHeight: number,
  zoom: number = 1
): void {
  const key = '__grid_meta__'
  const meta: any = (container as any)[key] || {}
  // Only rebuild when the integer screen size or rounded zoom changes to avoid subpixel jitter
  const rz = Math.round(zoom * 100) / 100
  if (container.children.length > 0 && meta.w === screenWidth && meta.h === screenHeight && meta.z === rz) return
  container.removeChildren()
  drawGridAndStaff(container, config, staffs, projectStartDate, screenWidth, screenHeight, rz)
    ; (container as any)[key] = { w: screenWidth, h: screenHeight, z: rz }
}

/**
 * Simple scene manager to own layers and task/display mappings with anchor/layout caches.
 */
export class TimelineSceneManager {
  layers: { viewport: Container; background: Container; dependencies: Container; tasks: Container; selection: Container; dragLayer: Container }
  taskContainers: Map<string, Container>
  dependencyGraphics: Map<string, Graphics>
  taskLayouts: Map<string, TaskLayout>
  taskAnchors: Map<string, TaskAnchors>

  constructor(layers: { viewport: Container; background: Container; dependencies: Container; tasks: Container; selection: Container; dragLayer: Container }) {
    this.layers = layers
    this.taskContainers = new Map()
    this.dependencyGraphics = new Map()
    this.taskLayouts = new Map()
    this.taskAnchors = new Map()
  }

  /**
   * Create or update a task container and draw its note. Returns the container and whether it was newly created.
   */
  upsertTask(
    task: TaskLike,
    layout: TaskLayout,
    config: TimelineConfig,
    title?: string,
    status?: string
  ): { container: Container; created: boolean } {
    let container = this.taskContainers.get(task.id)
    let created = false
    if (!container) {
      container = new Container()
      container.eventMode = 'static'
        ; (container as any).__meta = {}
      this.layers.tasks.addChild(container)
      this.taskContainers.set(task.id, container)
      created = true
    }

    // Cache layout and anchors (anchors in absolute space derived from container position outside)
    this.taskLayouts.set(task.id, layout)
    // Anchor points at the centers of the left and right “end circles”.
    // Left circle center is radius from start; right circle center is radius in from the right edge.
    this.taskAnchors.set(task.id, {
      leftCenterX: layout.startX + layout.radius,
      leftCenterY: layout.centerY,
      rightCenterX: layout.startX + layout.width - layout.radius,
      rightCenterY: layout.centerY,
    })

    // Only redraw if something meaningful changed to reduce GC/CPU
    const prevMeta = (container as any).__meta || {}
    const shouldRedraw =
      prevMeta.width !== layout.width ||
      prevMeta.centerY !== layout.centerY ||
      prevMeta.startX !== layout.startX ||
      prevMeta.title !== (title || '') ||
      prevMeta.status !== (status || '')

    if (shouldRedraw) {
      drawTaskNote(container, config, layout, title || '', status, false)
        ; (container as any).__meta = {
          startX: layout.startX,
          width: layout.width,
          topY: layout.topY,
          centerY: layout.centerY,
          title: title || '',
          status: status || ''
        }
    }
    container.hitArea = new Rectangle(0, 0, layout.width, config.TASK_HEIGHT)

    // Notify plugins
    for (const p of rendererPlugins) {
      try { p.onTaskUpserted?.(task.id, container) } catch { }
    }

    return { container, created }
  }

  removeMissingTasks(validIds: Set<string>): void {
    for (const [id, container] of this.taskContainers.entries()) {
      if (!validIds.has(id)) {
        container.removeFromParent()
        this.taskContainers.delete(id)
        this.taskLayouts.delete(id)
        this.taskAnchors.delete(id)
      }
    }
  }

  getAnchors(taskId: string): TaskAnchors | undefined {
    return this.taskAnchors.get(taskId)
  }

  upsertDependency(id: string): Graphics {
    let g = this.dependencyGraphics.get(id)
    if (!g) {
      g = new Graphics()
      this.layers.dependencies.addChild(g)
      this.dependencyGraphics.set(id, g)
    }
    return g
  }

  removeMissingDependencies(validIds: Set<string>): void {
    for (const [id, g] of this.dependencyGraphics.entries()) {
      if (!validIds.has(id)) {
        g.removeFromParent()
        this.dependencyGraphics.delete(id)
      }
    }
  }

  clearSelection(): void {
    this.layers.selection.removeChildren()
  }

  drawSelection(taskId: string, config: TimelineConfig): void {
    const layout = this.taskLayouts.get(taskId)
    if (!layout) return
    drawSelectionHighlight(this.layers.selection, config, layout)
  }
}

// Example plugin export for consumers to import and register
export const ExampleStatusGlyphPlugin: RendererPlugin = {
  onTaskUpserted: (_taskId, _container) => {
    // Placeholder: consumers can draw extra glyphs or overlays here
  }
}


