import { Application, Container, Graphics, Text } from 'pixi.js'
import { TIMELINE } from './utils'
import { computeDateHeaderHeight } from './dateHeader'
import { PROJECT_START_DATE } from '../config'
import type { Staff, Task, Dependency } from '@types'

interface Data { staffs: Staff[]; tasks: Task[]; dependencies: Dependency[]; selection: string[] }

export class Renderer {
  private canvas: HTMLCanvasElement
  private app: Application | null = null
  private root: Container | null = null
  private layers: { viewport: Container; background: Container; tasks: Container; dependencies: Container } | null = null
  private ready = false
  private hoverX: number | null = null
  private hoverY: number | null = null

  private viewport = { x: 0, y: 0, zoom: 1 }
  private data: Data = { staffs: [], tasks: [], dependencies: [], selection: [] }
  private layout: { id: string; x: number; y: number; w: number; h: number }[] = []
  private metrics: { pxPerDay: number; staffBlocks: { id: string; yTop: number; yBottom: number; lineSpacing: number }[] } = { pxPerDay: 24, staffBlocks: [] }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.initPixi()
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
      viewport.addChild(background)
      viewport.addChild(dependencies)
      viewport.addChild(tasks)
      this.root.addChild(viewport)
      this.layers = { viewport, background, tasks, dependencies }

      this.ready = true
      // Draw once after init
      this.render()
    } catch {
      // If PIXI init fails, leave ready=false; methods will no-op
    }
  }

  setViewport(v: { x: number; y: number; zoom: number }) {
    this.viewport = { ...v }
  }

  setData(data: Data) {
    this.data = data
  }

  resize() {
    if (!this.app) return
    try { this.app.renderer.resize(this.canvas.clientWidth || 1, this.canvas.clientHeight || 1) } catch { }
  }

  private clearContainers() {
    if (!this.layers) return
    try { this.layers.background.removeChildren() } catch { }
    try { this.layers.tasks.removeChildren() } catch { }
    try { this.layers.dependencies.removeChildren() } catch { }
  }

  render() {
    if (!this.app || !this.layers || !this.ready) return

    this.resize()
    this.clearContainers()

    const width = Math.max(1, this.app.screen.width)
    const height = Math.max(1, this.app.screen.height)
    const { LEFT_MARGIN, DAY_WIDTH } = TIMELINE
    const { zoom, x, y } = this.viewport
    const pxPerDay = DAY_WIDTH * Math.max(0.1, zoom)
    const HEADER = computeDateHeaderHeight(zoom || 1)
    this.metrics = { pxPerDay, staffBlocks: [] }
    this.layout = []

    // Content background
    const bg = new Graphics()
    bg.rect(0, 0, width, Math.max(0, height))
    bg.fill({ color: 0x0f1115, alpha: 1 })
    this.layers.background.addChild(bg)

    // Left margin panel for staff labels (renderer leaves empty; sidebar handles labels)
    const lm = new Graphics()
    lm.rect(0, 0, LEFT_MARGIN, Math.max(0, height))
    lm.fill({ color: 0x11141b, alpha: 1 })
    this.layers.background.addChild(lm)

    // Vertical day grid + weekend tint
    const grid = new Graphics()
    const gridStartWorld = Math.max(0, Math.floor(x))
    const gridEndWorld = Math.ceil(x + (width - LEFT_MARGIN) / pxPerDay)
    for (let day = gridStartWorld; day <= gridEndWorld; day++) {
      const gx = LEFT_MARGIN + (day - x) * pxPerDay
      // Weekend tint (approx)
      const dow = (day + 1) % 7
      if (dow === 6 || dow === 0) {
        grid.rect(gx, 0, Math.max(0.5, pxPerDay), Math.max(0, height))
        grid.fill({ color: 0xffffff, alpha: 0.02 })
      }
      // Grid line
      grid.moveTo(gx + 0.5, 0)
      grid.lineTo(gx + 0.5, height)
      grid.stroke({ width: 1, color: (day % 7 === 0) ? 0x2b3242 : 0x1c2230, alpha: 1 })
    }
    this.layers.background.addChild(grid)

    // Draw staffs as groups of lines
    let yCursor = TIMELINE.TOP_MARGIN - y
    for (const staff of this.data.staffs) {
      const s = new Graphics()
      const spacing = TIMELINE.STAFF_LINE_SPACING
      for (let i = 0; i < staff.numberOfLines; i++) {
        const ly = yCursor + i * spacing
        s.moveTo(LEFT_MARGIN, Math.round(ly) + 0.5)
        s.lineTo(width, Math.round(ly) + 0.5)
        s.stroke({ width: 1, color: 0x2b3242, alpha: 0.8 })
      }
      this.layers.background.addChild(s)

      this.metrics.staffBlocks.push({ id: staff.id, yTop: yCursor, yBottom: yCursor + staff.numberOfLines * spacing, lineSpacing: spacing })
      yCursor += staff.numberOfLines * spacing + TIMELINE.STAFF_SPACING - staff.numberOfLines * spacing
    }

    // Measure markers (paired bars) per staff
    try {
      const stepDays = 7
      const offsetDays = 0
      const pairSpacingPx = 4
      const thickW = 3
      const thinW = 1
      const leftWorldDays = x + (0 - LEFT_MARGIN) / Math.max(pxPerDay, 0.0001)
      const rightWorldDays = x + (width - LEFT_MARGIN) / Math.max(pxPerDay, 0.0001)
      const firstK = Math.floor((leftWorldDays - offsetDays) / stepDays) - 1
      const lastK = Math.ceil((rightWorldDays - offsetDays) / stepDays) + 1
      for (const sb of this.metrics.staffBlocks) {
        for (let k = firstK; k <= lastK; k++) {
          const dayIndex = k * stepDays + offsetDays
          const xScreen = LEFT_MARGIN + (dayIndex - x) * pxPerDay
          const xThick = Math.round(xScreen) + (thickW % 2 ? 0.5 : 0)
          const xThin = Math.round(xScreen - pairSpacingPx) + (thinW % 2 ? 0.5 : 0)
          if (xThin > width + 2) break
          if (xThick < LEFT_MARGIN - 2) continue
          const gmm = new Graphics()
          const yTopStaff = Math.round(sb.yTop)
          const yBottomStaff = Math.round(sb.yBottom)
          gmm.moveTo(xThick, yTopStaff)
          gmm.lineTo(xThick, yBottomStaff)
          gmm.stroke({ width: thickW, color: 0xffffff, alpha: 0.35 })
          gmm.moveTo(xThin, yTopStaff)
          gmm.lineTo(xThin, yBottomStaff)
          gmm.stroke({ width: thinW, color: 0xffffff, alpha: 0.25 })
          this.layers.background.addChild(gmm)
        }
      }
    } catch { }

    // Today marker
    try {
      const baseUTC = Date.UTC(PROJECT_START_DATE.getUTCFullYear(), PROJECT_START_DATE.getUTCMonth(), PROJECT_START_DATE.getUTCDate())
      const now = new Date()
      const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      const msPerDay = 24 * 60 * 60 * 1000
      const dayIndex = Math.floor((todayUTC - baseUTC) / msPerDay)
      if (Number.isFinite(dayIndex)) {
        const xToday = LEFT_MARGIN + (dayIndex - x) * pxPerDay
        const line = new Graphics()
        line.moveTo(Math.round(xToday) + 0.5, 0)
        line.lineTo(Math.round(xToday) + 0.5, Math.max(0, height))
        line.stroke({ width: 2, color: 0xF59E0B, alpha: 0.9 })
        this.layers.background.addChild(line)
      }
    } catch { }

    // Draw tasks (note pill shape with status glyph)
    for (const task of this.data.tasks) {
      const staffBlock = this.metrics.staffBlocks.find(b => b.id === task.staffId)
      if (!staffBlock) continue
      const lineStep = staffBlock.lineSpacing / 2
      const centerY = staffBlock.yTop + task.staffLine * lineStep
      const h = Math.max(12, Math.min(18, Math.floor(lineStep)))
      const yTop = centerY - h / 2

      // compute x from startDate relative to PROJECT_START_DATE
      const start = Date.UTC(PROJECT_START_DATE.getUTCFullYear(), PROJECT_START_DATE.getUTCMonth(), PROJECT_START_DATE.getUTCDate())
      const parts = task.startDate.split('-').map(Number)
      if (parts.length !== 3 || Number.isNaN(parts[0]!)) continue
      const d = Date.UTC(parts[0]!, (parts[1]! - 1), parts[2]!)
      const day = Math.max(0, Math.round((d - start) / (24 * 3600 * 1000)))
      const xLeft = LEFT_MARGIN + (day - x) * pxPerDay
      const w = Math.max(4, Math.round(task.durationDays * pxPerDay))

      if (xLeft + w < LEFT_MARGIN - 200 || xLeft > width + 200) continue
      if (yTop > height || yTop + h < 0) continue

      const selected = this.data.selection.includes(task.id)
      const note = this.drawNotePill(Math.round(xLeft), Math.round(yTop), Math.round(w), Math.round(h), selected)
      this.layers.tasks.addChild(note)

      // title text
      const title = new Text({
        text: task.title || '',
        style: { fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif', fontSize: 10, fill: 0xffffff }
      })
      title.x = Math.round(xLeft + h + 6)
      title.y = Math.round(yTop + (h - title.height) / 2)
      this.layers.tasks.addChild(title)

      // status glyph inside left circle
      const glyph = this.statusToAccidental((task as any).status || '')
      if (glyph) {
        const tGlyph = new Text({
          text: glyph,
          style: { fontFamily: 'serif', fontSize: Math.max(10, Math.round(h * 0.7)), fill: 0xffffff }
        })
        tGlyph.x = Math.round(xLeft + h / 2 - tGlyph.width / 2)
        tGlyph.y = Math.round(yTop + h / 2 - tGlyph.height / 2)
        this.layers.tasks.addChild(tGlyph)
      }

      this.layout.push({ id: task.id, x: xLeft, y: yTop, w, h })
    }

    // Draw dependencies (simple L-shape)
    for (const dep of this.data.dependencies) {
      const src = this.layout.find(r => r.id === dep.srcTaskId)
      const dst = this.layout.find(r => r.id === dep.dstTaskId)
      if (!src || !dst) continue
      const x0 = src.x + src.w
      const y0 = src.y + src.h / 2
      const x1 = dst.x
      const y1 = dst.y + dst.h / 2
      const midX = (x0 + x1) / 2
      const line = new Graphics()
      line.moveTo(Math.round(x0), Math.round(y0))
      line.lineTo(Math.round(midX), Math.round(y0))
      line.lineTo(Math.round(midX), Math.round(y1))
      line.lineTo(Math.round(x1), Math.round(y1))
      line.stroke({ width: 1, color: 0x7f8ea3, alpha: 1 })
      this.layers.dependencies.addChild(line)
    }

    // Hover vertical guideline and row highlight
    if (this.hoverX != null) {
      const gHover = new Graphics()
      const xh = Math.round(this.hoverX) + 0.5
      gHover.moveTo(xh, 0)
      gHover.lineTo(xh, height)
      gHover.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
      this.layers.background.addChild(gHover)
    }
    if (this.hoverY != null && this.metrics.staffBlocks.length > 0) {
      const yHover = this.hoverY
      const sb = this.metrics.staffBlocks.find(b => yHover >= b.yTop && yHover <= b.yBottom)
      if (sb) {
        const r = new Graphics()
        r.rect(-100000, Math.round(sb.yTop), 200000, Math.max(1, Math.round(sb.yBottom - sb.yTop)))
        r.fill({ color: 0xffffff, alpha: 0.05 })
        this.layers.background.addChild(r)
      }
    }
  }

  hitTest(px: number, py: number): string | null {
    for (let i = this.layout.length - 1; i >= 0; i--) {
      const r = this.layout[i]
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r.id
    }
    return null
  }

  getMetrics() {
    return this.metrics
  }

  setHover(x: number | null, y: number | null) {
    this.hoverX = x
    this.hoverY = y
  }

  // Note pill with left circular head
  private drawNotePill(x: number, topY: number, width: number, height: number, selected: boolean): Graphics {
    const g = new Graphics()
    const radius = Math.max(4, Math.floor(height / 2))
    const bodyColor = selected ? 0x3b82f6 : 0x8b5cf6
    const strokeColor = selected ? 0xFCD34D : 0xffffff

    // Shadow/outline
    g.roundRect(x + 2, topY + 2, Math.max(2, width), height, Math.max(4, Math.floor(height / 3)))
    g.fill({ color: 0x000000, alpha: 0.2 })

    // Body with rounded right side
    g.beginPath()
    if (width <= height + 4) {
      // Small: circle only
      g.circle(x + radius, topY + radius, radius)
    } else {
      g.moveTo(x + radius, topY)
      g.lineTo(x + width - 4, topY)
      g.quadraticCurveTo(x + width, topY, x + width, topY + 4)
      g.lineTo(x + width, topY + height - 4)
      g.quadraticCurveTo(x + width, topY + height, x + width - 4, topY + height)
      g.lineTo(x + radius, topY + height)
      g.arc(x + radius, topY + radius, radius, Math.PI / 2, -Math.PI / 2, false)
    }
    g.closePath()
    g.fill({ color: bodyColor, alpha: 0.9 })
    g.stroke({ width: selected ? 2 : 1, color: strokeColor, alpha: selected ? 1 : 0.3 })

    // Inner white circle on the left
    g.circle(x + radius, topY + radius, Math.max(2, radius - 2))
    g.fill({ color: 0xffffff, alpha: 0.2 })
    return g
  }

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

