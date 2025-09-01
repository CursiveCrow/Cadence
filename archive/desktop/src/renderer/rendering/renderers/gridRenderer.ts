import type { TimelineConfig } from '../../core/scene'
import type { ViewportState } from '../../core/panzoom'
import { computeViewportAlignment, getGridParamsForZoom } from '../../utils/layout'
import { devLog } from '../../utils/devlog'
import type { Application } from 'pixi.js'

export function updateGpuGrid(app: Application, gpuGrid: any, viewport: ViewportState, effectiveCfg: TimelineConfig, getProjectStartDate: () => Date): void {
    if (!gpuGrid || !app) return
    try {
        const screenW = app.screen.width
        const screenH = app.screen.height
        const cfgEff = effectiveCfg as any
        const projectStart = getProjectStartDate()
        const gp = getGridParamsForZoom(viewport.zoom || 1, projectStart)
        gpuGrid.container.visible = true
        gpuGrid.setSize(screenW, screenH)
        const alignment = computeViewportAlignment(cfgEff as any, viewport.x || 0)
        const res = (app.renderer as any).resolution ?? (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1)
        gpuGrid.updateUniforms({
            screenWidth: screenW,
            screenHeight: screenH,
            leftMarginPx: cfgEff.LEFT_MARGIN * res,
            viewportXDays: alignment.viewportXDaysQuantized,
            dayWidthPx: cfgEff.DAY_WIDTH * res,
            minorStepDays: gp.minorStepDays,
            majorStepDays: gp.majorStepDays,
            minorColor: cfgEff.GRID_COLOR_MINOR,
            majorColor: cfgEff.GRID_COLOR_MAJOR,
            minorAlpha: gp.minorAlpha,
            majorAlpha: gp.majorAlpha,
            minorLineWidthPx: gp.minorWidthPx,
            majorLineWidthPx: gp.majorWidthPx,
            scaleType: gp.scaleType as any,
            baseDow: gp.baseDow,
            weekendAlpha: gp.weekendAlpha,
            globalAlpha: gp.globalAlpha,
            bandAlpha: gp.scaleType === 'day' || gp.scaleType === 'week' ? 0.04 : 0.0,
        })
    } catch (err) {
        devLog.warn('gridRenderer.updateGpuGrid failed', err)
    }
}


