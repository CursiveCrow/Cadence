import type { Staff } from '@cadence/core'

export interface UIState {
    activeProjectId: string | null
    selection: string[] // Array of selected Task IDs
    viewport: ViewportState
    staffs: Staff[] // Musical staffs configuration
}

export interface ViewportState {
    x: number
    y: number
    zoom: number
}
