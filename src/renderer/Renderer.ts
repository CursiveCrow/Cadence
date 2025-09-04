import { Application, Container, Graphics, Text } from 'pixi.js'
import { TIMELINE, dayIndexFromISO, pixelsPerDay, computeScaledTimeline, safeDiv, EPS, nearlyZero } from './utils'
import { drawGridBackground, drawStaffLines } from './draw/grid'
import { drawLabelWithMast, drawNoteHeadAndLine, statusToColor } from './draw/notes'
import { drawMeasurePair, drawTodayMarker } from './draw/markers'
// Removed alignment quantization; use straightforward world↔screen math
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
    const destroyAll = (c: Container) => {
      try {
        const removed = c.removeChildren()
        for (const ch of removed) {
          try { (ch as any).destroy?.({ children: true }) } catch { }
        }
      } catch { }
    }
    destroyAll(this.layers.background)
    destroyAll(this.layers.tasks)
    destroyAll(this.layers.dependencies)
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

    const width = Math.max(1, this.app.screen.width)
    const height = Math.max(1, this.app.screen.height)
    const { LEFT_MARGIN, DAY_WIDTH } = TIMELINE
    const { zoom, x, y } = this.viewport
    const pxPerDay = pixelsPerDay(zoom, DAY_WIDTH)
    this.metrics = { pxPerDay, staffBlocks: [] }
    this.layout = []
    const vx = x

    // Content background (cached meta to avoid redundant redraw)
    const bg = new Graphics()
    bg.rect(0, 0, width, Math.max(0, height))
    bg.fill({ color: 0x0f1115, alpha: 1 })
    this.layers.background.addChild(bg)

    // No internal left gutter: sidebar owns the left column; canvas starts at x=0

    for (const g of drawGridBackground({ width, height, LEFT_MARGIN, pxPerDay, viewportXDays: vx })) {
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
      const leftWorldDays = vx + (0 - LEFT_MARGIN) / Math.max(pxPerDay, EPS)
      const rightWorldDays = vx + (width - LEFT_MARGIN) / Math.max(pxPerDay, EPS)
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
          const yTopStaff = Math.round(sb.yTop)
          const yBottomStaff = Math.round(sb.yBottom)
          this.layers.background.addChild(drawMeasurePair(xThick, xThin, yTopStaff, yBottomStaff))
        }
      }
    } catch { }

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
    } catch { }

    // Draw tasks (note pill shape with status glyph)
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
      const color = statusToColor((task as any).status || '')
      this.layers.tasks.addChild(drawNoteHeadAndLine({ x: Math.round(xLeft), yTop: Math.round(yTop), width: Math.round(w), height: Math.round(h), color, selected, pxPerDay }))

      const label = drawLabelWithMast({ xLeft: xLeft, yTop, h, text: task.title || '', headColor: color, width, height })
      for (const n of label.nodes) this.layers.tasks.addChild(n)

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
    const reused = this.previewG && !(this.previewG as any)._destroyed
    const g = reused ? this.previewG! : new Graphics()
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
    // Intentionally keep the preview graphic so the ghost remains visible until next draw
    // We just clear its contents to avoid flicker when pointer stops briefly.
    try { this.previewG?.clear() } catch { }
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

  // statusToAccidental remains for glyph selection; colors come from draw/notes.ts

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

