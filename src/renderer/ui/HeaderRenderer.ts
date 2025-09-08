import { Container, Graphics, Text } from 'pixi.js'
import { PROJECT_START_DATE } from '@config'
import { getCssVarColor } from '../../shared/colors'
import { computeDateHeaderHeight, computeDateHeaderViewModel, DAY_THRESHOLD, dayIndexFromISO, worldDaysToScreenX, TIMELINE } from '@renderer/timeline'
import { HEADER, SPACING } from '@config/ui'

export class HeaderRenderer {
  private bg?: Graphics
  private monthTicks?: Graphics
  private dayTicks?: Graphics
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

    // Header background with two-tier bands (months/days), clipped to sidebar
    if (!this.bg) this.bg = new Graphics()
    this.bg.clear()
    const hdrBg = getCssVarColor('--ui-color-bg', 0x0b0b0f)
    const monthBandH = Math.min(SPACING.EXTRA_LARGE + 6, Math.max(SPACING.EXTRA_LARGE, Math.round(this.headerHeight * 0.5)))
    const dayBandH = Math.max(0, this.headerHeight - monthBandH)
    const x0 = Math.round(leftMargin)
    const w = Math.max(0, screenW - leftMargin)
    // Month band (darker)
    this.bg.rect(x0, 0, w, monthBandH)
    this.bg.fill({ color: hdrBg, alpha: 1.0 })
    this.bg.rect(x0, monthBandH - 1, w, 1)
    this.bg.fill({ color: 0xffffff, alpha: 0.05 })
    // Day band (slightly lighter)
    this.bg.rect(x0, monthBandH, w, dayBandH)
    this.bg.fill({ color: hdrBg, alpha: 1.0 })
    // Bottom divider
    this.bg.rect(x0, this.headerHeight - 1, w, 1)
    this.bg.fill({ color: 0xffffff, alpha: 0.06 })
    ui.addChild(this.bg)

    // ticks
    if (!this.monthTicks) this.monthTicks = new Graphics()
    if (!this.dayTicks) this.dayTicks = new Graphics()
    this.monthTicks.clear()
    for (const x of vm.monthTickXs) {
      this.monthTicks.moveTo(Math.round(x) + 0.5, Math.max(2, Math.floor(HEADER.PADDING / 4)))
      this.monthTicks.lineTo(Math.round(x) + 0.5, Math.max(2, monthBandH - Math.floor(SPACING.SMALL / 2)))
      const primary = getCssVarColor('--ui-color-primary', 0x7c3aed)
      this.monthTicks.stroke({ width: 2, color: primary, alpha: 0.45 })
    }
    ui.addChild(this.monthTicks)

    this.dayTicks.clear()
    for (const x of vm.dayTickXs) {
      this.dayTicks.moveTo(Math.round(x) + 0.5, monthBandH + Math.max(2, Math.floor(HEADER.PADDING / 4)))
      this.dayTicks.lineTo(Math.round(x) + 0.5, this.headerHeight - Math.max(2, Math.floor(HEADER.PADDING / 4)))
      this.dayTicks.stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
    }
    ui.addChild(this.dayTicks)

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
      lbl.x = vm.monthLabels[i]!.x
      ui.addChild(lbl)
    }
    // Day labels: numeric-only and slide-in as zoom crosses DAY_THRESHOLD
    const dayProgress = Math.max(0, Math.min(1, ((viewport.zoom || 1) - DAY_THRESHOLD) / 0.25))
    const slidePx = Math.round((1 - dayProgress) * 12)
    const dayAlpha = Math.max(0, Math.min(1, dayProgress))
    for (let i = 0; i < vm.dayLabels.length; i++) {
      const lbl = ensureText(this.labelsDay, i, vm.dayLabels[i]!.text, 0xffffff, monthBandH + 4 + slidePx)
      ;(lbl.style as any).fontSize = 11
      lbl.x = vm.dayLabels[i]!.x
      lbl.alpha = dayAlpha
      ui.addChild(lbl)
    }
    // Hour labels
    for (let i = 0; i < vm.hourLabels.length; i++) {
      const y = Math.max(monthBandH + 20, this.headerHeight - 14)
      const lbl = ensureText(this.labelsHour, i, vm.hourLabels[i]!.text, 0xdddddd, y)
      ;(lbl.style as any).fontSize = 10
      lbl.x = vm.hourLabels[i]!.x
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

