/**
 * Centralized Configuration Module
 * All application configuration values are centralized here
 */

// ============================================================================
// PROJECT CONFIGURATION
// ============================================================================

export const PROJECT_CONFIG = {
  START_DATE: new Date('2024-01-01'),
  DEFAULT_PROJECT_ID: 'demo-project',
} as const

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  enableWebGPU: true,
  enablePersistence: true,
  debugRenderer: false,
} as const

export type FeatureFlags = typeof FEATURE_FLAGS

// ============================================================================
// TIMELINE RENDERING CONFIGURATION
// ============================================================================

export const TIMELINE_CONFIG = {
  // Layout
  LEFT_MARGIN: 0,
  TOP_MARGIN: 60,
  DAY_WIDTH: 60,
  STAFF_SPACING: 120,
  STAFF_LINE_SPACING: 18,
  TASK_HEIGHT: 20,
  STAFF_LINE_COUNT: 5,

  // Derived widths (computed based on DAY_WIDTH)
  get HOUR_WIDTH() { return this.DAY_WIDTH / 24 },
  get WEEK_WIDTH() { return this.DAY_WIDTH * 7 },
  get MONTH_WIDTH() { return this.DAY_WIDTH * 30 },

  // Colors
  BACKGROUND_COLOR: 0x1a1a1a,
  GRID_COLOR_MAJOR: 'var(--ui-grid-major)',
  GRID_COLOR_MINOR: 'var(--ui-grid-minor)',
  STAFF_LINE_COLOR: 'var(--ui-staff-line)',
  TASK_COLORS: {
    default: 0x8b5cf6,
    not_started: 0x6366f1,
    in_progress: 0xc084fc,
    completed: 0x10b981,
    blocked: 0xef4444,
    cancelled: 0x6b7280,
  },
  DEPENDENCY_COLOR: 0x666666,
  SELECTION_COLOR: 'var(--ui-color-accent)',
  TODAY_COLOR: 'var(--ui-color-accent)',

  // Rendering options
  DRAW_STAFF_LABELS: false,
  NOTE_START_PADDING: 2,

  // Measure markers
  MEASURE_LENGTH_DAYS: 7,
  MEASURE_OFFSET_DAYS: 0,
  MEASURE_COLOR: 'var(--ui-color-border)',
  MEASURE_LINE_WIDTH_PX: 3,
  MEASURE_PAIR_SPACING_PX: 4,
} as const

// ============================================================================
// STATUS GLYPHS CONFIGURATION
// ============================================================================

export const STATUS_GLYPHS = {
  not_started: '',
  in_progress: '⟟_',
  completed: '⟟r',
  blocked: '⟟-',
  cancelled: 'A-',
} as const

// ============================================================================
// LAYOUT THRESHOLDS
// ============================================================================

export const LAYOUT_THRESHOLDS = {
  DAY_THRESHOLD: 0.75,
  HOUR_THRESHOLD: 2,
} as const

// ============================================================================
// PAN/ZOOM CONFIGURATION
// ============================================================================

export const PAN_ZOOM_CONFIG = {
  ZOOM_STEP_PER_NOTCH: 0.02,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 30,
  ZOOM_FACTOR_BASE: 1.01,
  VERTICAL_SCALE_MIN: 0.5,
  VERTICAL_SCALE_MAX: 3,
} as const

// ============================================================================
// UI COMPONENT CONFIGURATION
// ============================================================================

export const UI_CONFIG = {
  // Sidebar
  SIDEBAR: {
    MIN_WIDTH: 80,
    MAX_WIDTH: 260,
    DEFAULT_WIDTH: 120,
  },

  // Date Header
  DATE_HEADER: {
    BASE_HEIGHT: 32,
    BAND_HEIGHT: 24,
    MONTH_BAND_HEIGHT: 24,
    DAY_BAND_HEIGHT: 24,
  },

  // Task Popup
  TASK_POPUP: {
    WIDTH: 320,
    PADDING: 12,
    BORDER_RADIUS: 10,
    BOX_SHADOW: '0 10px 24px rgba(0,0,0,0.35)',
  },

  // Staff Manager
  STAFF_MANAGER: {
    MIN_STAFF_LINES: 1,
    MAX_STAFF_LINES: 11,
  },

  // Grid rendering
  GRID: {
    MINOR_LINE_WIDTH: 0.25,
    MAJOR_LINE_WIDTH: 1,
    WEEKEND_ALPHA: 0.2,
    BAND_ALPHA: 0.04,
  },

  // Tooltips
  TOOLTIPS: {
    TASK_POPUP_WIDTH: 280,
    STEM_WIDTH: 3,
    BACKGROUND_ALPHA: 0.9,
    STEM_BACKGROUND_ALPHA: 0.9,
  },
} as const

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const COLOR_PALETTE = {
  // Background colors
  SURFACE_1: '#1a1a1a',
  SURFACE_2: '#2a2a2a',

  // Text colors
  TEXT: '#ffffff',
  TEXT_MUTED: '#9ca3af',
  TEXT_ACCENT: '#f59e0b',

  // Border colors
  BORDER: '#374151',
  BORDER_LIGHT: '#4b5563',

  // Status colors (hex values for PixiJS)
  TASK_DEFAULT: 0x8b5cf6,
  TASK_NOT_STARTED: 0x6366f1,
  TASK_IN_PROGRESS: 0xc084fc,
  TASK_COMPLETED: 0x10b981,
  TASK_BLOCKED: 0xef4444,
  TASK_CANCELLED: 0x6b7280,

  // UI colors
  SELECTION: 0xf59e0b,
  DEPENDENCY: 0x666666,
  TODAY_MARKER: 0xf59e0b,
} as const

// ============================================================================
// CONSTANTS
// ============================================================================

export const CONSTANTS = {
  // Time calculations
  MS_PER_DAY: 24 * 60 * 60 * 1000,

  // Default task properties
  DEFAULT_TASK_HEIGHT: 20,

  // Rendering
  PIXEL_ALIGNMENT_EPSILON: 0.5,
  MIN_RENDERED_EXTENT: 10000,
  MAX_RENDERED_EXTENT: 50000,

  // Spatial hashing
  SPATIAL_HASH_CELL_SIZE: 200,

  // WebGPU
  MAX_PIXEL_RATIO: 2,
  MIN_PIXEL_RATIO: 1,

  // Grid parameters
  GRID_LABEL_DENSITY_DAY: 56,
  GRID_LABEL_DENSITY_WEEK: 40,
  GRID_LABEL_DENSITY_HOUR: 28,
} as const

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

export const PROJECT_START_DATE = PROJECT_CONFIG.START_DATE
export const FLAGS = FEATURE_FLAGS

// Export types
export type TimelineConfig = typeof TIMELINE_CONFIG
export type UIConfig = typeof UI_CONFIG
export type PanZoomConfig = typeof PAN_ZOOM_CONFIG
export type ColorPalette = typeof COLOR_PALETTE
export type LayoutThresholds = typeof LAYOUT_THRESHOLDS

