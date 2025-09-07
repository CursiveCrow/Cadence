import { Application, Container, Graphics, Text, Sprite, Texture } from 'pixi.js'
import { TIMELINE, dayIndexFromISO, pixelsPerDay, computeScaledTimeline, EPS, nearlyZero } from './timelineMath'
import { drawGridBackground, drawStaffLines } from './draw/grid'
import { statusToColor, renderNoteHeadAndLine, renderLabelWithMast } from './draw/tasks'
import { drawMeasurePair, drawTodayMarker } from './draw/markers'
// Removed alignment quantization; use straightforward world↔screen math
import { computeDateHeaderHeight, computeDateHeaderViewModel } from './dateHeader'
import { PROJECT_START_DATE } from '../config'
import type { Staff, Task, Dependency } from '../types'

interface Data { staffs: Staff[]; tasks: Task[]; dependencies: Dependency[]; selection: string[] }

export class Renderer {
  private canvas: HTMLCanvasElement
  private app: Application | null = null
  private root: Container | null = null
  private layers: { viewport: Container; background: Container; tasks: Container; dependencies: Container; hud: Container } | null = null
  private ready = false
  private hoverX: number | null = null
  private hoverY: number | null = null
  private verticalScale: number = 1
  private previewG: Graphics | null = null
  private depPreviewG: Graphics | null = null
  private tooltipBox: Graphics | null = null
  private tooltipStem: Graphics | null = null
  private tooltipTitle: Text | null = null
  private tooltipInfo: Text | null = null

  // Persistent HUD layer and cached nodes (to reduce allocations per frame)
  private hudPersistent: Container | null = null
  private hudNodes: {
    headerBg?: Graphics
    sbLayer?: Container
    sbMask?: Graphics
    sbBg?: Graphics
    bloomL?: Sprite
    bloomS?: Sprite
    streak?: Sprite
    monthTicks?: Graphics
    dayTicks?: Graphics
    labelsMonth?: Text[]
    labelsDay?: Text[]
    labelsHour?: Text[]
  } = {}

  // Cached CSS color lookups
  private colorCache: Map<string, number> = new Map()

  // Task graphics cache
  private taskCache: Map<string, { head: Graphics; labelBox: Graphics; labelMast: Graphics; labelText: Text; glyph?: Text }> = new Map()

  // UI overlay state (header + sidebar drawn in screen space)
  private ui: {
    headerHeight: number
    sidebarWidth: number
    rects: Record<string, { x: number; y: number; w: number; h: number }>
    modal: null | 'staffManager'
    tmpStaffName: string
    tmpStaffLines: number
    sheenX: number
    sheenY: number
    lagX: number
    lagY: number
  } = { headerHeight: 56, sidebarWidth: 220, rects: {}, modal: null, tmpStaffName: '', tmpStaffLines: 5, sheenX: 0, sheenY: 0, lagX: 0, lagY: 0 }

  private gradientTex: { radialSmall?: Texture; radialLarge?: Texture; streak?: Texture } = {}

  // Hidden input to capture text without rendering DOM UI; visuals remain in Pixi
  private hiddenInput: HTMLInputElement | null = null
  private editing: { key: string; onCommit: (value: string) => void; type: 'text' | 'number' } | null = null

  // Callbacks for state updates (Redux actions injected by host)
  private actions: {
    addTask?: (task: Task) => void
    updateTask?: (payload: { id: string; updates: Partial<Task> }) => void
    addDependency?: (dep: Dependency) => void
    addStaff?: (staff: Staff) => void
    updateStaff?: (payload: { id: string; updates: Partial<Staff> }) => void
    deleteStaff?: (id: string) => void
    reorderStaffs?: (payload: { staffId: string; newPosition: number }) => void
    setSelection?: (ids: string[]) => void
  } = {}

  private viewport = { x: 0, y: 0, zoom: 1 }
  private data: Data = { staffs: [], tasks: [], dependencies: [], selection: [] }
  private layout: { id: string; x: number; y: number; w: number; h: number }[] = []
  private metrics: { pxPerDay: number; staffBlocks: { id: string; yTop: number; yBottom: number; lineSpacing: number }[] } = { pxPerDay: 24, staffBlocks: [] }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.initPixi()
  }

  // Simple, explicit note height calculator. Uses staff line spacing; clamps to sane bounds.
  private computeNoteHeight(lineSpacing: number): number {
    const raw = Math.round(lineSpacing * 0.8) // 80% of spacing feels balanced for circular head
    const h = Math.max(12, Math.min(28, raw))
    return h
  }

  private async initPixi() {
    try {
      const rect = this.canvas.getBoundingClientRect()
      const width = Math.max(rect.width, 1) || window.innerWidth
      const height = Math.max(rect.height, 1) || window.innerHeight

      const app = new Application()
      await app.init({
        canvas: this.canvas as any,
        width,
        height,
        resolution: Math.max(1, Math.min(2, (window.devicePixelRatio || 1))),
        autoDensity: true,
        antialias: true,
        clearBeforeRender: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
        resizeTo: (this.canvas.parentElement || window) as any,
        eventFeatures: { move: true, click: true, wheel: true, globalMove: true },
        hello: false,
      })

      this.app = app
      this.root = app.stage

      const viewport = new Container()
      const background = new Container()
      const tasks = new Container()
      const dependencies = new Container()
      const hudPersistent = new Container()
      const hud = new Container()
      viewport.addChild(background)
      viewport.addChild(dependencies)
      viewport.addChild(tasks)
      this.root.addChild(viewport)
      // persistent HUD first (backgrounds, gradients), then dynamic HUD on top
      this.root.addChild(hudPersistent)
      this.root.addChild(hud)
      this.layers = { viewport, background, tasks, dependencies, hud }
      this.hudPersistent = hudPersistent

      this.ready = true
      // Draw once after init
      this.render()
      // Prepare hidden input for text capture
      this.ensureHiddenInput()
    } catch (err) {
      if (import.meta?.env?.DEV) console.debug('[Renderer]initPixi failed', err)
      // If PIXI init fails, leave ready=false; methods will no-op
    }
  }

  // Resolve a CSS variable color to a numeric hex for Pixi fills
  private cssVarColorToHex(varName: string, fallback: number): number {
    try {
      if (this.colorCache.has(varName)) return this.colorCache.get(varName) as number
      const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
      if (!v) return fallback
      if (v.startsWith('#')) {
        const hex = v.slice(1)
        const n = parseInt(hex, 16)
        if (!Number.isNaN(n)) { this.colorCache.set(varName, n); return n }
      }
      const m = v.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
      if (m) {
        const r = Math.max(0, Math.min(255, parseInt(m[1]!, 10)))
        const g = Math.max(0, Math.min(255, parseInt(m[2]!, 10)))
        const b = Math.max(0, Math.min(255, parseInt(m[3]!, 10)))
        const n = (r << 16) | (g << 8) | b
        this.colorCache.set(varName, n)
        return n
      }
    } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]cssVarColorToHex', err) }
    return fallback
  }

  private ensureHudPersistentNodes(screenW: number, screenH: number, sidebarW: number, headerH: number) {
    if (!this.hudPersistent) return
    const hp = this.hudPersistent

    // Sidebar masked layer
    if (!this.hudNodes.sbLayer) {
      this.hudNodes.sbLayer = new Container()
      hp.addChild(this.hudNodes.sbLayer)
    }
    if (!this.hudNodes.sbMask) {
      this.hudNodes.sbMask = new Graphics()
      this.hudNodes.sbLayer.mask = this.hudNodes.sbMask
      hp.addChild(this.hudNodes.sbMask)
    }
    // Update mask geometry
    const sbMask = this.hudNodes.sbMask
    sbMask!.clear()
    sbMask!.rect(0, 0, sidebarW, screenH)
    sbMask!.fill({ color: 0xffffff, alpha: 1 })

    // Sidebar background panel
    if (!this.hudNodes.sbBg) {
      this.hudNodes.sbBg = new Graphics()
      this.hudNodes.sbLayer!.addChild(this.hudNodes.sbBg)
    }
    const sbBg = this.hudNodes.sbBg!
    sbBg.clear()
    sbBg.rect(0, 0, sidebarW, screenH)
    sbBg.fill({ color: 0x0a0f17, alpha: 0.96 })
    for (let i = 0; i < 5; i++) {
      const inset = i * 3
      sbBg.roundRect(inset, inset, Math.max(0, sidebarW - inset * 2), Math.max(0, screenH - inset * 2), 10)
      sbBg.fill({ color: 0x0b1220, alpha: 0.05 - i * 0.008 })
    }
    sbBg.rect(sidebarW - 1, 0, 1, screenH)
    sbBg.fill({ color: 0xffffff, alpha: 0.08 })

    // Header background (full-width strip under ticks/labels)
    if (!this.hudNodes.headerBg) {
      this.hudNodes.headerBg = new Graphics()
      // Header background goes above persistent sidebar bg, but below dynamic ticks/labels
      hp.addChild(this.hudNodes.headerBg)
    }
    const headerBg = this.hudNodes.headerBg!
    headerBg.clear()
    headerBg.rect(0, 0, screenW, headerH)
    headerBg.fill({ color: 0x0c0b0a, alpha: 0.92 })
    headerBg.rect(0, headerH - 1, screenW, 1)
    headerBg.fill({ color: 0xffffff, alpha: 0.08 })

    // Gradient sprites: create once and update positions/sizes
    this.ensureGradientTextures()
    if (!this.hudNodes.bloomL) {
      this.hudNodes.bloomL = new Sprite(this.gradientTex.radialLarge!)
      this.hudNodes.bloomL.blendMode = 'screen'
      this.hudNodes.bloomL.anchor.set(0.5)
      this.hudNodes.sbLayer!.addChild(this.hudNodes.bloomL)
    }
    if (!this.hudNodes.bloomS) {
      this.hudNodes.bloomS = new Sprite(this.gradientTex.radialSmall!)
      this.hudNodes.bloomS.blendMode = 'screen'
      this.hudNodes.bloomS.anchor.set(0.5)
      this.hudNodes.sbLayer!.addChild(this.hudNodes.bloomS)
    }
    if (!this.hudNodes.streak) {
      this.hudNodes.streak = new Sprite(this.gradientTex.streak!)
      this.hudNodes.streak.blendMode = 'screen'
      this.hudNodes.streak.anchor.set(0.5)
      this.hudNodes.sbLayer!.addChild(this.hudNodes.streak)
    }

    // Update gradient sprite transforms based on current lag target
    const lagX = Math.round(this.ui.lagX)
    const lagY = Math.round(this.ui.lagY)
    const bloomL = this.hudNodes.bloomL!
    bloomL.x = Math.max(40, Math.min(sidebarW - 40, lagX - 20))
    bloomL.y = Math.max(40, Math.min(screenH - 40, lagY + 30))
    bloomL.alpha = 0.35
    const bloomLSize = Math.min(420, Math.max(220, Math.floor(Math.min(sidebarW, screenH) * 0.8)))
    bloomL.width = bloomLSize
    bloomL.height = bloomLSize

    const bloomS = this.hudNodes.bloomS!
    bloomS.x = Math.max(24, Math.min(sidebarW - 24, lagX + 14))
    bloomS.y = Math.max(24, Math.min(screenH - 24, lagY - 10))
    bloomS.alpha = 0.6
    const bloomSSize = Math.min(260, Math.max(140, Math.floor(Math.min(sidebarW, screenH) * 0.45)))
    bloomS.width = bloomSSize
    bloomS.height = bloomSSize

    const streak = this.hudNodes.streak!
    streak.x = Math.max(60, Math.min(sidebarW - 60, lagX))
    streak.y = Math.max(36, Math.min(screenH - 36, lagY + 12))
    streak.rotation = -0.25
    streak.alpha = 0.4
    streak.width = Math.min(sidebarW * 0.9, 380)
    streak.height = 56
  }

  // Map time signature "N/D" to days-per-measure where the denominator D directly
  // defines the number of days per measure. If invalid, default to 4.
  private measureLengthDaysFromTimeSignature(sig?: string): number {
    try {
      const parts = (sig || '4/4').split('/')
      const d = Math.max(1, Math.round(parseInt(parts[1] || '4', 10)))
      return Math.max(1, d)
    } catch (err) {
      if (import.meta?.env?.DEV) console.debug('[Renderer]measureLengthDaysFromTimeSignature', err)
      return 4
    }
  }

  setViewport(v: { x: number; y: number; zoom: number }) {
    this.viewport = { ...v }
  }

  setVerticalScale(scale: number) {
    this.verticalScale = Math.max(0.5, Math.min(3, scale || 1))
  }

  setData(data: Data) {
    this.data = data
  }

  resize() {
    if (!this.app) return
    try { this.app.renderer.resize(this.canvas.clientWidth || 1, this.canvas.clientHeight || 1) } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]resize', err) }
  }

  private clearContainers() {
    if (!this.layers) return
    const destroyAll = (c: Container) => {
      try {
        const removed = c.removeChildren()
        for (const ch of removed) {
          try { (ch as any).destroy?.({ children: true }) } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]destroy child', err) }
        }
      } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]removeChildren', err) }
    }
    destroyAll(this.layers.background)
    // Do not destroy task nodes; we maintain our own cache for reuse
    try { this.layers.tasks.removeChildren() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]tasks.removeChildren', err) }
    destroyAll(this.layers.dependencies)
    destroyAll(this.layers.hud)
    // Invalidate cached graphics that may have been destroyed by cleanup
    this.previewG = null
    this.depPreviewG = null
    this.tooltipBox = null
    this.tooltipStem = null
    this.tooltipTitle = null
    this.tooltipInfo = null
  }

  render() {
    if (!this.app || !this.layers || !this.ready) return

    // Throttle re-rendering to animation frames to avoid event storm freezes
    this.clearContainers()
    // Reset UI hit-areas
    this.ui.rects = {}

    const width = Math.max(1, this.app.screen.width)
    const height = Math.max(1, this.app.screen.height)
    const { LEFT_MARGIN, DAY_WIDTH } = TIMELINE
    const { zoom, x, y } = this.viewport
    const pxPerDay = pixelsPerDay(zoom, DAY_WIDTH)
    this.metrics = { pxPerDay, staffBlocks: [] }
    this.layout = []
    const vx = x

    // Content background (uses CSS variable --ui-color-bg)
    const bg = new Graphics()
    const bgColor = this.cssVarColorToHex('--ui-color-bg', 0x292524)
    bg.rect(0, 0, width, Math.max(0, height))
    bg.fill({ color: bgColor, alpha: 1 })
    // subtle vignette edges to create depth and focus
    bg.rect(0, 0, width, Math.max(0, height))
    bg.fill({ color: 0x000000, alpha: 0.06 })
    this.layers.background.addChild(bg)

    // No internal left gutter for world space: canvas grid starts at x=0.
    // Sidebar is drawn as a HUD overlay on top (not part of world transforms).

    for (const g of drawGridBackground({ width, height, LEFT_MARGIN, pxPerDay, viewportXDays: vx, bgColor })) {
      this.layers.background.addChild(g)
    }

    // Vertical scaling for staff geometry
    const scaled = computeScaledTimeline(this.verticalScale)
    const scaledTopMargin = scaled.topMargin
    const scaledStaffSpacing = scaled.staffSpacing
    const scaledLineSpacing = scaled.lineSpacing

    // Draw staffs as groups of lines
    let yCursor = scaledTopMargin - y
    for (const staff of this.data.staffs) {
      const spacing = scaledLineSpacing
      this.layers.background.addChild(drawStaffLines({ width, LEFT_MARGIN, yTop: yCursor, lineSpacing: spacing, lines: staff.numberOfLines }))

      // yBottom aligns with the last staff line (not one line beyond)
      this.metrics.staffBlocks.push({ id: staff.id, yTop: yCursor, yBottom: yCursor + (staff.numberOfLines - 1) * spacing, lineSpacing: spacing })
      yCursor += scaledStaffSpacing
    }

    // Measure markers (paired bars) per staff, based on each staff's time signature
    try {
      const offsetDays = 0
      const pairSpacingPx = 4
      const thickW = 3
      const thinW = 1
      const leftWorldDays = vx + (0 - LEFT_MARGIN) / Math.max(pxPerDay, EPS)
      const rightWorldDays = vx + (width - LEFT_MARGIN) / Math.max(pxPerDay, EPS)
      for (const sb of this.metrics.staffBlocks) {
        const staff = (this.data.staffs || []).find(s => s.id === sb.id)
        const stepDays = this.measureLengthDaysFromTimeSignature(staff?.timeSignature)
        const firstK = Math.floor((leftWorldDays - offsetDays) / Math.max(stepDays, EPS)) - 1
        const lastK = Math.ceil((rightWorldDays - offsetDays) / Math.max(stepDays, EPS)) + 1
        for (let k = firstK; k <= lastK; k++) {
          const dayIndex = k * stepDays + offsetDays
          const xScreen = LEFT_MARGIN + (dayIndex - vx) * pxPerDay
          const xThick = Math.round(xScreen) + (thickW % 2 ? 0.5 : 0)
          const xThin = Math.round(xScreen - pairSpacingPx) + (thinW % 2 ? 0.5 : 0)
          if (xThin > width + 2) break
          if (xThick < LEFT_MARGIN + 2) continue
          if (xThin < LEFT_MARGIN + 2) continue
          const yTopStaff = Math.round(sb.yTop)
          const yBottomStaff = Math.round(sb.yBottom)
          this.layers.background.addChild(drawMeasurePair(xThick, xThin, yTopStaff, yBottomStaff))
        }
      }
    } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]measure markers', err) }

    // Today marker
    try {
      const now = new Date()
      const yyyy = now.getUTCFullYear()
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(now.getUTCDate()).padStart(2, '0')
      const isoToday = `${yyyy}-${mm}-${dd}`
      const dayIndex = dayIndexFromISO(isoToday, PROJECT_START_DATE)
      const xToday = LEFT_MARGIN + (dayIndex - vx) * pxPerDay
      this.layers.background.addChild(drawTodayMarker(xToday, Math.max(0, height)))
    } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]today marker', err) }

    // Draw tasks (note pill shape with status glyph) using cached nodes per task
    const visibleTaskIds: string[] = []
    for (const task of this.data.tasks) {
      const staffBlock = this.metrics.staffBlocks.find(b => b.id === task.staffId)
      if (!staffBlock) continue
      const lineStep = staffBlock.lineSpacing / 2
      const centerY = staffBlock.yTop + task.staffLine * lineStep
      const h = this.computeNoteHeight(staffBlock.lineSpacing)
      const yTop = centerY - h / 2

      // compute x from startDate relative to PROJECT_START_DATE
      const day = dayIndexFromISO(task.startDate, PROJECT_START_DATE)
      const xLeft = LEFT_MARGIN + (day - vx) * pxPerDay
      const w = Math.max(4, Math.round(task.durationDays * pxPerDay))

      if (xLeft + w < LEFT_MARGIN - 200 || xLeft > width + 200) continue
      if (yTop > height || yTop + h < 0) continue

      const selected = this.data.selection.includes(task.id)
      const status = (task as any).status || 'not_started'
      const color = statusToColor(status)
      const isHovering = this.hoverX != null && this.hoverY != null
        && (this.hoverX as number) >= xLeft && (this.hoverX as number) <= xLeft + w
        && (this.hoverY as number) >= yTop && (this.hoverY as number) <= yTop + h
      visibleTaskIds.push(task.id)

      let nodes = this.taskCache.get(task.id)
      if (!nodes) {
        nodes = {
          head: new Graphics(),
          labelBox: new Graphics(),
          labelMast: new Graphics(),
          labelText: new Text({ text: '', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 10, fill: color } }),
        }
        this.taskCache.set(task.id, nodes)
      }

      // Draw note using helper
      const g = nodes.head
      renderNoteHeadAndLine(g, {
        x: xLeft,
        yTop,
        width: w,
        height: h,
        color,
        selected,
        pxPerDay,
        status: String(status),
        hovered: isHovering,
      })

      // Status indicator glyph
      const glyphChar = this.statusToAccidental(String(status))
      if (glyphChar) {
        if (!nodes.glyph) {
          nodes.glyph = new Text({ text: glyphChar, style: { fontFamily: 'serif', fontSize: Math.max(10, Math.round(h * 0.7)), fill: 0xffffff } })
        }
        nodes.glyph.text = glyphChar
          ; (nodes.glyph.style as any).fontSize = Math.max(10, Math.round(h * 0.7))
        nodes.glyph.x = Math.round(xLeft + h / 2 - nodes.glyph.width / 2)
        nodes.glyph.y = Math.round(yTop + h / 2 - nodes.glyph.height / 2)
      } else if (nodes.glyph) {
        // keep cached glyph but skip adding if empty
      }

      // Label with mast
      const labelText = nodes.labelText
        ; (labelText.style as any).fill = (selected || isHovering) ? 0xffffff : color
      renderLabelWithMast(nodes.labelBox, nodes.labelMast, labelText, {
        xLeft,
        yTop,
        h,
        text: task.title || '',
        headColor: color,
        width,
        height,
        selected,
        hovered: isHovering,
      })

      // Reattach nodes in z-order
      this.layers.tasks.addChild(g)
      this.layers.tasks.addChild(nodes.labelBox)
      this.layers.tasks.addChild(nodes.labelMast)
      this.layers.tasks.addChild(labelText)
      if (nodes.glyph) this.layers.tasks.addChild(nodes.glyph)

      this.layout.push({ id: task.id, x: xLeft, y: yTop, w, h })
    }

    // Prune unused cached task nodes
    try {
      for (const [id, nodes] of this.taskCache) {
        if (!visibleTaskIds.includes(id)) {
          try { nodes.head.destroy() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]destroy head', err) }
          try { nodes.labelBox.destroy() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]destroy labelBox', err) }
          try { nodes.labelMast.destroy() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]destroy labelMast', err) }
          try { (nodes.labelText as any).destroy?.() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]destroy labelText', err) }
          if (nodes.glyph) { try { (nodes.glyph as any).destroy?.() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]destroy glyph', err) } }
          this.taskCache.delete(id)
        }
      }
    } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]prune cache', err) }

    // Draw dependencies (musical slur curves)
    for (const dep of this.data.dependencies) {
      const src = this.layout.find(r => r.id === dep.srcTaskId)
      const dst = this.layout.find(r => r.id === dep.dstTaskId)
      if (!src || !dst) continue
      const x0 = src.x + src.w
      const y0 = src.y + src.h / 2
      const x1 = dst.x
      const y1 = dst.y + dst.h / 2
      const cx1 = x0 + Math.max(30, Math.abs(x1 - x0) * 0.4)
      const cx2 = x1 - Math.max(30, Math.abs(x1 - x0) * 0.4)
      const line = new Graphics()

      // Shadow curve
      line.moveTo(Math.round(x0), Math.round(y0 + 1))
      line.bezierCurveTo(Math.round(cx1), Math.round(y0 + 1), Math.round(cx2), Math.round(y1 + 1), Math.round(x1), Math.round(y1 + 1))
      line.stroke({ width: 3, color: 0x000000, alpha: 0.2 })

      // Main curve with gradient effect
      line.moveTo(Math.round(x0), Math.round(y0))
      line.bezierCurveTo(Math.round(cx1), Math.round(y0), Math.round(cx2), Math.round(y1), Math.round(x1), Math.round(y1))
      line.stroke({ width: 2, color: 0x8B5CF6, alpha: 0.7 })

      // Highlight curve
      line.moveTo(Math.round(x0), Math.round(y0 - 1))
      line.bezierCurveTo(Math.round(cx1), Math.round(y0 - 1), Math.round(cx2), Math.round(y1 - 1), Math.round(x1), Math.round(y1 - 1))
      line.stroke({ width: 1, color: 0xC084FC, alpha: 0.4 })

      // Musical tie endpoints (like slur notation)
      line.circle(x0, y0, 3)
      line.fill({ color: 0x8B5CF6, alpha: 0.9 })
      line.circle(x0, y0, 1.5)
      line.fill({ color: 0xffffff, alpha: 0.5 })

      // Arrowhead with style
      const angle = Math.atan2(y1 - y0, x1 - x0)
      const arrow = 8
      line.beginPath()
      line.moveTo(Math.round(x1), Math.round(y1))
      line.lineTo(Math.round(x1 - arrow * Math.cos(angle - Math.PI / 5)), Math.round(y1 - arrow * Math.sin(angle - Math.PI / 5)))
      line.lineTo(Math.round(x1 - arrow * 0.6 * Math.cos(angle)), Math.round(y1 - arrow * 0.6 * Math.sin(angle)))
      line.lineTo(Math.round(x1 - arrow * Math.cos(angle + Math.PI / 5)), Math.round(y1 - arrow * Math.sin(angle + Math.PI / 5)))
      line.closePath()
      line.fill({ color: 0x8B5CF6, alpha: 0.9 })

      this.layers.dependencies.addChild(line)
    }

    // Hover vertical guideline with musical accent
    if (this.hoverX != null) {
      const gHover = new Graphics()
      const xh = Math.round(this.hoverX) + 0.5

      // Gradient line
      for (let i = 0; i < height; i += 20) {
        const alpha = 0.2 * (1 - i / height)
        gHover.moveTo(xh, i)
        gHover.lineTo(xh, Math.min(i + 10, height))
        gHover.stroke({ width: 1, color: 0xA855F7, alpha })
      }

      // Accent dots at intersections
      for (const sb of this.metrics.staffBlocks) {
        for (let i = 0; i < 5; i++) {
          const y = sb.yTop + i * sb.lineSpacing
          gHover.circle(xh, y, 2)
          gHover.fill({ color: 0xFACC15, alpha: 0.5 })
        }
      }

      this.layers.background.addChild(gHover)
    }

    // Hover row highlight with glow
    if (this.hoverY != null && this.metrics.staffBlocks.length > 0) {
      const yHover = this.hoverY
      const sb = this.metrics.staffBlocks.find(b => yHover >= b.yTop && yHover <= b.yBottom)
      if (sb) {
        const r = new Graphics()
        const height = Math.max(1, Math.round(sb.yBottom - sb.yTop))

        // Gradient glow effect
        for (let i = 0; i < 3; i++) {
          r.rect(-100000, Math.round(sb.yTop - i * 2), 200000, height + i * 4)
          r.fill({ color: 0xA855F7, alpha: 0.02 * (3 - i) })
        }

        // Main highlight
        r.rect(-100000, Math.round(sb.yTop), 200000, height)
        r.fill({ color: 0xffffff, alpha: 0.08 })

        // Top and bottom accent lines
        r.rect(-100000, Math.round(sb.yTop), 200000, 1)
        r.fill({ color: 0xC084FC, alpha: 0.3 })
        r.rect(-100000, Math.round(sb.yBottom), 200000, 1)
        r.fill({ color: 0xC084FC, alpha: 0.3 })

        this.layers.background.addChild(r)
      }
    }

    // Hover tooltip using Pixi polygon (old style)
    try {
      if (this.hoverX != null && this.hoverY != null) {
        const hovered = this.hitTest(this.hoverX, this.hoverY)
        if (hovered) {
          const layout = this.layout.find(l => l.id === hovered)
          const task = (this.data.tasks || []).find(t => t.id === hovered)
          if (layout && task) {
            const padding = 8
            const titleText = task.title || 'Task'
            const infoText = `${task.startDate} · ${Math.max(1, task.durationDays)}d`
            const title = this.tooltipTitle || new Text({ text: '', style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 12, fontWeight: 'bold', fill: 0xffffff } })
            const info = this.tooltipInfo || new Text({ text: '', style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 12, fill: 0xffffff } })
            title.text = titleText
            info.text = infoText
            const boxW = Math.max(160, Math.ceil(Math.max(title.width, info.width) + padding * 2))
            const boxH = Math.ceil(title.height + info.height + padding * 3)
            const radius = layout.h / 2
            const headX = layout.x + radius * 2
            const headY = layout.y + radius
            // Follow mouse: position box near hover point, clamped to view
            const mouseX = this.hoverX
            const mouseY = this.hoverY
            const desiredX = (mouseX ?? headX) + 16
            const desiredYTop = (mouseY ?? headY) - (boxH + 12)
            const screenW = this.app!.screen.width
            const screenH = this.app!.screen.height
            const tipX = Math.round(Math.max(LEFT_MARGIN + 2, Math.min(screenW - boxW - 2, desiredX)))
            const tipY = Math.round(desiredYTop < 0
              ? Math.min(screenH - boxH - 2, (mouseY ?? headY) + 16)
              : Math.min(screenH - boxH - 2, desiredYTop))
            // Compute slanted left edge to point towards head (lbLocalX)
            const dx = (headX - tipX)
            const dy = (headY - tipY)
            const len = Math.hypot(dx, dy) || 1
            const ux = dx / len
            const uy = dy / len
            const lbLocalX = nearlyZero(uy) ? 0 : (boxH / uy) * ux

            const bg = this.tooltipBox || new Graphics()
            bg.clear()
            bg.beginPath()
            bg.moveTo(0, 0)
            bg.lineTo(boxW, 0)
            bg.lineTo(boxW, boxH)
            bg.lineTo(lbLocalX, boxH)
            bg.closePath()
            bg.fill({ color: 0x111111, alpha: 0.9 })
            bg.stroke({ width: 1, color: 0xffffff, alpha: 0.2 })
            bg.position.set(tipX, tipY)
            if (!bg.parent) this.layers!.tasks.addChild(bg)
            this.tooltipBox = bg

            // Position text
            title.x = padding
            title.y = padding
            info.x = padding
            info.y = Math.round(title.y + title.height + padding / 2)
            if (!title.parent) this.layers!.tasks.addChild(title)
            if (!info.parent) this.layers!.tasks.addChild(info)
            title.position.set(tipX + title.x, tipY + title.y)
            info.position.set(tipX + info.x, tipY + info.y)

            // Stem line
            const stem = this.tooltipStem || new Graphics()
            stem.clear()
            stem.moveTo(tipX, tipY)
            stem.lineTo(headX, headY)
            stem.stroke({ width: 2, color: 0x111111, alpha: 0.9 })
            if (!stem.parent) this.layers!.tasks.addChild(stem)
            this.tooltipStem = stem
          }
        } else {
          // clear tooltip
          if (this.tooltipBox) { try { this.layers!.tasks.removeChild(this.tooltipBox) } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]remove tooltipBox', err) }; try { this.tooltipBox.destroy() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]destroy tooltipBox', err) }; this.tooltipBox = null }
          if (this.tooltipStem) { try { this.layers!.tasks.removeChild(this.tooltipStem) } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]remove tooltipStem', err) }; try { this.tooltipStem.destroy() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]destroy tooltipStem', err) }; this.tooltipStem = null }
          if (this.tooltipTitle) { try { this.layers!.tasks.removeChild(this.tooltipTitle) } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]remove tooltipTitle', err) }; try { (this.tooltipTitle as any).destroy?.() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]destroy tooltipTitle', err) }; this.tooltipTitle = null }
          if (this.tooltipInfo) { try { this.layers!.tasks.removeChild(this.tooltipInfo) } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]remove tooltipInfo', err) }; try { (this.tooltipInfo as any).destroy?.() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]destroy tooltipInfo', err) }; this.tooltipInfo = null }
        }
      }
    } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]tooltip', err) }

    // Finally draw HUD overlay (date header + sidebar + toolbar) in screen space
    this.drawHud(width, height)
  }

  hitTest(px: number, py: number): string | null {
    for (let i = this.layout.length - 1; i >= 0; i--) {
      const r = this.layout[i]
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r.id
    }
    return null
  }

  getTaskRect(id: string): { x: number; y: number; w: number; h: number } | null {
    const r = this.layout.find(l => l.id === id)
    return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null
  }

  getMetrics() {
    return this.metrics
  }

  setHover(x: number | null, y: number | null) {
    this.hoverX = x
    this.hoverY = y
    // drive sheen target with pointer, clamped to sidebar bounds
    try {
      if (x != null && y != null) {
        const sw = Math.max(180, Math.min(320, this.ui.sidebarWidth || 220))
        const sx = Math.max(16, Math.min(sw - 16, x))
        const sy = Math.max(16, Math.min((this.app?.screen.height || 0) - 16, y))
        this.ui.sheenX = sx
        this.ui.sheenY = sy
      }
    } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]setHover', err) }
  }

  private ensureGradientTextures() {
    const mkRadial = (size: number, inner: string, outer: string) => {
      const c = document.createElement('canvas')
      c.width = c.height = Math.max(16, size)
      const ctx = c.getContext('2d')!
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      g.addColorStop(0, inner)
      g.addColorStop(1, outer)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, size, size)
      return Texture.from(c)
    }
    const mkStreak = (w: number, h: number, from: string, to: string) => {
      const c = document.createElement('canvas')
      c.width = Math.max(16, w)
      c.height = Math.max(16, h)
      const ctx = c.getContext('2d')!
      const g = ctx.createLinearGradient(0, 0, w, 0)
      g.addColorStop(0.0, 'rgba(255,255,255,0)')
      g.addColorStop(0.15, from)
      g.addColorStop(0.5, to)
      g.addColorStop(0.85, from)
      g.addColorStop(1.0, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      return Texture.from(c)
    }
    if (!this.gradientTex.radialSmall) this.gradientTex.radialSmall = mkRadial(256, 'rgba(190,210,255,0.22)', 'rgba(190,210,255,0)')
    if (!this.gradientTex.radialLarge) this.gradientTex.radialLarge = mkRadial(512, 'rgba(160,190,255,0.16)', 'rgba(160,190,255,0)')
    if (!this.gradientTex.streak) this.gradientTex.streak = mkStreak(512, 64, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)')
  }

  setActions(actions: Partial<typeof this.actions>) {
    this.actions = { ...this.actions, ...actions }
  }

  openStaffManager() {
    this.ui.modal = 'staffManager'
  }

  closeModal() {
    this.ui.modal = null
    this.stopEditing()
  }

  handleUIAction(key: string) {
    try {
      if (key === 'sm:close') { this.closeModal(); return }
      if (key === 'sm:new:add') {
        const now = new Date().toISOString()
        const name = this.ui.tmpStaffName.trim() || `Staff ${Math.floor(Math.random() * 1000)}`
        const lines = Math.max(1, Math.min(10, Math.round(this.ui.tmpStaffLines)))
        const position = (this.data.staffs?.length || 0)
        this.actions.addStaff?.({ id: `staff-${Date.now()}`, name, numberOfLines: lines, lineSpacing: 12, position, projectId: 'demo', createdAt: now, updatedAt: now })
        this.ui.tmpStaffName = ''
        this.ui.tmpStaffLines = 5
        return
      }
      if (key.startsWith('sm:new:name')) {
        const bounds = this.ui.rects['sm:new:name']
        this.startEditing('sm:new:name', bounds, this.ui.tmpStaffName, 'text', (v) => { this.ui.tmpStaffName = v; this.render() })
        return
      }
      if (key === 'sm:new:lines:inc') { this.ui.tmpStaffLines = Math.min(10, this.ui.tmpStaffLines + 1); return }
      if (key === 'sm:new:lines:dec') { this.ui.tmpStaffLines = Math.max(1, this.ui.tmpStaffLines - 1); return }

      if (key.startsWith('sm:item:')) {
        const parts = key.split(':')
        const id = parts[2]
        const action = parts[3]
        const staff = (this.data.staffs || []).find(s => s.id === id)
        if (!staff) return
        if (action === 'del') { this.actions.deleteStaff?.(id); return }
        if (action === 'up' || action === 'down') {
          const idx = (this.data.staffs || []).findIndex(s => s.id === id)
          const newPos = action === 'up' ? Math.max(0, idx - 1) : Math.min((this.data.staffs || []).length - 1, idx + 1)
          this.actions.reorderStaffs?.({ staffId: id, newPosition: newPos }); return
        }
        if (action === 'name') {
          const bounds = this.ui.rects[`sm:item:${id}:name`]
          this.startEditing(`sm:item:${id}:name`, bounds, staff.name || '', 'text', (v) => this.actions.updateStaff?.({ id, updates: { name: v } }))
          return
        }
        if (action === 'lines:inc') { this.actions.updateStaff?.({ id, updates: { numberOfLines: Math.min(10, (staff.numberOfLines || 5) + 1) } }); return }
        if (action === 'lines:dec') { this.actions.updateStaff?.({ id, updates: { numberOfLines: Math.max(1, (staff.numberOfLines || 5) - 1) } }); return }
        if (action === 'ts') {
          const bounds = this.ui.rects[`sm:item:${id}:ts`]
          this.startEditing(`sm:item:${id}:ts`, bounds, staff.timeSignature || '4/4', 'text', (v) => this.actions.updateStaff?.({ id, updates: { timeSignature: v } }))
          return
        }
      }
    } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]handleUIAction', err) }
  }

  private ensureHiddenInput() {
    try {
      if (this.hiddenInput) return
      const input = document.createElement('input')
      input.type = 'text'
      Object.assign(input.style, { position: 'absolute', opacity: '0', pointerEvents: 'none', zIndex: '0', left: '0px', top: '0px', width: '1px', height: '1px' })
      document.body.appendChild(input)
      input.addEventListener('blur', () => {
        if (this.editing) {
          try { this.editing.onCommit(input.value) } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]commit edit', err) }
          this.editing = null
        }
      })
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { try { (e.target as HTMLInputElement).blur() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]enter blur', err) } }
        if (e.key === 'Escape') { this.editing = null; try { (e.target as HTMLInputElement).blur() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]escape blur', err) } }
      })
      this.hiddenInput = input
    } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]ensureHiddenInput', err) }
  }

  private startEditing(key: string, bounds: { x: number; y: number; w: number; h: number } | undefined, initial: string, type: 'text' | 'number', onCommit: (value: string) => void) {
    this.ensureHiddenInput()
    const input = this.hiddenInput
    if (!input || !bounds) return
    this.editing = { key, onCommit, type }
    input.type = type === 'number' ? 'number' : 'text'
    input.value = String(initial ?? '')
    input.style.left = `${Math.round(bounds.x)}px`
    input.style.top = `${Math.round(bounds.y)}px`
    try { input.focus(); input.select() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]startEditing focus', err) }
  }

  private stopEditing() {
    try { this.hiddenInput?.blur() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]stopEditing', err) }
    this.editing = null
  }

  // --- HUD (header + sidebar) ---

  private drawHud(screenW: number, screenH: number) {
    if (!this.layers) return
    const hud = this.layers.hud

    // Update header height from zoom
    const headerH = computeDateHeaderHeight(this.viewport.zoom || 1)
    this.ui.headerHeight = headerH

    // Sidebar width from localStorage once
    if (!Number.isFinite(this.ui.sidebarWidth) || this.ui.sidebarWidth <= 0) {
      this.ui.sidebarWidth = this.readSidebarWidth()
    }
    const sidebarW = Math.max(180, Math.min(320, Math.round(this.ui.sidebarWidth)))
    this.ui.sidebarWidth = sidebarW

    // Ensure persistent HUD (header bg, sidebar bg, gradient sprites)
    if (!Number.isFinite(this.ui.sheenX) || !Number.isFinite(this.ui.sheenY)) {
      this.ui.sheenX = Math.round(sidebarW * 0.6)
      this.ui.sheenY = Math.round(screenH * 0.3)
      this.ui.lagX = this.ui.sheenX
      this.ui.lagY = this.ui.sheenY
    }
    // Ease lag towards target
    this.ui.lagX += (this.ui.sheenX - this.ui.lagX) * 0.08
    this.ui.lagY += (this.ui.sheenY - this.ui.lagY) * 0.08
    this.ensureHudPersistentNodes(screenW, screenH, sidebarW, headerH)

    // Date header ticks/labels (fixed to screen space)
    try {
      const vm = computeDateHeaderViewModel({
        viewport: this.viewport,
        projectStart: PROJECT_START_DATE,
        leftMargin: TIMELINE.LEFT_MARGIN,
        dayWidth: TIMELINE.DAY_WIDTH,
        width: screenW,
      })
      // Month ticks
      if (!this.hudNodes.monthTicks) { this.hudNodes.monthTicks = new Graphics() }
      const monthTicks = this.hudNodes.monthTicks
      monthTicks!.clear()
      for (const x of vm.monthTickXs) {
        monthTicks!.moveTo(Math.round(x) + 0.5, 2)
        monthTicks!.lineTo(Math.round(x) + 0.5, headerH - 2)
        monthTicks!.stroke({ width: 2, color: 0x7c3aed, alpha: 0.45 })
      }
      hud.addChild(monthTicks!)

      // Day ticks
      if (!this.hudNodes.dayTicks) { this.hudNodes.dayTicks = new Graphics() }
      const dayTicks = this.hudNodes.dayTicks
      dayTicks!.clear()
      for (const x of vm.dayTickXs) {
        dayTicks!.moveTo(Math.round(x) + 0.5, 2)
        dayTicks!.lineTo(Math.round(x) + 0.5, headerH - 2)
        dayTicks!.stroke({ width: 1, color: 0xffffff, alpha: 0.22 })
      }
      hud.addChild(dayTicks!)

      // Layout bands similar to CSS component
      const bandH = 24
      const daysProgress = Math.max(0, Math.min(1, (this.viewport.zoom - 0.75) / 0.25))
      const hoursProgress = Math.max(0, Math.min(1, (this.viewport.zoom - 2) / 0.5))
      const monthTop = 6
      const dayTop = Math.round(bandH * daysProgress)
      const hourTop = Math.round(bandH + bandH * hoursProgress)

      // Prepare label pools
      const ensurePool = (key: 'labelsMonth' | 'labelsDay' | 'labelsHour') => {
        if (!this.hudNodes[key]) this.hudNodes[key] = []
      }
      ensurePool('labelsMonth'); ensurePool('labelsDay'); ensurePool('labelsHour')

      const reuseLabels = (pool: Text[], data: { text: string; x: number }[], y: number, size: number, alpha: number, bold?: boolean) => {
        const count = data.length
        // create or trim pool to size
        while (pool.length < count) {
          const t = new Text({ text: '', style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: size, fontWeight: bold ? 'bold' : 'normal', fill: 0xffffff } })
          pool.push(t)
        }
        while (pool.length > count) {
          const t = pool.pop()!
          try { t.destroy() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]destroy pooled label', err) }
        }
        // update and attach
        for (let i = 0; i < count; i++) {
          const d = data[i]
          const t = pool[i]
          t.text = d.text
            ; (t.style as any).fontSize = size
            ; (t.style as any).fontWeight = bold ? 'bold' : 'normal'
            ; (t.style as any).fill = 0xffffff
          t.alpha = alpha
          t.x = Math.round(d.x)
          t.y = Math.round(y)
          hud.addChild(t)
        }
      }

      reuseLabels(this.hudNodes.labelsMonth!, vm.monthLabels.map(d => ({ text: d.text, x: d.x + 6 })), monthTop, 12, 0.95, true)
      reuseLabels(this.hudNodes.labelsDay!, vm.dayLabels.map(d => ({ text: d.text, x: d.x + 5 })), dayTop + 4, 11, 0.85)
      reuseLabels(this.hudNodes.labelsHour!, vm.hourLabels.map(d => ({ text: d.text, x: d.x })), hourTop + 4, 10, 0.75)
    } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]drawHud header', err) }

    // Right rim highlight stays above mask (crisp boundary)
    const rim = new Graphics()
    rim.rect(sidebarW - 2, 0, 2, screenH)
    rim.fill({ color: 0xffffff, alpha: 0.08 })
    hud.addChild(rim)

    // Sidebar header controls
    const pad = 10
    const hdrY = Math.max(8, Math.round(this.ui.headerHeight + 8))

    // "Staves" label
    const staves = new Text({ text: 'Staves', style: { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', fontSize: 12, fontWeight: 'bold', fill: 0xbcc3d6 } })
    staves.x = pad
    staves.y = hdrY
    hud.addChild(staves)

    // Buttons: Add Note, Manage (in sidebar header)
    const btnY = hdrY
    const btnH = 22
    const makeButton = (key: string, label: string, x: number) => {
      const t = new Text({ text: label, style: { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', fontSize: 11, fill: 0xffffff } })
      const w = Math.round(t.width + 16)
      const bg = new Graphics()
      bg.roundRect(x, btnY - 2, w, btnH, 6)
      bg.fill({ color: 0x7c3aed, alpha: 0.9 })
      bg.stroke({ width: 1, color: 0xffffff, alpha: 0.2 })
      hud.addChild(bg)
      t.x = Math.round(x + 8)
      t.y = Math.round(btnY + 2)
      hud.addChild(t)
      this.ui.rects[key] = { x, y: btnY - 2, w, h: btnH }
      return x + w + 8
    }
    let nextX = pad + Math.round(staves.width) + 10
    nextX = makeButton('btn:addNote', '+ Add Note', nextX)
    nextX = makeButton('btn:manage', 'Manage', nextX)

    // Toolbar button on header (top-right): Link Selected
    const canLink = (this.data.selection || []).length === 2
    const linkLabel = 'Link Selected'
    const linkText = new Text({ text: linkLabel, style: { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', fontSize: 12, fill: 0xffffff } })
    const linkW = Math.round(linkText.width + 18)
    const linkX = Math.max(8, screenW - linkW - 12)
    const linkY = 8
    const linkBg = new Graphics()
    linkBg.roundRect(linkX, linkY, linkW, 26, 6)
    linkBg.fill({ color: canLink ? 0x2563eb : 0x374151, alpha: 0.95 })
    linkBg.stroke({ width: 1, color: 0xffffff, alpha: 0.18 })
    hud.addChild(linkBg)
    linkText.x = Math.round(linkX + 9)
    linkText.y = Math.round(linkY + 6)
    hud.addChild(linkText)
    this.ui.rects['btn:link'] = { x: linkX, y: linkY, w: linkW, h: 26 }

    // Staff labels aligned to staff centers (right-aligned text inside sidebar)
    try {
      for (const sb of this.metrics.staffBlocks) {
        const staff = (this.data.staffs || []).find(s => s.id === sb.id)
        if (!staff) continue
        const centerY = Math.round((sb.yTop + sb.yBottom) / 2)
        const name = new Text({ text: staff.name, style: { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', fontSize: 12, fontWeight: 'bold', fill: 0xbcc3d6 } })
        name.x = Math.max(6, sidebarW - 12 - Math.round(name.width))
        name.y = Math.max(0, centerY - Math.round(name.height / 2))
        hud.addChild(name)

        const ts = String(staff.timeSignature || '4/4')
        const tsText = new Text({ text: ts, style: { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', fontSize: 11, fill: 0x94a3b8 } })
        const tsW = Math.round(tsText.width + 12)
        const tsH = 18
        const tsX = Math.max(6, sidebarW - 12 - tsW)
        const tsY = Math.round(centerY + Math.max(10, name.height))
        const tsBg = new Graphics()
        tsBg.roundRect(tsX, tsY, tsW, tsH, 4)
        tsBg.fill({ color: 0x111827, alpha: 0.8 })
        tsBg.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
        hud.addChild(tsBg)
        tsText.x = Math.round(tsX + 6)
        tsText.y = Math.round(tsY + 2)
        hud.addChild(tsText)
        this.ui.rects[`ts:${staff.id}`] = { x: tsX, y: tsY, w: tsW, h: tsH }
      }
    } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]staff labels', err) }

    // Modal overlays
    if (this.ui.modal === 'staffManager') {
      this.drawStaffManager(screenW, screenH)
    }

    // Task details popover if a single selection is present
    if ((this.data.selection || []).length > 0) {
      this.drawTaskDetails(screenW, screenH)
    }
  }

  private readSidebarWidth(): number {
    try {
      const v = localStorage.getItem('cadence.sidebar.width')
      const n = v ? parseInt(v, 10) : 220
      if (Number.isFinite(n)) return Math.max(180, Math.min(320, n))
    } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]readSidebarWidth', err) }
    return 220
  }

  setSidebarWidth(w: number) {
    const clamped = Math.max(180, Math.min(320, Math.round(w)))
    this.ui.sidebarWidth = clamped
    try { localStorage.setItem('cadence.sidebar.width', String(clamped)) } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]setSidebarWidth', err) }
  }

  getSidebarWidth(): number {
    return this.ui.sidebarWidth
  }

  getHeaderHeight(): number {
    return this.ui.headerHeight
  }

  hitTestUI(px: number, py: number): string | null {
    for (const [key, r] of Object.entries(this.ui.rects)) {
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return key
    }
    return null
  }

  private drawStaffManager(screenW: number, screenH: number) {
    if (!this.layers) return
    const hud = this.layers.hud
    const W = Math.min(560, Math.max(360, Math.round(screenW * 0.6)))
    const H = Math.min(520, Math.max(320, Math.round(screenH * 0.6)))
    const X = Math.round((screenW - W) / 2)
    const Y = Math.round((screenH - H) / 2)

    // Backdrop
    const backdrop = new Graphics()
    backdrop.rect(0, 0, screenW, screenH)
    backdrop.fill({ color: 0x000000, alpha: 0.45 })
    hud.addChild(backdrop)
    this.ui.rects['sm:close'] = { x: 0, y: 0, w: screenW, h: screenH }

    // Panel
    const panel = new Graphics()
    panel.roundRect(X, Y, W, H, 12)
    panel.fill({ color: 0x0f172a, alpha: 0.98 })
    panel.stroke({ width: 1, color: 0xffffff, alpha: 0.08 })
    hud.addChild(panel)

    // Header
    const title = new Text({ text: 'Staff Manager', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 14, fontWeight: 'bold', fill: 0xffffff } })
    title.x = X + 16
    title.y = Y + 12
    hud.addChild(title)

    // New staff row
    const rowY = Y + 44
    const nameLabel = new Text({ text: 'Name', style: { fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0x94a3b8 } })
    nameLabel.x = X + 16
    nameLabel.y = rowY
    hud.addChild(nameLabel)

    const nameBoxW = Math.round(W * 0.5)
    const nameBoxX = X + 16
    const nameBoxY = rowY + 18
    const nameBox = new Graphics()
    nameBox.roundRect(nameBoxX, nameBoxY, nameBoxW, 24, 6)
    nameBox.fill({ color: 0x111827, alpha: 0.95 })
    nameBox.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
    hud.addChild(nameBox)
    const nameVal = new Text({ text: this.ui.tmpStaffName || ' ', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } })
    nameVal.x = nameBoxX + 8
    nameVal.y = nameBoxY + 4
    hud.addChild(nameVal)
    this.ui.rects['sm:new:name'] = { x: nameBoxX, y: nameBoxY, w: nameBoxW, h: 24 }

    const linesLabel = new Text({ text: 'Lines', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0x94a3b8 } })
    linesLabel.x = nameBoxX + nameBoxW + 16
    linesLabel.y = rowY
    hud.addChild(linesLabel)

    const linesY = nameBoxY
    const dec = new Graphics(); dec.roundRect(linesLabel.x, linesY, 24, 24, 6); dec.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(dec)
    const decT = new Text({ text: '-', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 16, fill: 0xffffff } }); decT.x = linesLabel.x + 8; decT.y = linesY + 2; hud.addChild(decT)
    this.ui.rects['sm:new:lines:dec'] = { x: linesLabel.x, y: linesY, w: 24, h: 24 }
    const valBoxX = linesLabel.x + 28
    const valBox = new Graphics(); valBox.roundRect(valBoxX, linesY, 36, 24, 6); valBox.fill({ color: 0x111827, alpha: 0.95 }); valBox.stroke({ width: 1, color: 0xffffff, alpha: 0.12 }); hud.addChild(valBox)
    const valT = new Text({ text: String(this.ui.tmpStaffLines), style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); valT.x = valBoxX + 12; valT.y = linesY + 4; hud.addChild(valT)
    const incX = valBoxX + 40
    const inc = new Graphics(); inc.roundRect(incX, linesY, 24, 24, 6); inc.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(inc)
    const incT = new Text({ text: '+', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 16, fill: 0xffffff } }); incT.x = incX + 6; incT.y = linesY + 2; hud.addChild(incT)
    this.ui.rects['sm:new:lines:inc'] = { x: incX, y: linesY, w: 24, h: 24 }

    // Add button
    const addLabel = new Text({ text: 'Add', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } })
    const addW = Math.round(addLabel.width + 20)
    const addX = X + W - addW - 16
    const addY = linesY
    const addBtn = new Graphics(); addBtn.roundRect(addX, addY, addW, 24, 6); addBtn.fill({ color: 0x2563eb, alpha: 0.95 }); addBtn.stroke({ width: 1, color: 0xffffff, alpha: 0.12 }); hud.addChild(addBtn)
    addLabel.x = addX + 10; addLabel.y = addY + 4; hud.addChild(addLabel)
    this.ui.rects['sm:new:add'] = { x: addX, y: addY, w: addW, h: 24 }

    // Existing staffs list header
    const listTop = linesY + 40
    const head = new Text({ text: 'Existing', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0x94a3b8 } }); head.x = X + 16; head.y = listTop; hud.addChild(head)

    // Rows
    let rowTop = listTop + 18
    for (const s of (this.data.staffs || [])) {
      const rowBg = new Graphics(); rowBg.roundRect(X + 12, rowTop, W - 24, 28, 6); rowBg.fill({ color: 0x0b1220, alpha: 0.9 }); rowBg.stroke({ width: 1, color: 0xffffff, alpha: 0.06 }); hud.addChild(rowBg)
      const nameX = X + 18
      const nameW = Math.round((W - 36) * 0.45)
      const nameT = new Text({ text: s.name, style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); nameT.x = nameX + 8; nameT.y = rowTop + 6; hud.addChild(nameT)
      this.ui.rects[`sm:item:${s.id}:name`] = { x: nameX, y: rowTop + 2, w: nameW, h: 24 }
      const tsX = nameX + nameW + 8
      const tsW = 70
      const tsBg = new Graphics(); tsBg.roundRect(tsX, rowTop + 2, tsW, 24, 6); tsBg.fill({ color: 0x111827, alpha: 0.95 }); tsBg.stroke({ width: 1, color: 0xffffff, alpha: 0.12 }); hud.addChild(tsBg)
      const tsT = new Text({ text: s.timeSignature || '4/4', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); tsT.x = tsX + 8; tsT.y = rowTop + 6; hud.addChild(tsT)
      this.ui.rects[`sm:item:${s.id}:ts`] = { x: tsX, y: rowTop + 2, w: tsW, h: 24 }

      // Lines +/-
      const lnX = tsX + tsW + 8
      const decLn = new Graphics(); decLn.roundRect(lnX, rowTop + 2, 24, 24, 6); decLn.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(decLn)
      const decLnT = new Text({ text: '-', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 16, fill: 0xffffff } }); decLnT.x = lnX + 8; decLnT.y = rowTop + 4; hud.addChild(decLnT)
      this.ui.rects[`sm:item:${s.id}:lines:dec`] = { x: lnX, y: rowTop + 2, w: 24, h: 24 }
      const lnValX = lnX + 28
      const lnValBox = new Graphics(); lnValBox.roundRect(lnValX, rowTop + 2, 36, 24, 6); lnValBox.fill({ color: 0x111827, alpha: 0.95 }); lnValBox.stroke({ width: 1, color: 0xffffff, alpha: 0.12 }); hud.addChild(lnValBox)
      const lnValT = new Text({ text: String(s.numberOfLines), style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); lnValT.x = lnValX + 12; lnValT.y = rowTop + 6; hud.addChild(lnValT)
      const lnIncX = lnValX + 40
      const incLn = new Graphics(); incLn.roundRect(lnIncX, rowTop + 2, 24, 24, 6); incLn.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(incLn)
      const incLnT = new Text({ text: '+', style: { fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif', fontSize: 16, fill: 0xffffff } }); incLnT.x = lnIncX + 6; incLnT.y = rowTop + 4; hud.addChild(incLnT)
      this.ui.rects[`sm:item:${s.id}:lines:inc`] = { x: lnIncX, y: rowTop + 2, w: 24, h: 24 }

      // Reorder and delete
      const upX = X + W - 96
      const upBtn = new Graphics(); upBtn.roundRect(upX, rowTop + 2, 28, 24, 6); upBtn.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(upBtn)
      const upT = new Text({ text: 'Up', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); upT.x = upX + 6; upT.y = rowTop + 6; hud.addChild(upT)
      this.ui.rects[`sm:item:${s.id}:up`] = { x: upX, y: rowTop + 2, w: 28, h: 24 }
      const dnX = upX + 32
      const dnBtn = new Graphics(); dnBtn.roundRect(dnX, rowTop + 2, 36, 24, 6); dnBtn.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(dnBtn)
      const dnT = new Text({ text: 'Down', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); dnT.x = dnX + 6; dnT.y = rowTop + 6; hud.addChild(dnT)
      this.ui.rects[`sm:item:${s.id}:down`] = { x: dnX, y: rowTop + 2, w: 36, h: 24 }
      const delX = dnX + 40
      const delBtn = new Graphics(); delBtn.roundRect(delX, rowTop + 2, 48, 24, 6); delBtn.fill({ color: 0x7f1d1d, alpha: 0.95 }); hud.addChild(delBtn)
      const delT = new Text({ text: 'Delete', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); delT.x = delX + 6; delT.y = rowTop + 6; hud.addChild(delT)
      this.ui.rects[`sm:item:${s.id}:del`] = { x: delX, y: rowTop + 2, w: 48, h: 24 }

      rowTop += 32
    }
  }

  private drawTaskDetails(screenW: number, screenH: number) {
    if (!this.layers) return
    const hud = this.layers.hud
    const taskId = (this.data.selection || [])[0]
    const task = (this.data.tasks || []).find(t => t.id === taskId)
    const rect = this.layout.find(l => l.id === taskId)
    if (!task || !rect) return
    const panelW = 260
    const panelH = 180
    const px = Math.round(Math.max(10, Math.min(screenW - panelW - 10, rect.x + rect.w + 12)))
    const py = Math.round(Math.max(10, Math.min(screenH - panelH - 10, rect.y)))

    const panel = new Graphics(); panel.roundRect(px, py, panelW, panelH, 8); panel.fill({ color: 0x111827, alpha: 0.98 }); panel.stroke({ width: 1, color: 0xffffff, alpha: 0.1 }); hud.addChild(panel)
    const title = new Text({ text: 'Task', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 13, fontWeight: 'bold', fill: 0xffffff } }); title.x = px + 10; title.y = py + 8; hud.addChild(title)
    const close = new Graphics(); close.roundRect(px + panelW - 54, py + 8, 44, 20, 6); close.fill({ color: 0x374151, alpha: 0.95 }); hud.addChild(close)
    const closeT = new Text({ text: 'Close', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); closeT.x = px + panelW - 54 + 8; closeT.y = py + 10; hud.addChild(closeT)
    this.ui.rects['td:close'] = { x: px + panelW - 54, y: py + 8, w: 44, h: 20 }

    // Title field
    const y1 = py + 36
    const nameLbl = new Text({ text: 'Title', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0x94a3b8 } }); nameLbl.x = px + 10; nameLbl.y = y1 - 14; hud.addChild(nameLbl)
    const nameBox = new Graphics(); nameBox.roundRect(px + 10, y1, panelW - 20, 22, 6); nameBox.fill({ color: 0x0b1220, alpha: 0.95 }); nameBox.stroke({ width: 1, color: 0xffffff, alpha: 0.1 }); hud.addChild(nameBox)
    const nameText = new Text({ text: task.title || ' ', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); nameText.x = px + 16; nameText.y = y1 + 4; hud.addChild(nameText)
    this.ui.rects['td:title'] = { x: px + 10, y: y1, w: panelW - 20, h: 22 }

    // Status chip as button cycles
    const y2 = y1 + 32
    const statusLbl = new Text({ text: 'Status', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0x94a3b8 } }); statusLbl.x = px + 10; statusLbl.y = y2 - 14; hud.addChild(statusLbl)
    const stBtn = new Graphics(); stBtn.roundRect(px + 10, y2, 100, 22, 6); stBtn.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(stBtn)
    const stText = new Text({ text: (task as any).status || 'not_started', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0xffffff } }); stText.x = px + 16; stText.y = y2 + 4; hud.addChild(stText)
    this.ui.rects['td:status:next'] = { x: px + 10, y: y2, w: 100, h: 22 }

    // Start, Duration controls
    const y3 = y2 + 32
    const startLbl = new Text({ text: 'Start', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0x94a3b8 } }); startLbl.x = px + 10; startLbl.y = y3 - 14; hud.addChild(startLbl)
    const startDec = new Graphics(); startDec.roundRect(px + 10, y3, 24, 22, 6); startDec.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(startDec)
    const startDecT = new Text({ text: '-', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 14, fill: 0xffffff } }); startDecT.x = px + 18; startDecT.y = y3 + 2; hud.addChild(startDecT)
    this.ui.rects['td:start:dec'] = { x: px + 10, y: y3, w: 24, h: 22 }
    const startVal = new Text({ text: task.startDate, style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); startVal.x = px + 40; startVal.y = y3 + 3; hud.addChild(startVal)
    const startInc = new Graphics(); startInc.roundRect(px + 10 + 24 + 140, y3, 24, 22, 6); startInc.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(startInc)
    const startIncT = new Text({ text: '+', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 14, fill: 0xffffff } }); startIncT.x = px + 10 + 24 + 140 + 8; startIncT.y = y3 + 2; hud.addChild(startIncT)
    this.ui.rects['td:start:inc'] = { x: px + 10 + 24 + 140, y: y3, w: 24, h: 22 }

    const durLbl = new Text({ text: 'Dur', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0x94a3b8 } }); durLbl.x = px + 200; durLbl.y = y3 - 14; hud.addChild(durLbl)
    const durDec = new Graphics(); durDec.roundRect(px + 200, y3, 24, 22, 6); durDec.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(durDec)
    const durDecT = new Text({ text: '-', style: { fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif', fontSize: 14, fill: 0xffffff } }); durDecT.x = px + 208; durDecT.y = y3 + 2; hud.addChild(durDecT)
    this.ui.rects['td:dur:dec'] = { x: px + 200, y: y3, w: 24, h: 22 }
    const durVal = new Text({ text: String(task.durationDays), style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); durVal.x = px + 230; durVal.y = y3 + 3; hud.addChild(durVal)
    const durInc = new Graphics(); durInc.roundRect(px + 200 + 36, y3, 24, 22, 6); durInc.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(durInc)
    const durIncT = new Text({ text: '+', style: { fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif', fontSize: 14, fill: 0xffffff } }); durIncT.x = px + 200 + 36 + 6; durIncT.y = y3 + 2; hud.addChild(durIncT)
    this.ui.rects['td:dur:inc'] = { x: px + 200 + 36, y: y3, w: 24, h: 22 }

    // Staff & Line
    const y4 = y3 + 32
    const staffLbl = new Text({ text: 'Staff', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0x94a3b8 } }); staffLbl.x = px + 10; staffLbl.y = y4 - 14; hud.addChild(staffLbl)
    const stfDec = new Graphics(); stfDec.roundRect(px + 10, y4, 24, 22, 6); stfDec.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(stfDec)
    const stfDecT = new Text({ text: '<', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); stfDecT.x = px + 18; stfDecT.y = y4 + 4; hud.addChild(stfDecT)
    this.ui.rects['td:staff:prev'] = { x: px + 10, y: y4, w: 24, h: 22 }
    const staffName = new Text({ text: (this.data.staffs || []).find(s => s.id === task.staffId)?.name || task.staffId, style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); staffName.x = px + 40; staffName.y = y4 + 3; hud.addChild(staffName)
    const stfInc = new Graphics(); stfInc.roundRect(px + 10 + 24 + 140, y4, 24, 22, 6); stfInc.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(stfInc)
    const stfIncT = new Text({ text: '>', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); stfIncT.x = px + 10 + 24 + 140 + 8; stfIncT.y = y4 + 4; hud.addChild(stfIncT)
    this.ui.rects['td:staff:next'] = { x: px + 10 + 24 + 140, y: y4, w: 24, h: 22 }

    const lineLbl = new Text({ text: 'Line', style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 11, fill: 0x94a3b8 } }); lineLbl.x = px + 200; lineLbl.y = y4 - 14; hud.addChild(lineLbl)
    const lnDec = new Graphics(); lnDec.roundRect(px + 200, y4, 24, 22, 6); lnDec.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(lnDec)
    const lnDecT = new Text({ text: '-', style: { fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif', fontSize: 14, fill: 0xffffff } }); lnDecT.x = px + 208; lnDecT.y = y4 + 2; hud.addChild(lnDecT)
    this.ui.rects['td:line:dec'] = { x: px + 200, y: y4, w: 24, h: 22 }
    const lnVal = new Text({ text: String(task.staffLine), style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 12, fill: 0xffffff } }); lnVal.x = px + 230; lnVal.y = y4 + 3; hud.addChild(lnVal)
    const lnInc = new Graphics(); lnInc.roundRect(px + 200 + 36, y4, 24, 22, 6); lnInc.fill({ color: 0x1f2937, alpha: 0.95 }); hud.addChild(lnInc)
    const lnIncT = new Text({ text: '+', style: { fontFamily: 'system-ui,-apple system,Segoe UI,Roboto,sans-serif', fontSize: 14, fill: 0xffffff } }); lnIncT.x = px + 200 + 36 + 6; lnIncT.y = y4 + 2; hud.addChild(lnIncT)
    this.ui.rects['td:line:inc'] = { x: px + 200 + 36, y: y4, w: 24, h: 22 }
  }

  drawDragPreview(x: number, y: number, w: number, h: number) {
    if (!this.layers) return
    const reused = this.previewG && !(this.previewG as any)._destroyed
    const g = reused ? this.previewG! : new Graphics()
    g.clear()
    const px = Math.round(x)
    const py = Math.round(y)
    const pw = Math.max(2, Math.round(w))
    const ph = Math.round(h)
    const radius = Math.max(4, Math.floor(ph / 2))

    // Animated pulse effect (outer glow)
    const time = Date.now() / 1000
    const pulseScale = 1 + Math.sin(time * 4) * 0.1
    const glowRadius = radius * pulseScale

    // Outer glow rings
    for (let i = 3; i > 0; i--) {
      g.beginPath()
      g.ellipse(px + radius, py + radius, glowRadius + i * 4, glowRadius * 0.9 + i * 3)
      g.fill({ color: 0xA855F7, alpha: 0.08 * (4 - i) })
    }

    // Main preview shape with gradient effect
    g.beginPath()
    if (pw <= ph + 4) {
      g.ellipse(px + radius, py + radius, radius * 1.1, radius * 0.9)
    } else {
      // Musical note-like shape for extended duration
      g.moveTo(px + radius, py)
      g.lineTo(px + pw - radius, py)
      g.quadraticCurveTo(px + pw, py, px + pw, py + radius)
      g.lineTo(px + pw, py + ph - radius)
      g.quadraticCurveTo(px + pw, py + ph, px + pw - radius, py + ph)
      g.lineTo(px + radius, py + ph)
      g.arc(px + radius, py + radius, radius, Math.PI / 2, -Math.PI / 2, false)
    }
    g.closePath()
    g.fill({ color: 0xA855F7, alpha: 0.4 })
    g.stroke({ width: 2, color: 0xC084FC, alpha: 1 })

    // Inner highlight
    g.beginPath()
    g.ellipse(px + radius - radius * 0.2, py + radius - radius * 0.2, radius * 0.5, radius * 0.4)
    g.fill({ color: 0xffffff, alpha: 0.6 })

    // Musical accent dot
    g.circle(px + radius, py + radius, 2)
    g.fill({ color: 0xffffff, alpha: 0.9 })

    if (!g.parent) this.layers.tasks.addChild(g)
    this.previewG = g
  }

  clearPreview() {
    // Intentionally keep the preview graphic so the ghost remains visible until next draw
    // We just clear its contents to avoid flicker when pointer stops briefly.
    try { this.previewG?.clear() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]clearPreview', err) }
  }

  drawDependencyPreview(src: { x: number; y: number; w: number; h: number }, dstPoint: { x: number; y: number }) {
    if (!this.layers) return
    const reused = this.depPreviewG && !(this.depPreviewG as any)._destroyed
    const g = reused ? this.depPreviewG! : new Graphics()
    g.clear()
    const x0 = src.x + src.w
    const y0 = src.y + src.h / 2
    const x1 = dstPoint.x
    const y1 = dstPoint.y
    const cx1 = x0 + Math.max(30, Math.abs(x1 - x0) * 0.4)
    const cx2 = x1 - Math.max(30, Math.abs(x1 - x0) * 0.4)

    // Animated flow effect
    const time = Date.now() / 500
    // const dashOffset = (time % 10) * 5 // reserved for future dashed effect

    // Draw multiple curves for a flowing effect
    for (let i = 0; i < 3; i++) {
      const offset = i * 2
      g.moveTo(Math.round(x0), Math.round(y0 + offset - 2))
      g.bezierCurveTo(
        Math.round(cx1), Math.round(y0 + offset - 2),
        Math.round(cx2), Math.round(y1 + offset - 2),
        Math.round(x1), Math.round(y1 + offset - 2)
      )
      g.stroke({
        width: 3 - i,
        color: i === 0 ? 0xA855F7 : 0xC084FC,
        alpha: 0.6 - i * 0.15
      })
    }

    // Main curve with gradient
    g.moveTo(Math.round(x0), Math.round(y0))
    g.bezierCurveTo(Math.round(cx1), Math.round(y0), Math.round(cx2), Math.round(y1), Math.round(x1), Math.round(y1))
    g.stroke({ width: 2, color: 0xFACC15, alpha: 0.9 })

    // Arrowhead with glow
    const angle = Math.atan2(y1 - y0, x1 - x0)
    const arrow = 10

    // Glow behind arrow
    g.beginPath()
    g.circle(x1, y1, 8)
    g.fill({ color: 0xFACC15, alpha: 0.3 })

    // Arrow shape
    g.beginPath()
    g.moveTo(Math.round(x1), Math.round(y1))
    g.lineTo(Math.round(x1 - arrow * Math.cos(angle - Math.PI / 5)), Math.round(y1 - arrow * Math.sin(angle - Math.PI / 5)))
    g.lineTo(Math.round(x1 - arrow * 0.7 * Math.cos(angle)), Math.round(y1 - arrow * 0.7 * Math.sin(angle)))
    g.lineTo(Math.round(x1 - arrow * Math.cos(angle + Math.PI / 5)), Math.round(y1 - arrow * Math.sin(angle + Math.PI / 5)))
    g.closePath()
    g.fill({ color: 0xFACC15, alpha: 1 })

    // Add pulse dots along the curve
    const steps = 5
    for (let t = 0.2; t <= 0.8; t += 0.6 / steps) {
      const px = Math.round(Math.pow(1 - t, 3) * x0 + 3 * Math.pow(1 - t, 2) * t * cx1 + 3 * (1 - t) * Math.pow(t, 2) * cx2 + Math.pow(t, 3) * x1)
      const py = Math.round(Math.pow(1 - t, 3) * y0 + 3 * Math.pow(1 - t, 2) * t * y0 + 3 * (1 - t) * Math.pow(t, 2) * y1 + Math.pow(t, 3) * y1)
      const pulseSize = 1 + Math.sin((time + t * 10) * 2) * 0.5
      g.circle(px, py, pulseSize)
      g.fill({ color: 0xC084FC, alpha: 0.8 })
    }

    if (!g.parent) this.layers.dependencies.addChild(g)
    this.depPreviewG = g
  }

  clearDependencyPreview() {
    if (this.depPreviewG && this.depPreviewG.parent) {
      try { this.depPreviewG.parent.removeChild(this.depPreviewG) } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]clearDependencyPreview remove', err) }
      try { this.depPreviewG.destroy() } catch (err) { if (import.meta?.env?.DEV) console.debug('[Renderer]clearDependencyPreview destroy', err) }
    }
    this.depPreviewG = null
  }

  // statusToAccidental remains for glyph selection; colors come from draw/tasks.ts

  private statusToAccidental(status: string): string {
    switch (status) {
      case 'in_progress':
        return '♯'
      case 'completed':
        return '♮'
      case 'blocked':
        return '♭'
      case 'cancelled':
        return '𝄪'
      default:
        return ''
    }
  }
}

