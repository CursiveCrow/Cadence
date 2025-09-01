import type { Task, Dependency, Staff } from '@cadence/core'
import type { TimelineConfig } from '../core/scene'

export interface EngineDataSnapshot {
    tasks: Record<string, Task>
    dependencies: Record<string, Dependency>
    staffs: Staff[]
    selection: string[]
}

export interface EffectiveTimelineContext { config: TimelineConfig; projectStartDate: Date }
export interface RendererContext { getZoom: () => number; getEffectiveConfig: () => TimelineConfig; getProjectStartDate: () => Date }

