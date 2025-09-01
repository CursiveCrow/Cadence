import { Application, Container } from 'pixi.js'
import { devLog, safeCall } from '../utils/devlog'
import { PAN_ZOOM_CONFIG } from '@cadence/config'

export interface ViewportState {
  x: number
  y: number
  zoom: number
}
export interface PanZoomCallbacks {
  getViewport: () => ViewportState
  setViewport: (v: ViewportState) => void
  getPixelsPerDayBase?: () => number
  getVerticalScale?: () => number
  setVerticalScale?: (scale: number) => void
}

export class PanZoomController {
  private app: Application
  private callbacks: PanZoomCallbacks
  private panState = { active: false, lastX: 0, lastY: 0, spaceHeld: false }
  private zoomDrag: {
    active: boolean
    originX: number
    originY: number
    startZoom: number
    startVScale: number
    startViewportY: number
  } = { active: false, originX: 0, originY: 0, startZoom: 1, startVScale: 1, startViewportY: 0 }
  constructor(app: Application, _viewport: Container, callbacks: PanZoomCallbacks) {
    this.app = app
    this.callbacks = callbacks
    this.attach()
  }
  destroy(): void {
    safeCall('panzoom: off wheel failed', () => {
      this.app.stage.off('wheel', this.onWheel as any)
    })
    const viewEl = this.app.view as HTMLCanvasElement | null
    safeCall('panzoom: remove pointerdown failed', () => {
      viewEl?.removeEventListener(
        'pointerdown',
        this.onPointerDownDom as any,
        { capture: true } as any
      )
    })
    safeCall('panzoom: remove pointermove(win) failed', () => {
      window.removeEventListener('pointermove', this.onPointerMoveWin as any, true)
    })
    safeCall('panzoom: remove pointermove(zoom) failed', () => {
      window.removeEventListener('pointermove', this.onPointerMoveZoom as any, true)
    })
    safeCall('panzoom: remove pointerup(endPan) failed', () => {
      window.removeEventListener('pointerup', this.endPan as any, true)
    })
    safeCall('panzoom: remove pointerup(endZoom) failed', () => {
      window.removeEventListener('pointerup', this.endZoom as any, true)
    })
    safeCall('panzoom: remove blur failed', () => {
      window.removeEventListener('blur', this.endPan as any, true)
    })
    safeCall('panzoom: remove keydown failed', () => {
      window.removeEventListener('keydown', this.onKeyDown as any, true)
    })
    safeCall('panzoom: remove keyup failed', () => {
      window.removeEventListener('keyup', this.onKeyUp as any, true)
    })
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
      const notches = (e?.deltaY ?? 0) / 100
      const factor = Math.pow(PAN_ZOOM_CONFIG.ZOOM_FACTOR_BASE, -notches)
      const minZ = PAN_ZOOM_CONFIG.MIN_ZOOM
      const maxZ = PAN_ZOOM_CONFIG.MAX_ZOOM
      const zoom1 = Math.max(minZ, Math.min(maxZ, Math.round(zoom0 * factor * 100) / 100))
      if (zoom1 === zoom0) return
      const basePPD = this.callbacks.getPixelsPerDayBase?.() ?? 60
      const ppd0 = basePPD * zoom0
      const ppd1 = basePPD * zoom1
      const worldX = current.x + sx / Math.max(0.0001, ppd0)
      const newX = worldX - sx / Math.max(0.0001, ppd1)
      const newY = current.y
      const clamped = this.clampViewport(newX, newY, zoom1)
      this.callbacks.setViewport(clamped)
    } catch (err) {
      devLog.warn('panzoom: onWheel failed', err)
    }
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
    const basePPD = this.callbacks.getPixelsPerDayBase?.() ?? 60
    const ppd = Math.max(0.0001, basePPD * z)
    const dxDays = dx / ppd
    const newX = current.x - dxDays
    const newY = current.y - dy
    const clamped = this.clampViewport(newX, newY, current.zoom)
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
    const startZ = this.zoomDrag.startZoom
    const factorX = Math.pow(PAN_ZOOM_CONFIG.ZOOM_FACTOR_BASE, dx)
    const minZ = PAN_ZOOM_CONFIG.MIN_ZOOM
    const maxZ = PAN_ZOOM_CONFIG.MAX_ZOOM
    const nextZ = Math.max(minZ, Math.min(maxZ, Math.round(startZ * factorX * 100) / 100))
    const basePPD = this.callbacks.getPixelsPerDayBase?.() ?? 60
    const ppd0 = basePPD * (current.zoom || 1)
    const ppd1 = basePPD * nextZ
    const worldX = current.x + this.zoomDrag.originX / Math.max(0.0001, ppd0)
    const newX = worldX - this.zoomDrag.originX / Math.max(0.0001, ppd1)
    const startS = this.zoomDrag.startVScale || 1
    const factorY = Math.pow(PAN_ZOOM_CONFIG.ZOOM_FACTOR_BASE, -dy)
    const minS = PAN_ZOOM_CONFIG.VERTICAL_SCALE_MIN
    const maxS = PAN_ZOOM_CONFIG.VERTICAL_SCALE_MAX
    const nextS = Math.max(minS, Math.min(maxS, Math.round(startS * factorY * 100) / 100))
    const r = nextS / startS
    const startY = this.zoomDrag.startViewportY || 0
    const anchor = this.zoomDrag.originY
    const newY = Math.max(0, Math.round(r * startY + (r - 1) * anchor))
    this.callbacks.setVerticalScale?.(nextS)
    const clamped = this.clampViewport(newX, newY, nextZ)
    this.callbacks.setViewport(clamped)
  }
  private endZoom = () => {
    this.zoomDrag.active = false
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
