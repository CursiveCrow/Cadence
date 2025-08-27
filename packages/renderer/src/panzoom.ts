import { Application, Container } from 'pixi.js'

export interface ViewportState { x: number; y: number; zoom: number }
export interface PanZoomCallbacks { getViewport: () => ViewportState; setViewport: (v: ViewportState) => void }

export class PanZoomController {
    private app: Application
    private callbacks: PanZoomCallbacks
    private panState = { active: false, lastX: 0, lastY: 0, spaceHeld: false }

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
        try { window.removeEventListener('pointerup', this.endPan as any, true) } catch { }
        try { window.removeEventListener('blur', this.endPan as any, true) } catch { }
        try { window.removeEventListener('keydown', this.onKeyDown as any, true) } catch { }
        try { window.removeEventListener('keyup', this.onKeyUp as any, true) } catch { }
    }

    private attach(): void {
        this.app.stage.on('wheel', this.onWheel as any)
        const viewEl = this.app.view as HTMLCanvasElement | null
        viewEl?.addEventListener('pointerdown', this.onPointerDownDom as any, { capture: true })
        window.addEventListener('pointermove', this.onPointerMoveWin as any, true)
        window.addEventListener('pointerup', this.endPan as any, true)
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
            const sy = (e as any)?.global?.y ?? 0
            const notches = (e?.deltaY ?? 0) / 100
            const stepPerNotch = 0.02
            const factor = Math.pow(1 + stepPerNotch, -notches)
            const minZ = 0.1
            const maxZ = 10
            const zoom1 = Math.max(minZ, Math.min(maxZ, Math.round((zoom0 * factor) * 100) / 100))
            if (zoom1 === zoom0) return
            const worldX = current.x + sx / zoom0
            const worldY = current.y + sy / zoom0
            const newX = worldX - sx / zoom1
            const newY = worldY - sy / zoom1
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
        this.panState.active = true
        this.panState.lastX = pos.x
        this.panState.lastY = pos.y
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


