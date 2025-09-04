import { Application, Container, Graphics, Text } from 'pixi.js'
import { TIMELINE } from './utils'
import { computeViewportAlignment } from './layout'
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
  private verticalScale: number = 1
  private previewG: Graphics | null = null
  private depPreviewG: Graphics | null = null
  private tooltipBox: Graphics | null = null
  private tooltipStem: Graphics | null = null
  private tooltipTitle: Text | null = null
  private tooltipInfo: Text | null = null

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

  setVerticalScale(scale: number) {
    this.verticalScale = Math.max(0.5, Math.min(3, scale || 1))
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

    // Do not resize renderer every frame; handled by window resize hook
    this.clearContainers()

    const width = Math.max(1, this.app.screen.width)
    const height = Math.max(1, this.app.screen.height)
    const { LEFT_MARGIN, DAY_WIDTH } = TIMELINE
    const { zoom, x, y } = this.viewport
    const pxPerDay = DAY_WIDTH * Math.max(0.1, zoom)
    const HEADER = computeDateHeaderHeight(zoom || 1)
    this.metrics = { pxPerDay, staffBlocks: [] }
    this.layout = []
    const align = computeViewportAlignment({ LEFT_MARGIN, DAY_WIDTH: pxPerDay, TOP_MARGIN: 0, STAFF_SPACING: 0, STAFF_LINE_SPACING: 0 } as any, x)
    const vx = align.viewportXDaysQuantized

    // Content background (cached meta to avoid redundant redraw)
    const bg = new Graphics()
    bg.rect(0, 0, width, Math.max(0, height))
    bg.fill({ color: 0x0f1115, alpha: 1 })
    this.layers.background.addChild(bg)

    // No internal left gutter: sidebar owns the left column; canvas starts at x=0

    // Alternating day bands (subtle) and vertical day grid + weekend tint
    const grid = new Graphics()
    const gridStartWorld = Math.max(0, Math.floor(vx))
    const gridEndWorld = Math.ceil(vx + (width - LEFT_MARGIN) / pxPerDay)
    for (let day = gridStartWorld; day <= gridEndWorld; day++) {
      const gx = LEFT_MARGIN + (day - vx) * pxPerDay
      // alternating bands
      if (day % 2 !== 0) {
        const xBand = Math.round(gx)
        const wBand = Math.max(0.5, pxPerDay)
        if (xBand > LEFT_MARGIN + 1) {
          grid.rect(xBand, 0, wBand, Math.max(0, height))
          grid.fill({ color: 0xffffff, alpha: 0.03 })
        }
      }
      // Weekend tint (approx)
      const dow = (day + 1) % 7
      if (dow === 6 || dow === 0) {
        const xBand2 = Math.round(gx)
        const wBand2 = Math.max(0.5, pxPerDay)
        if (xBand2 > LEFT_MARGIN + 1) {
          grid.rect(xBand2, 0, wBand2, Math.max(0, height))
          grid.fill({ color: 0xffffff, alpha: 0.02 })
        }
      }
      // Grid line
      if (gx > LEFT_MARGIN + 1) {
        grid.moveTo(Math.round(gx) + 0.5, 0)
        grid.lineTo(Math.round(gx) + 0.5, height)
        grid.stroke({ width: 1, color: (day % 7 === 0) ? 0x2b3242 : 0x1c2230, alpha: 0.9 })
      }
    }
    this.layers.background.addChild(grid)

    // Vertical scaling for staff geometry
    const scaledTopMargin = Math.round(TIMELINE.TOP_MARGIN * this.verticalScale)
    const scaledStaffSpacing = Math.max(20, Math.round(TIMELINE.STAFF_SPACING * this.verticalScale))
    const scaledLineSpacing = Math.max(8, Math.round(TIMELINE.STAFF_LINE_SPACING * this.verticalScale))

    // Draw staffs as groups of lines
    let yCursor = scaledTopMargin - y
    for (const staff of this.data.staffs) {
      const s = new Graphics()
      const spacing = scaledLineSpacing
      for (let i = 0; i < staff.numberOfLines; i++) {
        const ly = yCursor + i * spacing
        s.moveTo(LEFT_MARGIN, Math.round(ly) + 0.5)
        s.lineTo(width, Math.round(ly) + 0.5)
        s.stroke({ width: 1, color: 0x2b3242, alpha: 0.8 })
      }
      this.layers.background.addChild(s)

      this.metrics.staffBlocks.push({ id: staff.id, yTop: yCursor, yBottom: yCursor + staff.numberOfLines * spacing, lineSpacing: spacing })
      yCursor += staff.numberOfLines * spacing + scaledStaffSpacing - staff.numberOfLines * spacing
    }

    // Measure markers (paired bars) per staff
    try {
      const stepDays = 7
      const offsetDays = 0
      const pairSpacingPx = 4
      const thickW = 3
      const thinW = 1
      const leftWorldDays = vx + (0 - LEFT_MARGIN) / Math.max(pxPerDay, 0.0001)
      const rightWorldDays = vx + (width - LEFT_MARGIN) / Math.max(pxPerDay, 0.0001)
      const firstK = Math.floor((leftWorldDays - offsetDays) / stepDays) - 1
      const lastK = Math.ceil((rightWorldDays - offsetDays) / stepDays) + 1
      for (const sb of this.metrics.staffBlocks) {
        for (let k = firstK; k <= lastK; k++) {
          const dayIndex = k * stepDays + offsetDays
          const xScreen = LEFT_MARGIN + (dayIndex - vx) * pxPerDay
          const xThick = Math.round(xScreen) + (thickW % 2 ? 0.5 : 0)
          const xThin = Math.round(xScreen - pairSpacingPx) + (thinW % 2 ? 0.5 : 0)
          if (xThin > width + 2) break
          if (xThick < LEFT_MARGIN + 2) continue
          if (xThin < LEFT_MARGIN + 2) continue
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
        const xToday = LEFT_MARGIN + (dayIndex - vx) * pxPerDay
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
      const xLeft = LEFT_MARGIN + (day - vx) * pxPerDay
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

    // Draw dependencies (smooth curve with arrowhead)
    for (const dep of this.data.dependencies) {
      const src = this.layout.find(r => r.id === dep.srcTaskId)
      const dst = this.layout.find(r => r.id === dep.dstTaskId)
      if (!src || !dst) continue
      const x0 = src.x + src.w
      const y0 = src.y + src.h / 2
      const x1 = dst.x
      const y1 = dst.y + dst.h / 2
      const cx1 = x0 + Math.max(20, Math.abs(x1 - x0) * 0.3)
      const cx2 = x1 - Math.max(20, Math.abs(x1 - x0) * 0.3)
      const line = new Graphics()
      line.moveTo(Math.round(x0), Math.round(y0))
      line.bezierCurveTo(Math.round(cx1), Math.round(y0), Math.round(cx2), Math.round(y1), Math.round(x1), Math.round(y1))
      line.stroke({ width: 2, color: 0x7f8ea3, alpha: 0.9 })
      // arrowhead
      const angle = Math.atan2(y1 - y0, x1 - x0)
      const arrow = 8
      line.beginPath()
      line.moveTo(Math.round(x1), Math.round(y1))
      line.lineTo(Math.round(x1 - arrow * Math.cos(angle - Math.PI / 6)), Math.round(y1 - arrow * Math.sin(angle - Math.PI / 6)))
      line.lineTo(Math.round(x1 - arrow * Math.cos(angle + Math.PI / 6)), Math.round(y1 - arrow * Math.sin(angle + Math.PI / 6)))
      line.closePath()
      line.fill({ color: 0x7f8ea3, alpha: 0.9 })
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
            const lbLocalX = Math.abs(uy) > 0.0001 ? (boxH / uy) * ux : 0

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
          if (this.tooltipBox) { try { this.layers!.tasks.removeChild(this.tooltipBox) } catch { }; try { this.tooltipBox.destroy() } catch { }; this.tooltipBox = null }
          if (this.tooltipStem) { try { this.layers!.tasks.removeChild(this.tooltipStem) } catch { }; try { this.tooltipStem.destroy() } catch { }; this.tooltipStem = null }
          if (this.tooltipTitle) { try { this.layers!.tasks.removeChild(this.tooltipTitle) } catch { }; try { (this.tooltipTitle as any).destroy?.() } catch { }; this.tooltipTitle = null }
          if (this.tooltipInfo) { try { this.layers!.tasks.removeChild(this.tooltipInfo) } catch { }; try { (this.tooltipInfo as any).destroy?.() } catch { }; this.tooltipInfo = null }
        }
      }
    } catch { }
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
  }

  drawDragPreview(x: number, y: number, w: number, h: number) {
    if (!this.layers) return
    const g = this.previewG || new Graphics()
    g.clear()
    const px = Math.round(x)
    const py = Math.round(y)
    const pw = Math.max(2, Math.round(w))
    const ph = Math.round(h)
    const radius = Math.max(4, Math.floor(ph / 2))
    g.beginPath()
    if (pw <= ph + 4) {
      g.circle(px + radius, py + radius, radius)
    } else {
      g.moveTo(px + radius, py)
      g.lineTo(px + pw - 4, py)
      g.quadraticCurveTo(px + pw, py, px + pw, py + 4)
      g.lineTo(px + pw, py + ph - 4)
      g.quadraticCurveTo(px + pw, py + ph, px + pw - 4, py + ph)
      g.lineTo(px + radius, py + ph)
      g.arc(px + radius, py + radius, radius, Math.PI / 2, -Math.PI / 2, false)
    }
    g.closePath()
    g.fill({ color: 0x10B981, alpha: 0.35 })
    g.stroke({ width: 2, color: 0x10B981, alpha: 1 })
    g.circle(px + radius, py + radius, Math.max(2, radius - 2))
    g.fill({ color: 0xffffff, alpha: 0.18 })
    if (!g.parent) this.layers.tasks.addChild(g)
    this.previewG = g
  }

  clearPreview() {
    if (this.previewG && this.layers && this.previewG.parent) {
      try { this.previewG.parent.removeChild(this.previewG) } catch { }
      try { this.previewG.destroy() } catch { }
    }
    this.previewG = null
  }

  drawDependencyPreview(src: { x: number; y: number; w: number; h: number }, dstPoint: { x: number; y: number }) {
    if (!this.layers) return
    const g = this.depPreviewG || new Graphics()
    g.clear()
    const x0 = src.x + src.w
    const y0 = src.y + src.h / 2
    const x1 = dstPoint.x
    const y1 = dstPoint.y
    const cx1 = x0 + Math.max(20, Math.abs(x1 - x0) * 0.3)
    const cx2 = x1 - Math.max(20, Math.abs(x1 - x0) * 0.3)
    g.moveTo(Math.round(x0), Math.round(y0))
    g.bezierCurveTo(Math.round(cx1), Math.round(y0), Math.round(cx2), Math.round(y1), Math.round(x1), Math.round(y1))
    g.stroke({ width: 2, color: 0x10B981, alpha: 0.9 })
    const angle = Math.atan2(y1 - y0, x1 - x0)
    const arrow = 8
    g.beginPath()
    g.moveTo(Math.round(x1), Math.round(y1))
    g.lineTo(Math.round(x1 - arrow * Math.cos(angle - Math.PI / 6)), Math.round(y1 - arrow * Math.sin(angle - Math.PI / 6)))
    g.lineTo(Math.round(x1 - arrow * Math.cos(angle + Math.PI / 6)), Math.round(y1 - arrow * Math.sin(angle + Math.PI / 6)))
    g.closePath()
    g.fill({ color: 0x10B981, alpha: 0.9 })
    if (!g.parent) this.layers.dependencies.addChild(g)
    this.depPreviewG = g
  }

  clearDependencyPreview() {
    if (this.depPreviewG && this.depPreviewG.parent) {
      try { this.depPreviewG.parent.removeChild(this.depPreviewG) } catch { }
      try { this.depPreviewG.destroy() } catch { }
    }
    this.depPreviewG = null
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

