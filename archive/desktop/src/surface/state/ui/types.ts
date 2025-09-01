import type { Staff } from '@cadence/core'
export interface UIState { activeProjectId: string | null; selection: string[]; viewport: ViewportState; staffs: Staff[] }
export interface ViewportState { x: number; y: number; zoom: number }

