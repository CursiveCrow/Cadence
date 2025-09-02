import type { Application, Container } from 'pixi.js'
import type { Task, Dependency, Staff } from '@cadence/core'
import type { RendererContext } from './context'

export interface TimelineConfig {
    LEFT_MARGIN: number
    TOP_MARGIN: number
    DAY_WIDTH: number
    HOUR_WIDTH?: number
    WEEK_WIDTH?: number
    MONTH_WIDTH?: number
    STAFF_SPACING: number
    STAFF_LINE_SPACING: number
    TASK_HEIGHT: number
    STAFF_LINE_COUNT: number
    BACKGROUND_COLOR: number
    GRID_COLOR_MAJOR: number
    GRID_COLOR_MINOR: number
    STAFF_LINE_COLOR: number
    TASK_COLORS: Record<string, number>
    DEPENDENCY_COLOR: number
    SELECTION_COLOR: number
    TODAY_COLOR?: number
    DRAW_STAFF_LABELS?: boolean
    NOTE_START_PADDING?: number
    MEASURE_LENGTH_DAYS?: number
    MEASURE_OFFSET_DAYS?: number
    MEASURE_COLOR?: number
    MEASURE_LINE_WIDTH_PX?: number
    MEASURE_PAIR_SPACING_PX?: number
}

export type StaffLike = Staff
export type TaskLike = Task
export type DependencyLike = Dependency

export interface TaskLayout {
    startX: number
    centerY: number
    topY: number
    width: number
    radius: number
}

export interface TaskAnchors {
    leftCenterX: number
    leftCenterY: number
    rightCenterX: number
    rightCenterY: number
}

export type TimelineLayers = {
    viewport: Container
    background: Container
    dependencies: Container
    tasks: Container
    selection: Container
    dragLayer: Container
}

export interface RendererPlugin {
    onLayersCreated?(app: Application, layers: TimelineLayers, ctx: RendererContext): void
    onTaskUpserted?(task: TaskLike, container: Container, ctx: { layout: TaskLayout; config: TimelineConfig; zoom: number; selected: boolean }): void
    onDestroy?(): void
}


