import type { TimelineConfig } from '../core/scene'

export interface RendererContext {
    getZoom: () => number
    getEffectiveConfig: () => TimelineConfig
    getProjectStartDate: () => Date
}


