/**
 * Shared timeline rendering configuration for PixiJS renderer
 */

import type { TimelineConfig } from './types/renderer'
import { cssVarColorToHex } from './utils/color'

export const TIMELINE_CONFIG: TimelineConfig = {
  LEFT_MARGIN: 0,
  TOP_MARGIN: 60,
  DAY_WIDTH: 60,
  STAFF_SPACING: 120,
  STAFF_LINE_SPACING: 18,
  TASK_HEIGHT: 20,
  STAFF_LINE_COUNT: 5,
  BACKGROUND_COLOR: 0x1a1a1a,
  GRID_COLOR_MAJOR: cssVarColorToHex('--ui-grid-major', 0xffffff),
  GRID_COLOR_MINOR: cssVarColorToHex('--ui-grid-minor', 0xffffff),
  STAFF_LINE_COLOR: cssVarColorToHex('--ui-staff-line', 0xd1d5db),
  TASK_COLORS: {
    default: 0x8b5cf6,
    not_started: 0x6366f1,
    in_progress: 0xc084fc,
    completed: 0x10b981,
    blocked: 0xef4444,
    cancelled: 0x6b7280,
  },
  DEPENDENCY_COLOR: 0x666666,
  SELECTION_COLOR: cssVarColorToHex('--ui-color-accent', 0xf59e0b),
  TODAY_COLOR: cssVarColorToHex('--ui-color-accent', 0xf59e0b),
  DRAW_STAFF_LABELS: false,
  NOTE_START_PADDING: 2,
  // Measures: default to 7-day bars; align to project start; double-bar visuals
  MEASURE_LENGTH_DAYS: 7,
  MEASURE_OFFSET_DAYS: 0,
  MEASURE_COLOR: cssVarColorToHex('--ui-color-border', 0xffffff),
  MEASURE_LINE_WIDTH_PX: 3,
  // Spacing between thick (on grid) and thin bar (to the left) in pixels; enforced even
  MEASURE_PAIR_SPACING_PX: 4,
}
