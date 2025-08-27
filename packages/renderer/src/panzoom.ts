import { Application, Container } from 'pixi.js'

export interface ViewportState { x: number; y: number; zoom: number }
export interface PanZoomCallbacks {
    getViewport: () => ViewportState
    setViewport: (v: ViewportState) => void
    /** Returns base pixels-per-day at zoom=1; used to anchor zoom at cursor */
    getPixelsPerDayBase?: () => number
    /** Get current vertical scale factor (1 = base). */
    getVerticalScale?: () => number
    /** Set new vertical scale factor. */
    setVerticalScale?: (scale: number) => void
}

export class PanZoomController {
    private app: Application
    private callbacks: PanZoomCallbacks
    private panState = { active: false, lastX: 0, lastY: 0, spaceHeld: false }
    private zoomDrag: { active: boolean; originX: number; originY: number; startZoom: number; startVScale: number; startViewportY: number } = { active: false, originX: 0, originY: 0, startZoom: 1, startVScale: 1, startViewportY: 0 }

    constructor(app: Application, _viewport: Container, callbacks: PanZoomCallbacks) {
        this.app = app
        this.callbacks = callbacks
        this.attach()
    }

    destroy(): void {
        try { this.app.stage.off('wheel', this.onWheel as any) } catch { }
        const viewEl = this.app.view as HTMLCanvasElement | null
        try { viewEl?.removeEventListener('pointerdown', this.onPointerDownDom as any, { capture: true } as any) } catch { }
        try { window.removeEventListener('pointermove', this.onPointerMoveWin as any, true) } catch { }
        try { window.removeEventListener('pointermove', this.onPointerMoveZoom as any, true) } catch { }
        try { window.removeEventListener('pointerup', this.endPan as any, true) } catch { }
        try { window.removeEventListener('pointerup', this.endZoom as any, true) } catch { }
        try { window.removeEventListener('blur', this.endPan as any, true) } catch { }
        try { window.removeEventListener('keydown', this.onKeyDown as any, true) } catch { }
        try { window.removeEventListener('keyup', this.onKeyUp as any, true) } catch { }
    }

    private attach(): void {
        this.app.stage.on('wheel', this.onWheel as any)
        const viewEl = this.app.view as HTMLCanvasElement | null
        viewEl?.addEventListener('pointerdown', this.onPointerDownDom as any, { capture: true })
        window.addEventListener('pointermove', this.onPointerMoveWin as any, true)
        window.addEventListener('pointermove', this.onPointerMoveZoom as any, true)
        window.addEventListener('pointerup', this.endPan as any, true)
        window.addEventListener('pointerup', this.endZoom as any, true)
        window.addEventListener('blur', this.endPan as any, true)
        window.addEventListener('keydown', this.onKeyDown as any, true)
        window.addEventListener('keyup', this.onKeyUp as any, true)
    }

    private clampViewport(x: number, y: number, zoom: number): ViewportState {
        const clampedX = Math.max(0, x)
        const clampedY = Math.max(0, y)
        return { x: clampedX, y: clampedY, zoom }
    }

    private onWheel = (e: any) => {
        try {
            e?.preventDefault?.()
            const current = this.callbacks.getViewport()
            const zoom0 = current.zoom || 1
            const sx = (e as any)?.global?.x ?? 0
            // const sy = (e as any)?.global?.y ?? 0
            const notches = (e?.deltaY ?? 0) / 100
            const stepPerNotch = 0.02
            const factor = Math.pow(1 + stepPerNotch, -notches)
            const minZ = 0.1
            const maxZ = 20
            const zoom1 = Math.max(minZ, Math.min(maxZ, Math.round((zoom0 * factor) * 100) / 100))
            if (zoom1 === zoom0) return
            // Anchor zoom at cursor by converting screen X to world using base pixels-per-day
            const basePPD = this.callbacks.getPixelsPerDayBase?.() ?? 60
            const ppd0 = basePPD * zoom0
            const ppd1 = basePPD * zoom1
            const worldX = current.x + sx / Math.max(0.0001, ppd0)
            const newX = worldX - sx / Math.max(0.0001, ppd1)
            const newY = current.y // Y not scaled by zoom in our renderer
            const clamped = this.clampViewport(newX, newY, zoom1)
            this.callbacks.setViewport(clamped)
        } catch { }
    }

    private toViewCoords = (ev: PointerEvent) => {
        const view = this.app.view as HTMLCanvasElement
        const rect = view.getBoundingClientRect()
        const x = (ev.clientX - rect.left) * (view.width / rect.width)
        const y = (ev.clientY - rect.top) * (view.height / rect.height)
        return { x, y }
    }

    private onPointerDownDom = (ev: PointerEvent) => {
        const viewEl = this.app.view as HTMLCanvasElement | null
        if (!viewEl) return
        const isMiddle = ev.button === 1
        const useSpacePan = this.panState.spaceHeld
        if (!isMiddle && !useSpacePan) return
        const pos = this.toViewCoords(ev)
        // Middle button + Shift = zoom drag anchored at initial click (horizontal + vertical scale)
        if (isMiddle && ev.shiftKey) {
            const vp = this.callbacks.getViewport()
            this.zoomDrag.active = true
            this.zoomDrag.originX = pos.x
            this.zoomDrag.originY = pos.y
            this.zoomDrag.startZoom = vp.zoom || 1
            this.zoomDrag.startVScale = this.callbacks.getVerticalScale?.() ?? 1
            this.zoomDrag.startViewportY = vp.y
        } else {
            this.panState.active = true
            this.panState.lastX = pos.x
            this.panState.lastY = pos.y
        }
        ev.preventDefault()
        ev.stopPropagation()
        this.app.renderer?.events?.setCursor?.('grabbing')
    }

    private onPointerMoveWin = (ev: PointerEvent) => {
        if (!this.panState.active) return
        const pos = this.toViewCoords(ev)
        const dx = pos.x - this.panState.lastX
        const dy = pos.y - this.panState.lastY
        this.panState.lastX = pos.x
        this.panState.lastY = pos.y
        const current = this.callbacks.getViewport()
        const z = current.zoom || 1
        const newX = current.x - dx / z
        const newY = current.y - dy / z
        const snap = (v: number) => Math.round(v * 2) / 2
        const clamped = this.clampViewport(snap(newX), snap(newY), current.zoom)
        this.callbacks.setViewport(clamped)
    }

    private endPan = () => {
        if (!this.panState.active) return
        this.panState.active = false
        this.app.renderer?.events?.setCursor?.(null as any)
    }

    private onPointerMoveZoom = (ev: PointerEvent) => {
        if (!this.zoomDrag.active) return
        const pos = this.toViewCoords(ev)
        const dx = pos.x - this.zoomDrag.originX
        const dy = pos.y - this.zoomDrag.originY
        const current = this.callbacks.getViewport()
        // Horizontal zoom from dx
        const startZ = this.zoomDrag.startZoom
        const factorX = Math.pow(1.01, dx)
        const minZ = 0.1
        const maxZ = 20
        const nextZ = Math.max(minZ, Math.min(maxZ, Math.round((startZ * factorX) * 100) / 100))
        const basePPD = this.callbacks.getPixelsPerDayBase?.() ?? 60
        const ppd0 = basePPD * (current.zoom || 1)
        const ppd1 = basePPD * nextZ
        const worldX = current.x + (this.zoomDrag.originX / Math.max(0.0001, ppd0))
        const newX = worldX - (this.zoomDrag.originX / Math.max(0.0001, ppd1))

        // Vertical scale from dy (up = zoom in)
        const startS = this.zoomDrag.startVScale || 1
        const factorY = Math.pow(1.01, -dy)
        const minS = 0.5
        const maxS = 3
        const nextS = Math.max(minS, Math.min(maxS, Math.round((startS * factorY) * 100) / 100))
        // Anchor vertical scale at initial click: y' = r * y0 + (r - 1) * anchor
        const r = nextS / startS
        const startY = this.zoomDrag.startViewportY || 0
        const anchor = this.zoomDrag.originY
        const newY = Math.max(0, Math.round(r * startY + (r - 1) * anchor))
        // Apply updates
        this.callbacks.setVerticalScale?.(nextS)
        const clamped = this.clampViewport(newX, newY, nextZ)
        this.callbacks.setViewport(clamped)
    }

    private endZoom = () => { this.zoomDrag.active = false }

    private onKeyDown = (ev: KeyboardEvent) => {
        if (ev.code === 'Space') {
            this.panState.spaceHeld = true
            if (!this.panState.active) {
                this.app.renderer?.events?.setCursor?.('grab')
            }
            ev.preventDefault()
        }
    }

    private onKeyUp = (ev: KeyboardEvent) => {
        if (ev.code === 'Space') {
            this.panState.spaceHeld = false
            if (!this.panState.active) {
                this.app.renderer?.events?.setCursor?.(null as any)
            }
        }
    }
}


