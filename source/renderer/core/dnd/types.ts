import { Application, Container } from 'pixi.js'
import { TimelineSceneManager } from '../scene'
import type { TimelineConfig } from '../types/renderer'
import { DependencyType, Task, Staff } from '@cadence/core'

export interface Layers {
    viewport: Container
    background: Container
    dependencies: Container
    tasks: Container
    selection: Container
    dragLayer: Container
}

export interface Utils {
    getProjectStartDate: () => Date
    findNearestStaffLine: (y: number) => { staff: Staff; staffLine: number; centerY: number } | null
    snapXToDay: (x: number) => { snappedX: number; dayIndex: number }
    dayIndexToIsoDate: (dayIndex: number) => string
    snapXToTime?: (x: number) => { snappedX: number; dayIndex: number }
}

export interface DataProviders {
    getTasks: () => Record<string, Task & { id: string; startDate: string; durationDays: number; staffId: string; staffLine: number }>
    getStaffs: () => Staff[]
    getDependencies: () => Record<string, any>
}

export interface Callbacks {
    select: (payload: { ids: string[]; anchor?: { x: number; y: number } }) => void
    onDragStart?: () => void
    onDragEnd?: () => void
    updateTask: (projectId: string, taskId: string, updates: Partial<any>) => void
    createDependency: (projectId: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }) => void
}

export interface DnDOptions {
    app: Application
    layers: Layers
    scene: TimelineSceneManager
    config: TimelineConfig
    projectId: string
    utils: Utils
    data: DataProviders
    callbacks: Callbacks
    getDayWidth?: () => number
    getTaskHeight?: () => number
    getScaledConfig?: () => { TOP_MARGIN: number; STAFF_SPACING: number; STAFF_LINE_SPACING: number }
}
