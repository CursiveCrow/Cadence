import type { Application, Container } from 'pixi.js'
import { PanZoomController, ViewportState } from '../../core/panzoom'

export interface PanZoomWiringOptions {
    app: Application
    viewportContainer: Container
    getViewport: () => ViewportState
    setViewport: (v: ViewportState) => void
    getPixelsPerDayBase: () => number
    getVerticalScale: () => number
    setVerticalScale: (s: number) => void
}

export function createPanZoomController(opts: PanZoomWiringOptions): PanZoomController {
    return new PanZoomController(opts.app, opts.viewportContainer, {
        getViewport: opts.getViewport,
        setViewport: opts.setViewport,
        getPixelsPerDayBase: opts.getPixelsPerDayBase,
        getVerticalScale: opts.getVerticalScale,
        setVerticalScale: opts.setVerticalScale,
    })
}


