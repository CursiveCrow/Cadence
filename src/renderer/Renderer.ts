import { drawHorizontalLine, drawVerticalGrid } from './shapes'
import { TIMELINE, dprScale } from './utils'
import type { Staff, Task, Dependency } from '@types'

interface Data { staffs: Staff[]; tasks: Task[]; dependencies: Dependency[]; selection: string[] }

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private viewport = { x: 0, y: 0, zoom: 1 }
  private data: Data = { staffs: [], tasks: [], dependencies: [], selection: [] }
  private layout: { id: string; x: number; y: number; w: number; h: number }[] = []
  private metrics: { pxPerDay: number; staffBlocks: { id: string; yTop: number; yBottom: number; lineSpacing: number }[] } = { pxPerDay: 24, staffBlocks: [] }

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    this.canvas = canvas
    this.ctx = ctx
    this.resize()
  }

  setViewport(v: { x: number; y: number; zoom: number }) {
    this.viewport = { ...v }
  }

  setData(data: Data) {
    this.data = data
  }

  resize() {
    dprScale(this.canvas, this.ctx)
  }

  clear() {
    const { width, height } = this.canvas
    this.ctx.clearRect(0, 0, width, height)
  }

  render() {
    const ctx = this.ctx
    this.resize()
    this.clear()

    const { clientWidth: width, clientHeight: height } = this.canvas
    const { HEADER, LEFT_MARGIN, DAY_WIDTH, STAFF_GAP } = TIMELINE
    const { zoom, x, y } = this.viewport
    const pxPerDay = DAY_WIDTH * Math.max(0.1, zoom)
    this.metrics = { pxPerDay, staffBlocks: [] }
    this.layout = []

    // Header background (drawn by React header; keep minimal)
    ctx.fillStyle = 'transparent'
    ctx.fillRect(0, 0, HEADER, 0)

    // Content background
    ctx.fillStyle = '#0f1115'
    ctx.fillRect(0, HEADER, width, height - HEADER)

    // Left margin panel for staff labels (renderer leaves empty; sidebar handles labels)
    ctx.fillStyle = '#11141b'
    ctx.fillRect(0, HEADER, LEFT_MARGIN, height - HEADER)

    // Vertical day grid
    const gridStartWorld = Math.max(0, Math.floor(x))
    const gridEndWorld = Math.ceil(x + (width - LEFT_MARGIN) / pxPerDay)
    for (let day = gridStartWorld; day <= gridEndWorld; day++) {
      const gx = LEFT_MARGIN + (day - x) * pxPerDay
      // Weekend tint
      const dow = (day + 1) % 7 // 2024-01-01 is Monday => day 0 => Tuesday? adjust: simple approx
      if (dow === 6 || dow === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)'
        ctx.fillRect(gx, HEADER, pxPerDay, height - HEADER)
      }
      // Grid lines
      ctx.strokeStyle = day % 7 === 0 ? '#2b3242' : '#1c2230'
      ctx.beginPath()
      ctx.moveTo(gx + 0.5, HEADER)
      ctx.lineTo(gx + 0.5, height)
      ctx.stroke()
    }

    // Draw staffs as groups of 5 lines
    let yCursor = HEADER + TIMELINE.TOP_MARGIN - y
    for (const staff of this.data.staffs) {
      const spacing = TIMELINE.STAFF_LINE_SPACING
      for (let i = 0; i < staff.numberOfLines; i++) {
        const ly = yCursor + i * spacing
        drawHorizontalLine(ctx, LEFT_MARGIN, width, ly)
      }

      // Record staff block metrics
      this.metrics.staffBlocks.push({ id: staff.id, yTop: yCursor, yBottom: yCursor + staff.numberOfLines * spacing, lineSpacing: spacing })

      yCursor += staff.numberOfLines * spacing + TIMELINE.STAFF_SPACING - staff.numberOfLines * spacing
    }

    // Draw tasks
    for (const task of this.data.tasks) {
      const staffBlock = this.metrics.staffBlocks.find(b => b.id === task.staffId)
      if (!staffBlock) continue
      const lineStep = staffBlock.lineSpacing / 2
      const centerY = staffBlock.yTop + task.staffLine * lineStep
      const h = Math.max(12, Math.min(18, Math.floor(lineStep)))
      const yTop = centerY - h / 2

      // compute x from startDate: days since 2024-01-01
      const start = Date.UTC(2024, 0, 1)
      const parts = task.startDate.split('-').map(Number)
      if (parts.length !== 3 || Number.isNaN(parts[0]!)) continue
      const d = Date.UTC(parts[0]!, (parts[1]! - 1), parts[2]!)
      const day = Math.max(0, Math.round((d - start) / (24 * 3600 * 1000)))
      const xLeft = LEFT_MARGIN + (day - x) * pxPerDay
      const w = Math.max(4, Math.round(task.durationDays * pxPerDay))

      // skip if far off screen
      if (xLeft + w < LEFT_MARGIN - 200 || xLeft > width + 200) continue
      if (yTop > height || yTop + h < HEADER) continue

      // fill
      const selected = this.data.selection.includes(task.id)
      ctx.fillStyle = selected ? '#3b82f680' : '#6ee7b780'
      ctx.fillRect(xLeft, yTop, w, h)
      // border
      ctx.strokeStyle = selected ? '#3b82f6' : '#10b981'
      ctx.strokeRect(xLeft + 0.5, yTop + 0.5, w - 1, h - 1)

      // title
      ctx.fillStyle = '#0b0f16'
      ctx.font = '10px system-ui'
      ctx.fillText(task.title, xLeft + 4, yTop + h - 3)

      this.layout.push({ id: task.id, x: xLeft, y: yTop, w, h })
    }

    // Draw dependencies (simple finish-to-start lines)
    ctx.strokeStyle = '#7f8ea3'
    ctx.lineWidth = 1
    for (const dep of this.data.dependencies) {
      const src = this.layout.find(r => r.id === dep.srcTaskId)
      const dst = this.layout.find(r => r.id === dep.dstTaskId)
      if (!src || !dst) continue
      const x0 = src.x + src.w
      const y0 = src.y + src.h / 2
      const x1 = dst.x
      const y1 = dst.y + dst.h / 2
      const midX = (x0 + x1) / 2
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(midX, y0)
      ctx.lineTo(midX, y1)
      ctx.lineTo(x1, y1)
      ctx.stroke()
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
}
