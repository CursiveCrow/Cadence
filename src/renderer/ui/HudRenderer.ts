import { Container, Graphics, Text, Sprite, Texture } from 'pixi.js'
import { computeDateHeaderHeight, computeDateHeaderViewModel } from '../dateHeader'
import { PROJECT_START_DATE } from '../../config'
import { TIMELINE } from '../utils'
import type { Staff } from '../../types'

// HUD UI state interface
interface HudUIState {
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
}

// HUD node cache for performance
interface HudNodes {
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
}

// Gradient textures cache
interface GradientTextures {
    radialSmall?: Texture
    radialLarge?: Texture
    streak?: Texture
}

export class HudRenderer {
    private hudPersistent: Container | null = null
    private hudNodes: HudNodes = {}
    private gradientTex: GradientTextures = {}

    // UI state
    private ui: HudUIState = {
        headerHeight: 56,
        sidebarWidth: 220,
        rects: {},
        modal: null,
        tmpStaffName: '',
        tmpStaffLines: 5,
        sheenX: 0,
        sheenY: 0,
        lagX: 0,
        lagY: 0
    }

    constructor(hudPersistent: Container) {
        this.hudPersistent = hudPersistent
    }

    // Main HUD rendering method
    render(
        hud: Container,
        screenW: number,
        screenH: number,
        viewport: { x: number; y: number; zoom: number },
        data: { staffs: Staff[]; selection: string[] },
        metrics: { staffBlocks: { id: string; yTop: number; yBottom: number; lineSpacing: number }[] }
    ) {
        // Update header height from zoom
        const headerH = computeDateHeaderHeight(viewport.zoom || 1)
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

        // Render components
        this.renderDateHeader(hud, screenW, viewport, headerH)
        this.renderRimHighlight(hud, sidebarW, screenH)
        this.renderSidebarControls(hud, sidebarW)
        this.renderToolbarButtons(hud, screenW, data.selection)
        this.renderStaffLabels(hud, sidebarW, data.staffs, metrics.staffBlocks)
    }

    private renderDateHeader(hud: Container, screenW: number, viewport: { x: number; y: number; zoom: number }, headerH: number) {
        try {
            const vm = computeDateHeaderViewModel({
                viewport,
                projectStart: PROJECT_START_DATE,
                leftMargin: TIMELINE.LEFT_MARGIN,
                dayWidth: TIMELINE.DAY_WIDTH,
                width: screenW,
            })

            // Month ticks
            if (!this.hudNodes.monthTicks) { this.hudNodes.monthTicks = new Graphics() }
            const monthTicks = this.hudNodes.monthTicks
            monthTicks.clear()
            for (const x of vm.monthTickXs) {
                monthTicks.moveTo(Math.round(x) + 0.5, 2)
                monthTicks.lineTo(Math.round(x) + 0.5, headerH - 2)
                monthTicks.stroke({ width: 2, color: 0x7c3aed, alpha: 0.45 })
            }
            hud.addChild(monthTicks)

            // Day ticks
            if (!this.hudNodes.dayTicks) { this.hudNodes.dayTicks = new Graphics() }
            const dayTicks = this.hudNodes.dayTicks
            dayTicks.clear()
            for (const x of vm.dayTickXs) {
                dayTicks.moveTo(Math.round(x) + 0.5, 2)
                dayTicks.lineTo(Math.round(x) + 0.5, headerH - 2)
                dayTicks.stroke({ width: 1, color: 0xffffff, alpha: 0.22 })
            }
            hud.addChild(dayTicks)

            // Layout bands similar to CSS component
            const bandH = 24
            const daysProgress = Math.max(0, Math.min(1, (viewport.zoom - 0.75) / 0.25))
            const hoursProgress = Math.max(0, Math.min(1, (viewport.zoom - 2) / 0.5))
            const monthTop = 6
            const dayTop = Math.round(bandH * daysProgress)
            const hourTop = Math.round(bandH + bandH * hoursProgress)

            // Prepare label pools
            const ensurePool = (key: 'labelsMonth' | 'labelsDay' | 'labelsHour') => {
                if (!this.hudNodes[key]) this.hudNodes[key] = []
            }
            ensurePool('labelsMonth'); ensurePool('labelsDay'); ensurePool('labelsHour')

            this.reuseLabels(hud, this.hudNodes.labelsMonth!, vm.monthLabels.map(d => ({ text: d.text, x: d.x + 6 })), monthTop, 12, 0.95, true)
            this.reuseLabels(hud, this.hudNodes.labelsDay!, vm.dayLabels.map(d => ({ text: d.text, x: d.x + 5 })), dayTop + 4, 11, 0.85)
            this.reuseLabels(hud, this.hudNodes.labelsHour!, vm.hourLabels.map(d => ({ text: d.text, x: d.x })), hourTop + 4, 10, 0.75)
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[HudRenderer]renderDateHeader', err)
        }
    }

    private reuseLabels(
        hud: Container,
        pool: Text[],
        data: { text: string; x: number }[],
        y: number,
        size: number,
        alpha: number,
        bold?: boolean
    ) {
        const count = data.length
        // create or trim pool to size
        while (pool.length < count) {
            const t = new Text({
                text: '',
                style: {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: size,
                    fontWeight: bold ? 'bold' : 'normal',
                    fill: 0xffffff
                }
            })
            pool.push(t)
        }
        while (pool.length > count) {
            const t = pool.pop()!
            try { t.destroy() } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[HudRenderer]destroy pooled label', err)
            }
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

    private renderRimHighlight(hud: Container, sidebarW: number, screenH: number) {
        const rim = new Graphics()
        rim.rect(sidebarW - 2, 0, 2, screenH)
        rim.fill({ color: 0xffffff, alpha: 0.08 })
        hud.addChild(rim)
    }

    private renderSidebarControls(hud: Container, _sidebarW: number) {
        const pad = 10
        const hdrY = Math.max(8, Math.round(this.ui.headerHeight + 8))

        // "Staves" label
        const staves = new Text({
            text: 'Staves',
            style: {
                fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                fontSize: 12,
                fontWeight: 'bold',
                fill: 0xbcc3d6
            }
        })
        staves.x = pad
        staves.y = hdrY
        hud.addChild(staves)

        // Buttons: Add Note, Manage (in sidebar header)
        let nextX = pad + Math.round(staves.width) + 10
        nextX = this.makeButton(hud, 'btn:addNote', '+ Add Note', nextX, hdrY)
        this.makeButton(hud, 'btn:manage', 'Manage', nextX, hdrY)
    }

    private makeButton(hud: Container, key: string, label: string, x: number, btnY: number): number {
        const btnH = 22
        const t = new Text({
            text: label,
            style: {
                fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                fontSize: 11,
                fill: 0xffffff
            }
        })
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

    private renderToolbarButtons(hud: Container, screenW: number, selection: string[]) {
        // Toolbar button on header (top-right): Link Selected
        const canLink = (selection || []).length === 2
        const linkLabel = 'Link Selected'
        const linkText = new Text({
            text: linkLabel,
            style: {
                fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                fontSize: 12,
                fill: 0xffffff
            }
        })
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
    }

    private renderStaffLabels(
        hud: Container,
        sidebarW: number,
        staffs: Staff[],
        staffBlocks: { id: string; yTop: number; yBottom: number; lineSpacing: number }[]
    ) {
        try {
            for (const sb of staffBlocks) {
                const staff = staffs.find(s => s.id === sb.id)
                if (!staff) continue

                const centerY = Math.round((sb.yTop + sb.yBottom) / 2)
                const name = new Text({
                    text: staff.name,
                    style: {
                        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                        fontSize: 12,
                        fontWeight: 'bold',
                        fill: 0xbcc3d6
                    }
                })
                name.x = Math.max(6, sidebarW - 12 - Math.round(name.width))
                name.y = Math.max(0, centerY - Math.round(name.height / 2))
                hud.addChild(name)

                const ts = String(staff.timeSignature || '4/4')
                const tsText = new Text({
                    text: ts,
                    style: {
                        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
                        fontSize: 11,
                        fill: 0x94a3b8
                    }
                })
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
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[HudRenderer]renderStaffLabels', err)
        }
    }

    // Persistent HUD background rendering
    ensureHudPersistentNodes(screenW: number, screenH: number, sidebarW: number, headerH: number) {
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
        sbMask.clear()
        sbMask.rect(0, 0, sidebarW, screenH)
        sbMask.fill({ color: 0xffffff, alpha: 1 })

        // Sidebar background panel
        if (!this.hudNodes.sbBg) {
            this.hudNodes.sbBg = new Graphics()
            this.hudNodes.sbLayer.addChild(this.hudNodes.sbBg)
        }
        const sbBg = this.hudNodes.sbBg
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
            hp.addChild(this.hudNodes.headerBg)
        }
        const headerBg = this.hudNodes.headerBg
        headerBg.clear()
        headerBg.rect(0, 0, screenW, headerH)
        headerBg.fill({ color: 0x0c0b0a, alpha: 0.92 })
        headerBg.rect(0, headerH - 1, screenW, 1)
        headerBg.fill({ color: 0xffffff, alpha: 0.08 })

        // Update gradient sprites
        this.updateGradientSprites(sidebarW, screenH)
    }

    private updateGradientSprites(sidebarW: number, screenH: number) {
        // Gradient sprites: create once and update positions/sizes
        this.ensureGradientTextures()
        if (!this.hudNodes.bloomL && this.hudPersistent) {
            this.hudNodes.bloomL = new Sprite(this.gradientTex.radialLarge!)
            this.hudNodes.bloomL.blendMode = 'screen'
            this.hudNodes.bloomL.anchor.set(0.5)
            this.hudNodes.sbLayer!.addChild(this.hudNodes.bloomL)
        }
        if (!this.hudNodes.bloomS && this.hudPersistent) {
            this.hudNodes.bloomS = new Sprite(this.gradientTex.radialSmall!)
            this.hudNodes.bloomS.blendMode = 'screen'
            this.hudNodes.bloomS.anchor.set(0.5)
            this.hudNodes.sbLayer!.addChild(this.hudNodes.bloomS)
        }
        if (!this.hudNodes.streak && this.hudPersistent) {
            this.hudNodes.streak = new Sprite(this.gradientTex.streak!)
            this.hudNodes.streak.blendMode = 'screen'
            this.hudNodes.streak.anchor.set(0.5)
            this.hudNodes.sbLayer!.addChild(this.hudNodes.streak)
        }

        // Update gradient sprite transforms based on current lag target
        const lagX = Math.round(this.ui.lagX)
        const lagY = Math.round(this.ui.lagY)

        if (this.hudNodes.bloomL) {
            const bloomL = this.hudNodes.bloomL
            bloomL.x = Math.max(40, Math.min(sidebarW - 40, lagX - 20))
            bloomL.y = Math.max(40, Math.min(screenH - 40, lagY + 30))
            bloomL.alpha = 0.35
            const bloomLSize = Math.min(420, Math.max(220, Math.floor(Math.min(sidebarW, screenH) * 0.8)))
            bloomL.width = bloomLSize
            bloomL.height = bloomLSize
        }

        if (this.hudNodes.bloomS) {
            const bloomS = this.hudNodes.bloomS
            bloomS.x = Math.max(24, Math.min(sidebarW - 24, lagX + 14))
            bloomS.y = Math.max(24, Math.min(screenH - 24, lagY - 10))
            bloomS.alpha = 0.6
            const bloomSSize = Math.min(260, Math.max(140, Math.floor(Math.min(sidebarW, screenH) * 0.45)))
            bloomS.width = bloomSSize
            bloomS.height = bloomSSize
        }

        if (this.hudNodes.streak) {
            const streak = this.hudNodes.streak
            streak.x = Math.max(60, Math.min(sidebarW - 60, lagX))
            streak.y = Math.max(36, Math.min(screenH - 36, lagY + 12))
            streak.rotation = -0.25
            streak.alpha = 0.4
            streak.width = Math.min(sidebarW * 0.9, 380)
            streak.height = 56
        }
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

    // Getters and setters for UI state
    getHeaderHeight(): number {
        return this.ui.headerHeight
    }

    getSidebarWidth(): number {
        return this.ui.sidebarWidth
    }

    setSidebarWidth(w: number) {
        const clamped = Math.max(180, Math.min(320, Math.round(w)))
        this.ui.sidebarWidth = clamped
        try {
            localStorage.setItem('cadence.sidebar.width', String(clamped))
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[HudRenderer]setSidebarWidth', err)
        }
    }

    private readSidebarWidth(): number {
        try {
            const v = localStorage.getItem('cadence.sidebar.width')
            const n = v ? parseInt(v, 10) : 220
            if (Number.isFinite(n)) return Math.max(180, Math.min(320, n))
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[HudRenderer]readSidebarWidth', err)
        }
        return 220
    }

    // UI hit testing
    hitTestUI(px: number, py: number): string | null {
        for (const [key, r] of Object.entries(this.ui.rects)) {
            if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return key
        }
        return null
    }

    // Update hover state for visual effects
    setHover(x: number | null, y: number | null) {
        try {
            if (x != null && y != null) {
                const sw = Math.max(180, Math.min(320, this.ui.sidebarWidth || 220))
                const sx = Math.max(16, Math.min(sw - 16, x))
                const sy = Math.max(16, Math.min(800 - 16, y)) // Using a reasonable default screen height
                this.ui.sheenX = sx
                this.ui.sheenY = sy
            }
        } catch (err) {
            if (import.meta?.env?.DEV) console.debug('[HudRenderer]setHover', err)
        }
    }

    // Modal state management
    openStaffManager() {
        this.ui.modal = 'staffManager'
    }

    closeModal() {
        this.ui.modal = null
    }

    getModal() {
        return this.ui.modal
    }

    // Temp staff data for staff manager
    getTempStaffName(): string {
        return this.ui.tmpStaffName
    }

    setTempStaffName(name: string) {
        this.ui.tmpStaffName = name
    }

    getTempStaffLines(): number {
        return this.ui.tmpStaffLines
    }

    setTempStaffLines(lines: number) {
        this.ui.tmpStaffLines = Math.max(1, Math.min(10, lines))
    }

    // Reset UI rects for each frame
    resetRects() {
        this.ui.rects = {}
    }

    // Get UI rects for external access
    getUIRects() {
        return this.ui.rects
    }
}
