import type { TimelineConfig } from './renderer'

export interface RendererContext {
    getZoom: () => number
    getEffectiveConfig: () => TimelineConfig
    getProjectStartDate: () => Date
}

