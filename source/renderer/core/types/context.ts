import type { TimelineConfig } from '../scene'

export interface RendererContext {
    getZoom: () => number
    getEffectiveConfig: () => TimelineConfig
    getProjectStartDate: () => Date
}

