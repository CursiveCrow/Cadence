import React from 'react'
import type { Task, Dependency } from '@cadence/core'

export interface TimelineCallbacks {
    onSelect: (ids: string[]) => void
    onViewportChange: (v: { x: number; y: number; zoom: number }) => void
    onDragStart?: () => void
    onDragEnd?: () => void
    onUpdateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void
    onCreateDependency: (projectId: string, dep: Dependency) => void
    onVerticalScaleChange?: (scale: number) => void
}

export const TimelineContext = React.createContext<TimelineCallbacks | null>(null)

export const useTimelineContext = (): TimelineCallbacks => {
    const ctx = React.useContext(TimelineContext)
    if (!ctx) throw new Error('TimelineContext is not provided')
    return ctx
}
