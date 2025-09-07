export type TimelineConfig = {
  LEFT_MARGIN: number
  TOP_MARGIN: number
  DAY_WIDTH: number
  STAFF_SPACING: number
  STAFF_LINE_SPACING: number
  HEADER: number
  STAFF_GAP: number
}

export const TIMELINE_CONFIG: TimelineConfig = {
  LEFT_MARGIN: 0,
  TOP_MARGIN: 96,
  DAY_WIDTH: 80,
  STAFF_SPACING: 150,
  STAFF_LINE_SPACING: 22,
  HEADER: 56,
  STAFF_GAP: 24,
}

export const TIMELINE = {
  ...TIMELINE_CONFIG,
}

