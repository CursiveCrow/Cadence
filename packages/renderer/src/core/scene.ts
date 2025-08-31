/**
 * Scene drawing helpers for PixiJS v8
 * Provides reusable, testable functions for Cadence timeline rendering.
 */

import { Container, Graphics, Text, Application, Rectangle } from 'pixi.js'
<<<<<<<< HEAD:packages/renderer/src/core/scene.ts
import { SpatialHash } from '../utils/spatial'
import { drawSelectionHighlight } from '../rendering/shapes'
import { getTimeScaleForZoom, getMeasureMarkerXsAligned, worldDayToContainerX } from '../utils/layout'
import { computeGraphicsResolution, computeTextResolution } from '../utils/resolution'
import type { Task, Dependency, Staff } from '@cadence/core'
import type { RendererContext } from '../types/context'
import { devLog } from '../utils/devlog'
========
import { SpatialHash } from './utils/spatial'
import { drawSelectionHighlight } from './rendering/shapes'
import { getTimeScaleForZoom, getMeasureMarkerXsAligned, worldDayToContainerX } from './utils/layout'
import { computeGraphicsResolution, computeTextResolution } from './utils/resolution'
import type { Task, Dependency, Staff } from '@cadence/core'
import type { RendererContext } from './types/context'
import { devLog } from './utils/devlog'
>>>>>>>> b8957b3be2daafe3fbd66db619d27f14be29ba75:packages/renderer/src/scene.ts


export interface RendererPlugin {
  onLayersCreated?(app: Application, layers: ReturnType<typeof createTimelineLayers>, ctx: RendererContext): void
  onTaskUpserted?(task: TaskLike, container: Container, ctx: { layout: TaskLayout; config: TimelineConfig; zoom: number; selected: boolean }): void
  onDestroy?(): void
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
  /** Accent color for today marker and other timeline accents */
  TODAY_COLOR?: number
  /** When false, suppress staff name/clef labels from the Pixi scene (for external sidebar labels) */
  DRAW_STAFF_LABELS?: boolean
  /** Horizontal padding after each date/grid line before a note body starts */
  NOTE_START_PADDING?: number
  /** Length of a measure in days for vertical measure markers (e.g., 7 or 14) */
  MEASURE_LENGTH_DAYS?: number
  /** Offset in days from project start for measure 0 alignment */
  MEASURE_OFFSET_DAYS?: number
  /** Color of measure marker lines */
  MEASURE_COLOR?: number
  /** Line width in pixels for measure markers */
  MEASURE_LINE_WIDTH_PX?: number
  /** Spacing between thick (on grid) and thin (left) measure bars in pixels (even) */
  MEASURE_PAIR_SPACING_PX?: number
}

export type StaffLike = Staff
export type TaskLike = Task
export type DependencyLike = Dependency


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

// computeTaskLayout moved to layout.ts

export function drawGridAndStaff(
  container: Container,
  config: TimelineConfig,
  staffs: StaffLike[],
  projectStartDate: Date,
  screenWidth: number,
  _screenHeight: number,
  zoom: number = 1,
  alignment: { viewportXDaysQuantized: number; viewportPixelOffsetX: number },
  _useGpuGrid: boolean = true
): void {
  container.removeChildren()

  const graphics = new Graphics()
    // Keep resolution independent of zoom to maintain constant stroke thickness
    ; (graphics as any).resolution = computeGraphicsResolution()
  // Avoid creating huge geometry at extreme zoom-out; cap the drawn extent
  const capWidth = Math.min(Math.max(screenWidth * 4, config.DAY_WIDTH * 90), 50000)
  const extendedWidth = Math.max(screenWidth, capWidth)
  // Height cap no longer needed for vertical lines (GPU grid handles them)

  // Align to whole pixels (scene is not scaled)
  const pixelAlign = (v: number) => Math.round(v)

  const scale = getTimeScaleForZoom(zoom)
  const dayWidth = config.DAY_WIDTH
  const hourWidth = config.HOUR_WIDTH ?? (dayWidth / 24)
  const weekWidth = config.WEEK_WIDTH ?? (dayWidth * 7)
  const monthWidth = config.MONTH_WIDTH ?? (dayWidth * 30)

  // Minor step kept for label placement calculations below
  const minorStep = scale === 'hour' ? hourWidth : scale === 'day' ? dayWidth : scale === 'week' ? weekWidth : monthWidth

  // Vertical grid lines and bands are drawn by the GPU grid shader exclusively

  let currentY = config.TOP_MARGIN
  staffs.forEach((staff) => {
    for (let line = 0; line < staff.numberOfLines; line++) {
      const y = pixelAlign(currentY + line * config.STAFF_LINE_SPACING)
      graphics.moveTo(config.LEFT_MARGIN, y)
      graphics.lineTo(extendedWidth, y)
      graphics.stroke({ width: 1, color: config.STAFF_LINE_COLOR, alpha: 0.4 })
    }

    // Draw vertical measure markers spanning this staff's line band
    const xs = getMeasureMarkerXsAligned(config as any, extendedWidth, alignment)
    if (xs.length > 0) {
      const staffTop = pixelAlign(currentY)
      const staffBottom = pixelAlign(currentY + (staff.numberOfLines - 1) * config.STAFF_LINE_SPACING)
      const color = (config as any).MEASURE_COLOR ?? 0xffffff
      const thickW = Math.max(2, Math.round((config as any).MEASURE_LINE_WIDTH_PX || 2))
      const thinW = 1
      // Even pixel spacing so the pair is centered about the grid line
      let pairSpacing = Math.max(2, Math.round((config as any).MEASURE_PAIR_SPACING_PX ?? 2))
      if (pairSpacing % 2 !== 0) pairSpacing += 1
      for (const cx of xs) {
        // Right-anchored: thick line is centered on the grid; thin line is offset to the left by pairSpacing
        const xThick = Math.round(cx) + (thickW % 2 ? 0.5 : 0)
        const xThin = Math.round(cx - pairSpacing) + (thinW % 2 ? 0.5 : 0)
        graphics.moveTo(xThick, staffTop)
        graphics.lineTo(xThick, staffBottom)
        graphics.stroke({ width: thickW, color, alpha: 0.7 })
        graphics.moveTo(xThin, staffTop)
        graphics.lineTo(xThin, staffBottom)
        graphics.stroke({ width: thinW, color, alpha: 0.4 })
      }
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
    if (scale === 'month') {
      // Place month labels exactly on the 1st of each month
      const base = new Date(Date.UTC(projectStartDate.getUTCFullYear(), projectStartDate.getUTCMonth(), projectStartDate.getUTCDate()))
      const msPerDay = 24 * 60 * 60 * 1000
      const lastVisibleDayIndex = Math.ceil((extendedWidth - config.LEFT_MARGIN) / Math.max(dayWidth, 0.0001))
      const lastVisibleMs = base.getTime() + lastVisibleDayIndex * msPerDay
      let cursor = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1))
      while (cursor.getTime() <= lastVisibleMs) {
        const diffMs = cursor.getTime() - base.getTime()
        const dayIndex = Math.round(diffMs / msPerDay)
        const x = config.LEFT_MARGIN + dayIndex * dayWidth
        if (x > extendedWidth) break
        const label = cursor.toLocaleDateString('en-US', { month: 'short' })
        const dateText = new Text({
          text: label,
          style: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 11,
            fill: 0xffffff
          }
        })
        dateText.x = alignPx(x + 5)
        dateText.y = alignPx(25 - dateText.height / 2)
        container.addChild(dateText)
        cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
      }
    } else {
      const max = Math.floor((extendedWidth - config.LEFT_MARGIN) / minorStep)
      // Reduce label density dynamically to limit Text allocations
      let labelStep = 1
      if (scale === 'hour') {
        // Dynamic density to mirror header: 4h → 2h → 1h
        const hourWidth = Math.max(1, dayWidth / 24)
        if (hourWidth >= 40) labelStep = 1
        else if (hourWidth >= 24) labelStep = 2
        else labelStep = 4
      } else if (scale === 'day') {
        // Tune thresholds to keep <= ~48 labels across 4x screen width
        labelStep = dayWidth >= 56 ? 1 : dayWidth >= 40 ? 2 : dayWidth >= 28 ? 3 : 7
      } else if (scale === 'week') {
        labelStep = 1
      }
      for (let i = 0; i < max; i++) {
        if (labelStep > 1 && (i % labelStep) !== 0) continue
        const x = config.LEFT_MARGIN + i * minorStep
        const date = new Date(projectStartDate)
        const days = Math.round((x - config.LEFT_MARGIN) / dayWidth)
        date.setDate(date.getDate() + days)
        const label = scale === 'hour'
          ? (() => {
            const hoursSinceStart = Math.round((x - config.LEFT_MARGIN) / Math.max(1, hourWidth))
            const hourOfDay = ((hoursSinceStart % 24) + 24) % 24
            let hour12 = hourOfDay % 12
            if (hour12 === 0) hour12 = 12
            const ap = hourOfDay < 12 ? 'a' : 'p'
            return `${hour12}${ap}`
          })()
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
            fontSize: scale === 'day' ? 12 : (scale === 'hour' ? 9 : 11),
            fill: 0xffffff
          }
        })
          // Keep Text resolution modest and stable
          ; (dateText as any).resolution = computeTextResolution(1, 1)
        if (scale === 'day') {
          // Bold month boundaries for stronger visual rhythm
          if (date.getDate() === 1) {
            try { (dateText as any).style.fontWeight = 'bold' } catch (err) { devLog.warn('date label bold style failed', err) }
          }
        }
        if (scale === 'hour') {
          // Center hour label over its grid line
          dateText.x = alignPx(x - dateText.width / 2)
        } else {
          // Slight offset to the right looks better at coarser scales
          dateText.x = alignPx(x + 5)
        }
        dateText.y = alignPx(25 - dateText.height / 2)
        container.addChild(dateText)
      }
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

  // Accidental glyphs are now provided by StatusGlyphPlugin; core note rendering omits them.

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
// Shapes moved to ./shapes

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
// ensureGridAndStaff has been removed in favor of instance-scoped GridManager.

/**
 * Simple scene manager to own layers and task/display mappings with anchor/layout caches.
 */
export class TimelineSceneManager {
  layers: { viewport: Container; background: Container; dependencies: Container; tasks: Container; selection: Container; dragLayer: Container }
  taskContainers: Map<string, Container>
  dependencyGraphics: Map<string, Graphics>
  taskLayouts: Map<string, TaskLayout>
  taskAnchors: Map<string, TaskAnchors>
  taskData: Map<string, TaskLike>
  private plugins: RendererPlugin[]
  private spatial: SpatialHash
  private lastZoom: number
  private providerGetConfig: () => TimelineConfig
  private providerGetProjectStartDate: () => Date
  private hoverGuide: Graphics | null = null
  private hoverText: Text | null = null
  private todayLine: Graphics | null = null
  private hoverRow: Graphics | null = null

  constructor(layers: { viewport: Container; background: Container; dependencies: Container; tasks: Container; selection: Container; dragLayer: Container }) {
    this.layers = layers
    this.taskContainers = new Map()
    this.dependencyGraphics = new Map()
    this.taskLayouts = new Map()
    this.taskAnchors = new Map()
    this.taskData = new Map()
    this.plugins = []
    this.spatial = new SpatialHash(200)
    this.lastZoom = 1
    this.providerGetConfig = () => ({
      LEFT_MARGIN: 0,
      TOP_MARGIN: 0,
      DAY_WIDTH: 60,
      STAFF_SPACING: 120,
      STAFF_LINE_SPACING: 18,
      TASK_HEIGHT: 20,
      STAFF_LINE_COUNT: 5,
      BACKGROUND_COLOR: 0x000000,
      GRID_COLOR_MAJOR: 0xffffff,
      GRID_COLOR_MINOR: 0xffffff,
      STAFF_LINE_COLOR: 0xffffff,
      TASK_COLORS: { default: 0xffffff },
      DEPENDENCY_COLOR: 0xffffff,
      SELECTION_COLOR: 0xffffff,
    } as any)
    this.providerGetProjectStartDate = () => new Date(0)
  }

  setPlugins(plugins: RendererPlugin[]): void {
    this.plugins = plugins || []
  }

  setZoom(zoom: number): void {
    this.lastZoom = zoom
  }

  setContextProviders(providers: { getEffectiveConfig: () => TimelineConfig; getProjectStartDate: () => Date }): void {
    this.providerGetConfig = providers.getEffectiveConfig
    this.providerGetProjectStartDate = providers.getProjectStartDate
  }

  notifyLayersCreated(app: Application): void {
    const ctx: RendererContext = {
      getZoom: () => this.lastZoom,
      getEffectiveConfig: () => this.providerGetConfig(),
      getProjectStartDate: () => this.providerGetProjectStartDate(),
    }
    for (const p of this.plugins) {
      try { p.onLayersCreated?.(app, this.layers as any, ctx) } catch (err) { devLog.warn('plugin.onLayersCreated failed', err) }
    }
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
    zoom: number = 1,
    selected: boolean = false
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
    this.taskData.set(task.id, task)
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
      drawTaskNote(container, config, layout, title || '', status, selected, zoom)
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

    // Notify plugins (instance-scoped)
    for (const p of this.plugins) {
      try { p.onTaskUpserted?.(task, container, { layout, config, zoom, selected }) } catch (err) { devLog.warn('plugin.onTaskUpserted failed', err) }
    }
    return { container, created }
  }

  removeMissingTasks(validIds: Set<string>): void {
    for (const [id, container] of this.taskContainers.entries()) {
      if (!validIds.has(id)) {
        try { container.removeFromParent() } catch (err) { devLog.warn('container.removeFromParent failed', err) }
        try { (container as any).destroy?.({ children: true }) } catch (err) { devLog.warn('container.destroy failed', err) }
        this.taskContainers.delete(id)
        this.taskLayouts.delete(id)
        this.taskAnchors.delete(id)
        this.taskData.delete(id)
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
        try { g.removeFromParent() } catch (err) { devLog.warn('dependencyGraphics.removeFromParent failed', err) }
        try { (g as any).destroy?.() } catch (err) { devLog.warn('dependencyGraphics.destroy failed', err) }
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

  rebuildSpatialIndex(config: TimelineConfig): void {
    this.spatial.clear()
    for (const [id, layout] of this.taskLayouts.entries()) {
      this.spatial.insert({ id, x: layout.startX, y: layout.topY, width: layout.width, height: config.TASK_HEIGHT, type: 'task' })
    }
  }

  findTaskAtViewportPoint(x: number, y: number, excludeId?: string): string | null {
    const hits = this.spatial.pointQuery(x, y)
    for (const h of hits) {
      if (excludeId && h.id === excludeId) continue
      const cont = this.taskContainers.get(h.id)
      if (!cont) continue
      // Convert from viewport space to container local space
      const local = cont.toLocal({ x, y } as any, this.layers.viewport)
      const hitArea = (cont as any).hitArea as Rectangle | undefined
      if (hitArea && hitArea.contains(local.x, local.y)) return h.id
    }
    return null
  }

  /**
   * Draw or update a thin vertical hover guide and a small tooltip near the top ruler.
   * Pass px in viewport coordinate space. If px is null, clears the hover UI.
   */
  updateHoverAtViewportX(px: number | null, config: TimelineConfig, screenHeight: number): void {
    if (px == null || !Number.isFinite(px)) {
      if (this.hoverGuide && this.layers.dragLayer.children.includes(this.hoverGuide)) this.layers.dragLayer.removeChild(this.hoverGuide)
      if (this.hoverText && this.layers.dragLayer.children.includes(this.hoverText)) this.layers.dragLayer.removeChild(this.hoverText)
      this.hoverGuide = null
      this.hoverText = null
      // Also clear tooltip and stem if present
      const tipBox = (this as any).__taskHtmlTip as Container | undefined
      if (tipBox && this.layers.dragLayer.children.includes(tipBox)) this.layers.dragLayer.removeChild(tipBox)
        ; (this as any).__taskHtmlTip = undefined
      const stem = (this as any).__tooltipStem as Graphics | undefined
      if (stem && this.layers.dragLayer.children.includes(stem)) this.layers.dragLayer.removeChild(stem)
        ; (this as any).__tooltipStem = undefined
      return
    }
    const xAligned = Math.round(px) + 0.5 // pixel-align for crisp line
    const g = this.hoverGuide || new Graphics()
    g.clear()
    g.moveTo(xAligned, 0)
    g.lineTo(xAligned, Math.max(0, screenHeight))
    g.stroke({ width: 1, color: 0xFFFFFF, alpha: 0.12 })
      ; (g as any).eventMode = 'none'
    if (!this.hoverGuide) this.layers.dragLayer.addChild(g)
    this.hoverGuide = g

    // Tooltip date text
    const base = this.providerGetProjectStartDate()
    const relDays = Math.round((px - config.LEFT_MARGIN) / Math.max(config.DAY_WIDTH, 0.0001))
    const ms = 24 * 60 * 60 * 1000
    const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()) + relDays * ms)
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const t = this.hoverText || new Text({
      text: label,
      style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 11, fill: 0xffffff }
    })
      ; (t as any).resolution = computeTextResolution(1, 1)
    t.text = label
    t.x = Math.round(xAligned + 6)
    t.y = 8
      ; (t as any).eventMode = 'none'
    if (!this.hoverText) this.layers.dragLayer.addChild(t)
    this.hoverText = t
  }

  /**
   * Draw or update the "today" marker line in background layer. Uses UTC date for consistency.
   */
  updateTodayMarker(projectStartDate: Date, config: TimelineConfig, alignment: { viewportXDaysQuantized: number; viewportPixelOffsetX: number }, screenHeight: number): void {
    try {
      const baseUTC = Date.UTC(projectStartDate.getUTCFullYear(), projectStartDate.getUTCMonth(), projectStartDate.getUTCDate())
      const now = new Date()
      const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      const msPerDay = 24 * 60 * 60 * 1000
      const dayIndex = Math.floor((todayUTC - baseUTC) / msPerDay)
      if (!Number.isFinite(dayIndex)) return
      const x = worldDayToContainerX(config as any, dayIndex, alignment)
      const line = this.todayLine || new Graphics()
      line.clear()
      line.moveTo(x, 0)
      line.lineTo(x, Math.max(0, screenHeight))
      // Warm accent color with higher alpha to be readable across backgrounds
      const accent = (config.TODAY_COLOR ?? config.SELECTION_COLOR ?? 0xF59E0B) as number
      line.stroke({ width: 2, color: accent, alpha: 0.9 })
        ; (line as any).eventMode = 'none'
      if (!this.todayLine) this.layers.background.addChild(line)
      this.todayLine = line
    } catch (err) { devLog.warn('updateTodayMarker failed', err) }
  }

  /**
   * Show a task tooltip near the cursor if hovering a task container; otherwise hide it.
   */
  updateTaskHoverAtViewportPoint(x: number, y: number, _config: TimelineConfig, _projectStartDate: Date, _screenWidth?: number): void {
    const id = this.findTaskAtViewportPoint(x, y)
    if (!id) {
      // Clear any existing tooltip
      const tip = (this as any).__taskTip as Text | undefined
      if (tip && this.layers.dragLayer.children.includes(tip)) this.layers.dragLayer.removeChild(tip)
        ; (this as any).__taskTip = undefined
      const tipBox = (this as any).__taskHtmlTip as Container | undefined
      if (tipBox && this.layers.dragLayer.children.includes(tipBox)) this.layers.dragLayer.removeChild(tipBox)
        ; (this as any).__taskHtmlTip = undefined
      const stem = (this as any).__tooltipStem as Graphics | undefined
      if (stem && this.layers.dragLayer.children.includes(stem)) this.layers.dragLayer.removeChild(stem)
        ; (this as any).__tooltipStem = undefined
      // Clear hover row highlight
      if (this.hoverRow && this.layers.dragLayer.children.includes(this.hoverRow)) this.layers.dragLayer.removeChild(this.hoverRow)
      this.hoverRow = null
      return
    }
    const task = this.taskData.get(id)
    const taskLayout = this.taskLayouts.get(id)
    if (!task || !taskLayout) return
    const details = (task as any).details || (task as any).description || ''
    const title = task.title || 'Untitled'
    const md = details ? `${title}\n\n${details}` : `${title}`
    // Render markdown to compute display intent (future HTML tooltip overlay can use this)
    // const _html = markdownToSafeHtml(md)
    // Use Pixi Text with basic markup fallback: render markdown-stripped for width; show HTML in lightweight tooltip box overlay
    let tipBox = (this as any).__taskHtmlTip as Container | undefined
    if (!tipBox) {
      const box = new Container()
      const bg = new Graphics()
      box.addChild(bg)
      const t = new Text({ text: '', style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 12, fill: 0xffffff, align: 'left', wordWrap: true, wordWrapWidth: 280 } })
        ; (t as any).resolution = computeTextResolution(1, 1)
      box.addChild(t)
        ; (box as any).__bg = bg
        ; (box as any).__t = t
        ; (box as any).eventMode = 'none'
      this.layers.dragLayer.addChild(box)
        ; (this as any).__taskHtmlTip = box
      tipBox = box
    }
    const textNode = (tipBox as any).__t as Text
    // Strip markdown for Text measurement only
    const plain = (md || '').replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, '$1').replace(/[*_`]/g, '')
    textNode.text = plain
    const padding = 8
    const tx = Math.round(x + 10)
    const ty = Math.round(Math.max(0, taskLayout.topY - (textNode.height + padding * 2) - 6))
    tipBox!.x = tx
    tipBox!.y = ty
    // Background: draw a callout with a slanted left edge that is flush with the stem
    const bg = (tipBox as any).__bg as Graphics
    bg.clear()
    const boxW = Math.max(160, textNode.width + padding * 2)
    const boxH = textNode.height + padding * 2
    // Align left edge with stem while anchoring at top-left corner
    const rStem = _config.TASK_HEIGHT / 2
    const headRightXTmp = Math.round(taskLayout.startX + rStem * 2)
    const headYTmp = Math.round(taskLayout.centerY)
    const anchorAbsX = Math.round(tipBox!.x) // top-left corner of tooltip
    const anchorAbsY = Math.round(tipBox!.y)
    const dxStem = headRightXTmp - anchorAbsX
    const dyStem = headYTmp - anchorAbsY
    const lenStem = Math.max(1, Math.hypot(dxStem, dyStem))
    const ux = dxStem / lenStem
    const uy = dyStem / lenStem
    // Intersection of the stem-aligned line through (0,0) with y = boxH (tooltip bottom)
    let lbLocalX = 0
    if (Math.abs(uy) > 0.0001) {
      lbLocalX = (boxH / uy) * ux
    } else {
      lbLocalX = 0
    }
    // Polygon path: top-left (0,0) -> rightTop -> rightBottom -> leftBottom(on y=boxH along stem) -> close
    bg.beginPath()
    bg.moveTo(0, 0)
    bg.lineTo(boxW, 0)
    bg.lineTo(boxW, boxH)
    bg.lineTo(lbLocalX, boxH)
    bg.closePath()
    bg.fill({ color: 0x111111, alpha: 0.9 })
    bg.stroke({ width: 1, color: 0xFFFFFF, alpha: 0.2 })
    textNode.x = padding
    textNode.y = padding

    // Draw a thin stem from tooltip box to the right side of the note head (circle)
    const l2 = this.taskLayouts.get(id)
    if (l2) {
      const r = _config.TASK_HEIGHT / 2
      const headRightX = Math.round(l2.startX + r * 2)
      const headY = Math.round(l2.centerY)
      // no-op: boxLeftX/boxMidY no longer needed after anchoring stem at top-left
      let stem = (this as any).__tooltipStem as Graphics | undefined
      if (!stem) {
        stem = new Graphics()
          ; (stem as any).eventMode = 'none'
        this.layers.dragLayer.addChild(stem)
          ; (this as any).__tooltipStem = stem
      }
      stem.clear()
      // Stem from tooltip top-left to note head right side
      stem.moveTo(anchorAbsX, anchorAbsY)
      stem.lineTo(headRightX, headY)
      // Match tooltip color (0x111111) and make stem slightly thicker for readability
      stem.stroke({ width: 3, color: 0x111111, alpha: 0.9 })
    }

    // Draw faint hover row highlight using the actual staff bounds (from first to last staff line)
    try {
      const lines = Math.max(1, _config.STAFF_LINE_COUNT)
      const gap = Math.max(1, _config.STAFF_LINE_SPACING)
      const lineBandHeight = (lines - 1) * gap
      const topMargin = _config.TOP_MARGIN || 0
      const spacing = Math.max(1, _config.STAFF_SPACING)
      const staffIndex = Math.max(0, Math.floor((y - topMargin) / spacing))
      const topLines = Math.round(topMargin + staffIndex * spacing)
      const h = Math.max(1, lineBandHeight)
      // Draw an effectively-infinite width so the band is not tied to current screen width
      const left = -100000
      const w = 200000
      let hr = this.hoverRow
      if (!hr) {
        hr = new Graphics()
          ; (hr as any).eventMode = 'none'
        this.layers.dragLayer.addChild(hr)
        this.hoverRow = hr
      }
      hr.clear()
      hr.rect(left, topLines, w, h)
      hr.fill({ color: 0xffffff, alpha: 0.05 })
    } catch (err) { devLog.warn('hover row highlight failed', err) }
  }

  destroy(): void {
    // Plugin teardown
    for (const p of this.plugins) {
      try { p.onDestroy?.() } catch (err) { devLog.warn('plugin.onDestroy failed', err) }
    }
    // Destroy graphics and containers
    try {
      for (const [, g] of this.dependencyGraphics) { try { (g as any).destroy?.() } catch (err) { devLog.warn('dependencyGraphics.destroy item failed', err) } }
      for (const [, c] of this.taskContainers) { try { (c as any).destroy?.({ children: true }) } catch (err) { devLog.warn('taskContainer.destroy item failed', err) } }
    } catch (err) { devLog.warn('scene destroy loop failed', err) }
    this.dependencyGraphics.clear()
    this.taskContainers.clear()
    this.taskLayouts.clear()
    this.taskAnchors.clear()
    this.taskData.clear()
  }
}

// Example plugin export for consumers to import and register
export const ExampleStatusGlyphPlugin: RendererPlugin = {}
