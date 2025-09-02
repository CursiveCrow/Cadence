import { Container } from 'pixi.js'
import { drawGridAndStaff } from '../../../core/scene'
import type { TimelineConfig } from '../../../core/types/renderer'

/**
 * Instance-scoped grid manager that replaces function-static caches.
 */
export class GridManager {
    private metaMap: WeakMap<Container, { w: number; h: number; z: number; cfg: string }>
    constructor() { this.metaMap = new WeakMap() }

    ensure(
        container: Container,
        config: TimelineConfig,
        staffs: any[],
        projectStartDate: Date,
        screenWidth: number,
        screenHeight: number,
        zoom: number,
        alignment: { viewportXDaysQuantized: number; viewportPixelOffsetX: number },
        _useGpuGrid: boolean
    ): void {
        const meta = this.metaMap.get(container)
        const rz = Math.round((zoom || 1) * 100) / 100
        const cfgKey = `${config.TOP_MARGIN}|${config.STAFF_SPACING}|${config.STAFF_LINE_SPACING}|${staffs.length}|${alignment.viewportXDaysQuantized}|${alignment.viewportPixelOffsetX}`
        if (container.children.length > 0 && meta?.w === screenWidth && meta?.h === screenHeight && meta?.z === rz && meta?.cfg === cfgKey) return
        container.removeChildren()
        drawGridAndStaff(container, config, staffs as any, projectStartDate, screenWidth, screenHeight, rz, alignment)
        this.metaMap.set(container, { w: screenWidth, h: screenHeight, z: rz, cfg: cfgKey })
    }
}
