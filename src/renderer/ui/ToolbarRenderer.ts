import { Container, Graphics, Text } from 'pixi.js'
import { getCssVarColor } from '@shared/colors'
import { BUTTON, SPACING } from '@config/ui'

type Rect = { x: number; y: number; w: number; h: number }

export class ToolbarRenderer {
  private rects: Record<string, Rect> = {}
  private g?: Graphics
  private labels: Record<string, Text> = {}

  render(ui: Container, screenW: number, selection: string[]) {
    const btnW = BUTTON.SMALL_WIDTH || 28
    const btnH = BUTTON.MEDIUM_HEIGHT || 22
    const pad = SPACING.MEDIUM || 8
    const top = SPACING.SMALL || 6
    const keys = ['btn:addNote', 'btn:manage', 'btn:link']
    const startX = Math.max(0, screenW - (btnW + pad) * keys.length - pad)
    this.rects = {}

    const g = this.g ?? (this.g = new Graphics())
    g.clear()

    const primary = getCssVarColor('--ui-color-primary', 0x7c3aed)
    const btnBg = getCssVarColor('--ui-color-bg', 0x2a2830)

    keys.forEach((k, i) => {
      const x = startX + i * (btnW + pad)
      const r = { x, y: top, w: btnW, h: btnH }
      this.rects[k] = r
      g.roundRect(r.x, r.y, r.w, r.h, BUTTON.BORDER_RADIUS || 6)
      const active = (k === 'btn:link' ? selection.length >= 2 : true)
      g.fill({ color: active ? primary : btnBg, alpha: active ? 0.35 : 0.15 })

      const label: any = this.labels[k] ?? (this.labels[k] = new Text({ text: '', style: { fill: 0xffffff, fontSize: 12 } }))
      label.text = k === 'btn:addNote' ? '+' : k === 'btn:manage' ? 'Manage' : 'Link'
      label.style = { fill: 0xffffff, fontSize: 12 }
      const lw = (label.width || 0) as number
      const lh = (label.height || 0) as number
      label.x = Math.round(x + r.w / 2 - lw / 2)
      label.y = Math.round(top + r.h / 2 - lh / 2)
      ui.addChild(label)
    })

    ui.addChild(g)
  }

  hitTest(x: number, y: number): string | null {
    for (const [k, r] of Object.entries(this.rects)) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return k
    }
    return null
  }
}
