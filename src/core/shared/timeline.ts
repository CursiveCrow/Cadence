// Single source of truth for timeline geometry and defaults

export type TimelineConfig = {
  LEFT_MARGIN: number
  TOP_MARGIN: number
  DAY_WIDTH: number
  STAFF_SPACING: number
  STAFF_LINE_SPACING: number
  HEADER: number
  STAFF_GAP: number
}

// Note: LEFT_MARGIN is treated as a runtime value derived from UI.sidebarWidth.
// Keep default at 0; do not use directly in renderers - pass a dynamic value instead.
export const TIMELINE: TimelineConfig = {
  LEFT_MARGIN: 0,
  TOP_MARGIN: 96,
  DAY_WIDTH: 80,
  STAFF_SPACING: 150,
  STAFF_LINE_SPACING: 22,
  HEADER: 56,
  STAFF_GAP: 24,
}

