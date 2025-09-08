import { Container, Graphics, Text } from 'pixi.js'
import { PROJECT_START_DATE } from '@config'
import { getCssVarColor } from '@shared/colors'
import { computeDateHeaderHeight, computeDateHeaderViewModel, DAY_THRESHOLD, HOUR_THRESHOLD, dayIndexFromISO, worldDaysToScreenX, TIMELINE } from '@renderer/timeline'
import { HEADER, SPACING } from '@config/ui'

export class HeaderRenderer {
  private bg?: Graphics
  private todayTick?: Graphics
  private labelsMonth: Text[] = []
  private labelsDay: Text[] = []
  private labelsHour: Text[] = []
  private headerHeight: number = HEADER.DEFAULT_HEIGHT

  getHeaderHeight() { return this.headerHeight }

  render(ui: Container, screenW: number, viewport: { x: number; y: number; zoom: number }, leftMargin: number) {
    this.headerHeight = computeDateHeaderHeight(viewport.zoom || 1)
    const vm = computeDateHeaderViewModel({
      viewport,
      projectStart: PROJECT_START_DATE,
      leftMargin,
      dayWidth: TIMELINE.DAY_WIDTH, // timeline DAY_WIDTH; labels/ticks are scaled via zoom in VM
      width: screenW,
    })

    // Zoom progress used for shelf reveals
    const dayProg = Math.max(0, Math.min(1, ((viewport.zoom || 1) - DAY_THRESHOLD) / 0.25))
    const hoursProg = Math.max(0, Math.min(1, ((viewport.zoom || 1) - HOUR_THRESHOLD) / 0.5))

    // Header background with shelves that slide out from the previous tier
    if (!this.bg) this.bg = new Graphics()
    this.bg.clear()
    const hdrBg = getCssVarColor('--ui-color-bg', 0x0b0b0f)
    // Opaque underlay to ensure nothing from the timeline shows through
    this.bg.rect(0, 0, Math.max(0, screenW), Math.max(0, this.headerHeight))
    this.bg.fill({ color: hdrBg, alpha: 1.0 })
    const monthBandH = Math.min(SPACING.EXTRA_LARGE + 6, Math.max(SPACING.EXTRA_LARGE, Math.round(this.headerHeight * 0.5)))
    const dayBandH = Math.max(0, this.headerHeight - monthBandH)
    const x0 = Math.round(leftMargin)
    const w = Math.max(0, screenW - leftMargin)
    // Partition the lower band into a day shelf and an hour shelf
    const hourShelfH = Math.min(dayBandH, Math.round(24 * hoursProg))
    const dayShelfH = Math.max(0, dayBandH - hourShelfH)
    const dayReveal = Math.round((1 - dayProg) * 10)
    const hourReveal = Math.round((1 - hoursProg) * 8)

    // 1) Hour shelf first (appears under the day shelf)
    if (hourShelfH > 0) {
      const yHour = monthBandH + dayShelfH - hourReveal
      this.bg.rect(x0, yHour, w, hourShelfH + hourReveal)
      this.bg.fill({ color: hdrBg, alpha: 1.0 })
    }

    // 2) Day shelf next (slides from beneath month shelf)
    if (dayShelfH > 0) {
      const yDay = monthBandH - dayReveal
      this.bg.rect(x0, yDay, w, dayShelfH + dayReveal)
      this.bg.fill({ color: hdrBg, alpha: 1.0 })
    }

    // 3) Month band last, so it visually sits above the revealing day shelf
    this.bg.rect(x0, 0, w, monthBandH)
    this.bg.fill({ color: hdrBg, alpha: 1.0 })
    ui.addChild(this.bg)

    // Remove vertical grid-aligned ticks in the header to keep it clean/opaque.
    // (We still keep the today indicator and labels below.)

    // labels (simple, no pooling beyond array reuse)
    const ensureText = (arr: Text[], idx: number, text: string, color: number, y: number) => {
      if (!arr[idx]) arr[idx] = new Text({ text, style: { fill: color, fontSize: 12 } })
      arr[idx].text = text
      arr[idx].y = y
      return arr[idx]
    }

    // Month labels (small caps)
    for (let i = 0; i < vm.monthLabels.length; i++) {
      const monthColor = getCssVarColor('--ui-color-text-soft', 0xb39dfa)
      const text = (vm.monthLabels[i]!.text || '').toUpperCase()
      const lbl = ensureText(this.labelsMonth, i, text, monthColor, Math.max(2, Math.round((monthBandH - 11) / 2)))
      ;(lbl.style as any).fontSize = 11
      ;(lbl.style as any).fill = monthColor
      lbl.x = vm.monthLabels[i]!.x
      ui.addChild(lbl)
    }
    // Day labels: numeric-only and slide-in as zoom crosses DAY_THRESHOLD
    const slidePx = Math.round((1 - dayProg) * 12)
    const dayAlpha = Math.max(0, Math.min(1, dayProg))
    for (let i = 0; i < vm.dayLabels.length; i++) {
      const lbl = ensureText(this.labelsDay, i, vm.dayLabels[i]!.text, 0xffffff, monthBandH + 4 + slidePx)
      ;(lbl.style as any).fontSize = 11
      ;(lbl.style as any).fill = 0xffffff
      lbl.x = vm.dayLabels[i]!.x
      lbl.alpha = dayAlpha
      ui.addChild(lbl)
    }
    // Hour labels
    for (let i = 0; i < vm.hourLabels.length; i++) {
      const baseY = Math.max(monthBandH + 20, this.headerHeight - 14)
      const slideH = Math.round((1 - hoursProg) * 8)
      const lbl = ensureText(this.labelsHour, i, vm.hourLabels[i]!.text, 0xdddddd, baseY + slideH)
      ;(lbl.style as any).fontSize = 10
      ;(lbl.style as any).fill = 0xdddddd
      lbl.x = vm.hourLabels[i]!.x
      lbl.alpha = hoursProg
      ui.addChild(lbl)
    }

    // Today tick in header (ink accent)
    try {
      const now = new Date()
      const yyyy = now.getUTCFullYear()
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(now.getUTCDate()).padStart(2, '0')
      const idx = dayIndexFromISO(`${yyyy}-${mm}-${dd}`, PROJECT_START_DATE)
      const x = worldDaysToScreenX(idx, viewport, leftMargin, TIMELINE.DAY_WIDTH)
      if (!this.todayTick) this.todayTick = new Graphics()
      const g = this.todayTick
      g.clear()
      const accent = getCssVarColor('--ui-color-accent', 0xf6c560)
      g.moveTo(Math.round(x) + 0.5, 2)
      g.lineTo(Math.round(x) + 0.5, Math.max(0, this.headerHeight - 6))
      g.stroke({ width: 1, color: accent, alpha: 0.85 })
      // small triangle marker at bottom of header
      g.beginPath()
      g.moveTo(Math.round(x) - 4, this.headerHeight - 2)
      g.lineTo(Math.round(x) + 4, this.headerHeight - 2)
      g.lineTo(Math.round(x), this.headerHeight - 8)
      g.closePath()
      g.fill({ color: accent, alpha: 0.95 })
      ui.addChild(g)
    } catch {}
  }
}
