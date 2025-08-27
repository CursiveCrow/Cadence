/**
 * Scene drawing helpers for PixiJS v8
 * Provides reusable, testable functions for Cadence timeline rendering.
 */

import { Container, Graphics, Text, Application, Rectangle } from 'pixi.js'
import { STATUS_TO_ACCIDENTAL } from './config'
import { getTimeScaleForZoom } from './layout'

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
  // Optional alternate widths for dynamic scale (scaled values derived from DAY_WIDTH by default)
  HOUR_WIDTH?: number
  WEEK_WIDTH?: number
  MONTH_WIDTH?: number
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
  // Allow tasks to shrink at low zoom; never below circle diameter (TASK_HEIGHT)
  const minWidth = Math.max(config.TASK_HEIGHT, 4)
  const width = Math.max(task.durationDays * config.DAY_WIDTH - 8, minWidth)

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
    // Keep resolution independent of zoom to maintain constant stroke thickness
    ; (graphics as any).resolution = Math.max(1, Math.round(((typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1)))
  // Avoid creating huge geometry at extreme zoom-out; cap the drawn extent
  const capWidth = Math.min(Math.max(screenWidth * 4, config.DAY_WIDTH * 90), 50000)
  const extendedWidth = Math.max(screenWidth, capWidth)
  const extendedHeight = Math.max(screenHeight * 3, 2000)

  // Align to whole pixels (scene is not scaled)
  const align = (v: number) => Math.round(v)

  const scale = getTimeScaleForZoom(zoom)
  const dayWidth = config.DAY_WIDTH
  const hourWidth = config.HOUR_WIDTH ?? (dayWidth / 24)
  const weekWidth = config.WEEK_WIDTH ?? (dayWidth * 7)
  const monthWidth = config.MONTH_WIDTH ?? (dayWidth * 30)

  const majorStep = scale === 'hour' ? dayWidth : scale === 'day' ? weekWidth : scale === 'week' ? monthWidth : monthWidth
  const minorStep = scale === 'hour' ? hourWidth : scale === 'day' ? dayWidth : scale === 'week' ? weekWidth : monthWidth

  // Subtle alternating weekly bands and weekend shading to improve day-scale legibility
  if (scale === 'day') {
    const bg = new Graphics()
    const baseDow = new Date(projectStartDate).getUTCDay() // 0 Sun .. 6 Sat
    // Alternating week bands
    let bandX = config.LEFT_MARGIN
    let toggle = false
    while (bandX < extendedWidth) {
      bg.rect(bandX, 0, weekWidth, extendedHeight)
      bg.fill({ color: 0xffffff, alpha: toggle ? 0.015 : 0 })
      toggle = !toggle
      bandX += weekWidth
    }
    // Weekend day overlays
    for (let i = 0, x = config.LEFT_MARGIN; x < extendedWidth; i++, x += dayWidth) {
      const dow = (baseDow + i) % 7
      if (dow === 0 || dow === 6) {
        bg.rect(x, 0, dayWidth, extendedHeight)
        bg.fill({ color: 0xffffff, alpha: 0.02 })
      }
    }
    container.addChild(bg)
  }

  if (scale === 'month') {
    // Draw month boundaries exactly at the first of each month
    const base = new Date(Date.UTC(projectStartDate.getUTCFullYear(), projectStartDate.getUTCMonth(), projectStartDate.getUTCDate()))
    let cursor = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1))
    while (true) {
      const diffMs = cursor.getTime() - base.getTime()
      const dayIndex = Math.round(diffMs / (24 * 60 * 60 * 1000))
      const x = config.LEFT_MARGIN + dayIndex * dayWidth
      if (x > extendedWidth) break
      const ax = align(x)
      graphics.moveTo(ax, 0)
      graphics.lineTo(ax, extendedHeight)
      graphics.stroke({ width: 2, color: config.GRID_COLOR_MAJOR, alpha: 0.1 })
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    }
  } else {
    for (let x = config.LEFT_MARGIN; x < extendedWidth; x += majorStep) {
      const ax = align(x)
      graphics.moveTo(ax, 0)
      graphics.lineTo(ax, extendedHeight)
      const majorAlpha = scale === 'day' ? 0.15 : 0.1
      graphics.stroke({ width: 2, color: config.GRID_COLOR_MAJOR, alpha: majorAlpha })
    }
  }

  for (let x = config.LEFT_MARGIN; x < extendedWidth; x += minorStep) {
    const ax = align(x)
    graphics.moveTo(ax, 0)
    graphics.lineTo(ax, extendedHeight)
    const minorAlpha = scale === 'day' ? 0.03 : 0.05
    graphics.stroke({ width: 1, color: config.GRID_COLOR_MINOR, alpha: minorAlpha })
  }

  let currentY = config.TOP_MARGIN
  staffs.forEach((staff) => {
    for (let line = 0; line < staff.numberOfLines; line++) {
      const y = align(currentY + line * config.STAFF_LINE_SPACING)
      graphics.moveTo(config.LEFT_MARGIN, y)
      graphics.lineTo(extendedWidth, y)
      graphics.stroke({ width: 1, color: config.STAFF_LINE_COLOR, alpha: 0.6 })
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
    const alignPx = (v: number) => Math.round(v)
    const max = Math.floor((extendedWidth - config.LEFT_MARGIN) / minorStep)
    for (let i = 0; i < max; i++) {
      const x = config.LEFT_MARGIN + i * minorStep
      const date = new Date(projectStartDate)
      const days = Math.round((x - config.LEFT_MARGIN) / dayWidth)
      date.setDate(date.getDate() + days)
      const label = scale === 'hour'
        ? date.toLocaleTimeString('en-US', { hour: '2-digit' })
        : scale === 'day'
          ? (date.getDate() === 1
            ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : String(date.getDate()))
          : scale === 'week'
            ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

      const dateText = new Text({
        text: label,
        style: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: scale === 'day' ? 12 : 11,
          fill: 0xffffff
        }
      })
      if (scale === 'day') {
        // Bold month boundaries for stronger visual rhythm
        if (date.getDate() === 1) {
          try { (dateText as any).style.fontWeight = 'bold' } catch { }
        }
      }
      dateText.x = alignPx(x + 5)
      dateText.y = alignPx(25 - dateText.height / 2)
      container.addChild(dateText)
    }
  }

  // Ensure lines sit above background bands
  container.addChildAt(graphics, Math.min(1, container.children.length))
}

export function drawTaskNote(
  container: Container,
  config: TimelineConfig,
  layout: TaskLayout,
  title: string,
  status: string | undefined,
  isSelected: boolean,
  _zoom: number
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
  if (layout.width <= config.TASK_HEIGHT + 4) {
    // Pill degenerates to a circle-only glyph at very small widths
    graphics.circle(r, centerYLocal, r)
  } else {
    graphics.moveTo(r, 0)
    graphics.lineTo(layout.width - 4, 0)
    graphics.quadraticCurveTo(layout.width, 0, layout.width, 4)
    graphics.lineTo(layout.width, config.TASK_HEIGHT - 4)
    graphics.quadraticCurveTo(layout.width, config.TASK_HEIGHT, layout.width - 4, config.TASK_HEIGHT)
    graphics.lineTo(r, config.TASK_HEIGHT)
    graphics.arc(r, centerYLocal, r, Math.PI / 2, -Math.PI / 2, false)
  }
  graphics.closePath()

  const statusKey = (status || 'default')
  const fillColor = isSelected ? config.SELECTION_COLOR : (config.TASK_COLORS[statusKey] || config.TASK_COLORS.default)
  graphics.fill({ color: fillColor, alpha: 0.9 })
  // Scene no longer scales with zoom; keep a constant, thin stroke
  graphics.stroke({ width: isSelected ? 2 : 1, color: isSelected ? 0xFCD34D : 0xffffff, alpha: 0.3 })

  graphics.circle(r, centerYLocal, Math.max(2, r - 2))
  graphics.fill({ color: 0xffffff, alpha: 0.2 })

  const accidental = status ? (STATUS_TO_ACCIDENTAL[status] || '') : ''

  if (accidental) {
    // Scale accidental glyph with note height so it remains visually centered in the circle
    const scaleFactor = status === 'cancelled' ? 0.72 : 0.64
    const baseAccidentalFont = Math.max(10, Math.round(config.TASK_HEIGHT * scaleFactor))
    const accidentalText = new Text({
      text: accidental,
      style: {
        fontFamily: 'serif',
        fontSize: baseAccidentalFont,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'center'
      }
    })
    accidentalText.x = Math.round(r - accidentalText.width / 2)
    accidentalText.y = Math.round(centerYLocal - accidentalText.height / 2)
    container.addChild(accidentalText)
  }

  if (layout.width > Math.max(config.TASK_HEIGHT * 1.2, 30)) {
    const titleText = title || ''
    const baseTitleFont = 11
    const text = new Text({
      text: titleText,
      style: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: baseTitleFont,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'left'
      }
    })

    const textX = config.TASK_HEIGHT + 8
    text.x = Math.round(textX)
    text.y = Math.round(centerYLocal - text.height / 2)

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
  type GridMeta = { w: number; h: number; z: number; cfg: string }
  const metaMap: WeakMap<Container, GridMeta> = (ensureGridAndStaff as any).__metaMap || new WeakMap<Container, GridMeta>()
    ; (ensureGridAndStaff as any).__metaMap = metaMap
  const meta = metaMap.get(container)
  // Only rebuild when the integer screen size or rounded zoom changes to avoid subpixel jitter
  const rz = Math.round(zoom * 100) / 100
  // Include spacing-related config in cache key so verticalScale changes trigger rebuild
  const cfgKey = `${config.TOP_MARGIN}|${config.STAFF_SPACING}|${config.STAFF_LINE_SPACING}|${staffs.length}`
  if (container.children.length > 0 && meta?.w === screenWidth && meta?.h === screenHeight && meta?.z === rz && meta?.cfg === cfgKey) return
  container.removeChildren()
  drawGridAndStaff(container, config, staffs, projectStartDate, screenWidth, screenHeight, rz)
  metaMap.set(container, { w: screenWidth, h: screenHeight, z: rz, cfg: cfgKey })
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
    status?: string,
    zoom: number = 1
  ): { container: Container; created: boolean } {
    let container = this.taskContainers.get(task.id)
    let created = false
    if (!container) {
      container = new Container()
      container.eventMode = 'static'
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
    type ContainerMeta = { startX: number; width: number; topY: number; centerY: number; title: string; status: string; zoom: number }
    const metaMap: WeakMap<Container, ContainerMeta> = (this as any).__containerMeta || new WeakMap<Container, ContainerMeta>()
      ; (this as any).__containerMeta = metaMap
    const prevMeta = metaMap.get(container)
    const shouldRedraw =
      prevMeta?.width !== layout.width ||
      prevMeta?.centerY !== layout.centerY ||
      prevMeta?.startX !== layout.startX ||
      prevMeta?.title !== (title || '') ||
      prevMeta?.status !== (status || '') ||
      (prevMeta ? Math.abs(prevMeta.zoom - zoom) > 0.05 : true)

    if (shouldRedraw) {
      drawTaskNote(container, config, layout, title || '', status, false, zoom)
      metaMap.set(container, {
        startX: layout.startX,
        width: layout.width,
        topY: layout.topY,
        centerY: layout.centerY,
        title: title || '',
        status: status || '',
        zoom
      })
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


