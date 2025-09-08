import { Container, Graphics, Text } from 'pixi.js'
import { firstHit } from '../../shared/geom'
import { getCssVarColor } from '../../shared/colors'
import { SIDEBAR, SPACING } from '@config/ui'
import type { Staff } from '../../types'

export class SidebarRenderer {
  private bg?: Graphics
  private rects: Record<string, { x: number; y: number; w: number; h: number }> = {}
  private labels: Record<string, Text> = {}

  render(
    ui: Container,
    screenH: number,
    width: number,
    staffs?: Staff[],
    staffBlocks?: Array<{ id: string; yTop: number; yBottom: number; lineSpacing: number }>
  ) {
    if (!this.bg) this.bg = new Graphics()
    this.bg.clear()
    this.bg.rect(0, 0, Math.max(0, width), Math.max(0, screenH))
    const sbBg = getCssVarColor('--ui-color-bg', 0x111112)
    this.bg.fill({ color: sbBg, alpha: 0.88 })
    ui.addChild(this.bg)

    // simple rim highlight
    // reset rects once at start of frame
    this.rects = {}

    const rim = new Graphics()
    rim.rect(Math.max(0, width) - 1, 0, 1, Math.max(0, screenH))
    rim.fill({ color: 0xffffff, alpha: 0.08 })
    // Resize grip area (invisible but hit-testable)
    const gripW = SPACING.SMALL
    const gripX = Math.max(0, width) - gripW
    this.rects['sb:resize'] = { x: gripX, y: 0, w: gripW, h: Math.max(0, screenH) }
    ui.addChild(rim)

    // Staff labels
    if (staffs && staffBlocks) {
      for (const sb of staffBlocks) {
        const staff = staffs.find(s => s.id === sb.id)
        if (!staff) continue
        const key = `staff:${staff.id}`
        const label: any = this.labels[key] ?? (this.labels[key] = new Text({ text: '', style: { fill: 0xb3b3b3, fontSize: 12 } }))
        label.text = staff.name
        label.x = SIDEBAR.PADDING
        // center label vertically within staff
        const cy = sb.yTop + (sb.yBottom - sb.yTop) / 2
        label.y = Math.round(cy - (label.height || 12) / 2)
        ui.addChild(label)

        // clickable rect for future interactions
        const h = Math.max(SPACING.ROW_HEIGHT - 4, (sb.yBottom - sb.yTop))
        this.rects[key] = { x: 0, y: Math.round(sb.yTop), w: Math.max(0, width), h }
      }
    }
  }

  hitTest(x: number, y: number): string | null {
    return firstHit(this.rects, x, y)
  }
}
