/**
 * Shared timeline rendering configuration for PixiJS renderer
 */

import { TimelineConfig } from './scene'

export const TIMELINE_CONFIG: TimelineConfig = {
  LEFT_MARGIN: 80,
  TOP_MARGIN: 60,
  DAY_WIDTH: 60,
  STAFF_SPACING: 120,
  STAFF_LINE_SPACING: 18,
  TASK_HEIGHT: 20,
  STAFF_LINE_COUNT: 5,
  BACKGROUND_COLOR: 0x1a1a1a,
  GRID_COLOR_MAJOR: 0xffffff,
  GRID_COLOR_MINOR: 0xffffff,
  STAFF_LINE_COLOR: 0xffffff,
  TASK_COLORS: {
    default: 0x8B5CF6,
    pending: 0x8B5CF6,
    in_progress: 0xC084FC,
    inProgress: 0xC084FC,
    completed: 0x10B981,
    blocked: 0xEF4444,
    cancelled: 0x6B7280,
    not_started: 0x6366F1
  },
  DEPENDENCY_COLOR: 0x666666,
  SELECTION_COLOR: 0xF59E0B
}

// Mapping from task status to accidental symbol used in UI
export const STATUS_TO_ACCIDENTAL: Record<string, string> = {
  blocked: '♭',
  completed: '♮',
  in_progress: '♯',
  inprogress: '♯',
  cancelled: '𝄪',
}


