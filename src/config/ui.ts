// Centralized UI constants and magic numbers

export const UI_CONSTANTS = {
    // Sidebar dimensions
    SIDEBAR: {
        MIN_WIDTH: 180,
        MAX_WIDTH: 320,
        DEFAULT_WIDTH: 220,
        PADDING: 12,
    },

    // Header dimensions
    HEADER: {
        DEFAULT_HEIGHT: 56,
        PADDING: 8,
    },

    // Modal dimensions
    MODAL: {
        STAFF_MANAGER: {
            MIN_WIDTH: 360,
            MAX_WIDTH: 560,
            MIN_HEIGHT: 320,
            MAX_HEIGHT: 520,
            WIDTH_RATIO: 0.6,
            HEIGHT_RATIO: 0.6,
            BORDER_RADIUS: 12,
            PADDING: 16,
        },
        TASK_DETAILS: {
            WIDTH: 260,
            HEIGHT: 180,
            BORDER_RADIUS: 8,
            PADDING: 10,
            MARGIN: 10,
        },
        BACKDROP_ALPHA: 0.45,
    },

    // Button dimensions
    BUTTON: {
        HEIGHT: 22,
        SMALL_WIDTH: 24,
        SMALL_HEIGHT: 24,
        MEDIUM_HEIGHT: 22,
        BORDER_RADIUS: 6,
        PADDING: 8,
        TEXT_PADDING: 16,
    },

    // Input field dimensions
    INPUT: {
        HEIGHT: 24,
        HEIGHT_MEDIUM: 22,
        BORDER_RADIUS: 6,
        PADDING: 8,
    },

    // Spacing and layout
    SPACING: {
        SMALL: 6,
        MEDIUM: 8,
        LARGE: 12,
        EXTRA_LARGE: 16,
        HUGE: 32,
        ROW_HEIGHT: 28,
        ROW_SPACING: 32,
        SECTION_SPACING: 40,
    },

    // Staff-related constants
    STAFF: {
        MIN_LINES: 1,
        MAX_LINES: 10,
        DEFAULT_LINES: 5,
        LINE_SPACING: 12,
        TIME_SIGNATURE_WIDTH: 70,
    },

    // Task visualization
    TASK: {
        MIN_HEIGHT: 12,
        MAX_HEIGHT: 28,
        HEIGHT_RATIO: 0.8, // 80% of line spacing for note head
        MIN_WIDTH: 4,
        RESIZE_HANDLE_WIDTH: 10,
        CLICK_THRESHOLD: 5, // pixels for distinguishing click from drag
    },

    // Timeline and grid
    // Timeline constants now sourced from shared/timeline.ts; avoid duplicating here
    // CULLING_MARGIN maintained locally for UI heuristics only
    CULLING: {
        MARGIN: 200,
    },

    // Zoom and viewport
    ZOOM: {
        MIN: 0.1,
        MAX: 20,
        DEFAULT: 1,
        SCROLL_FACTOR: 0.001,
        HEADER_ZOOM_FACTOR: 1.01,
    },

    // Visual effects
    EFFECTS: {
        GLOW_RADIUS_LARGE: 512,
        GLOW_RADIUS_SMALL: 256,
        STREAK_WIDTH: 512,
        STREAK_HEIGHT: 64,
        BLOOM_ALPHA_LARGE: 0.35,
        BLOOM_ALPHA_SMALL: 0.6,
        STREAK_ALPHA: 0.4,
        LAG_FACTOR: 0.08, // Easing factor for sheen lag
    },

    // Animation and transitions
    ANIMATION: {
        PULSE_SPEED: 4,
        PULSE_SCALE: 0.1,
        PREVIEW_GLOW_RINGS: 3,
        RIPPLE_STEPS: 5,
        FLASH_DURATION: 300,
        RIPPLE_DURATION: 1000,
    },

    // Colors (hex values for PixiJS)
    COLORS: {
        PRIMARY: 0x7c3aed,
        PRIMARY_GLOW: 0xC084FC,
        ACCENT: 0xFACC15,
        SUCCESS: 0x22c55e,
        WARNING: 0xf59e0b,
        ERROR: 0xef4444,
        BACKGROUND_DARK: 0x292524,
        SIDEBAR_BG: 0x0a0f17,
        SIDEBAR_BG_ACCENT: 0x0b1220,
        PANEL_BG: 0x0f172a,
        INPUT_BG: 0x111827,
        BUTTON_BG: 0x1f2937,
        BUTTON_PRIMARY: 0x2563eb,
        BUTTON_DANGER: 0x7f1d1d,
        TEXT_PRIMARY: 0xffffff,
        TEXT_MUTED: 0x94a3b8,
        TEXT_LABEL: 0xbcc3d6,
        BORDER_WEAK: 0xffffff, // with alpha
        BORDER_STRONG: 0xffffff, // with alpha
    },

    // Alpha values for transparency effects
    ALPHA: {
        BACKDROP: 0.45,
        PANEL: 0.98,
        SIDEBAR: 0.96,
        HEADER: 0.92,
        BUTTON: 0.95,
        BORDER_WEAK: 0.08,
        BORDER_MEDIUM: 0.12,
        BORDER_STRONG: 0.18,
        GLOW_RINGS: [0.08, 0.16, 0.24], // For multiple glow rings
    },

    // Typography
    FONT: {
        FAMILY_SYSTEM: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        FAMILY_APPLE: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        FAMILY_SERIF: 'serif',
        SIZE_SMALL: 10,
        SIZE_MEDIUM: 11,
        SIZE_DEFAULT: 12,
        SIZE_LARGE: 13,
        SIZE_HEADER: 14,
        SIZE_GLYPH: 16,
        WEIGHT_NORMAL: 'normal',
        WEIGHT_BOLD: 'bold',
    },

    // Hit testing and interaction
    INTERACTION: {
        DOUBLE_CLICK_TIME: 300,
        DRAG_START_THRESHOLD: 5,
        HOVER_DELAY: 100,
        TOOLTIP_OFFSET: 16,
        TOOLTIP_MIN_WIDTH: 160,
        TOOLTIP_PADDING: 8,
    },

    // Performance thresholds
    PERFORMANCE: {
        SLOW_RENDER_THRESHOLD: 16, // milliseconds (one frame at 60fps)
        MAX_PARTICLES: 50,
        MAX_CACHED_TASKS: 100,
        MAX_LOG_ENTRIES: 100,
        ANIMATION_FRAME_BUDGET: 8, // milliseconds per frame for animations
    },

    // Grid and staff constants
    GRID: {
        MEASURE_PAIR_SPACING: 4,
        THICK_BAR_WIDTH: 3,
        THIN_BAR_WIDTH: 1,
        OFFSET_DAYS: 0,
        MAX_ATTEMPTS: 64, // For finding available days
    },

    // Viewport and culling
    VIEWPORT: {
        CULLING_MARGIN: 200,
        FIT_CONTENT_PADDING: 50,
        SNAP_THRESHOLD: 0.1,
        ZOOM_ANIMATION_DURATION: 500,
        PAN_ANIMATION_DURATION: 300,
    },

    // Mathematical constants
    MATH: {
        EPSILON: 1e-6,
        PI_OVER_2: Math.PI / 2,
        TWO_PI: Math.PI * 2,
        DEGREES_TO_RADIANS: Math.PI / 180,
    },

    // Layout grid system
    LAYOUT_GRID: {
        COLUMNS: 12,
        GUTTER: 16,
        MARGIN: 24,
        BREAKPOINTS: {
            SMALL: 640,
            MEDIUM: 768,
            LARGE: 1024,
            EXTRA_LARGE: 1280,
        },
    },

    // Z-index layers for proper stacking
    Z_INDEX: {
        BACKGROUND: 0,
        GRID: 10,
        TASKS: 20,
        DEPENDENCIES: 30,
        HOVER_EFFECTS: 40,
        TOOLTIP: 50,
        UI: 100,
        MODAL_BACKDROP: 200,
        MODAL: 210,
        DEBUG: 1000,
    },
} as const

// Utility functions for working with UI constants
export const UIUtils = {
    // Clamp a value between min and max
    clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),

    // Get responsive modal size
    getModalSize: (screenW: number, screenH: number, type: 'staffManager' | 'taskDetails') => {
        if (type === 'staffManager') {
            const config = UI_CONSTANTS.MODAL.STAFF_MANAGER
            return {
                width: UIUtils.clamp(Math.round(screenW * config.WIDTH_RATIO), config.MIN_WIDTH, config.MAX_WIDTH),
                height: UIUtils.clamp(Math.round(screenH * config.HEIGHT_RATIO), config.MIN_HEIGHT, config.MAX_HEIGHT)
            }
        } else {
            const config = UI_CONSTANTS.MODAL.TASK_DETAILS
            return {
                width: config.WIDTH,
                height: config.HEIGHT
            }
        }
    },

    // Get sidebar width clamped to valid range
    clampSidebarWidth: (width: number) => {
        return UIUtils.clamp(Math.round(width), UI_CONSTANTS.SIDEBAR.MIN_WIDTH, UI_CONSTANTS.SIDEBAR.MAX_WIDTH)
    },

    // Get task note height based on line spacing
    calculateNoteHeight: (lineSpacing: number) => {
        const raw = Math.round(lineSpacing * UI_CONSTANTS.TASK.HEIGHT_RATIO)
        return UIUtils.clamp(raw, UI_CONSTANTS.TASK.MIN_HEIGHT, UI_CONSTANTS.TASK.MAX_HEIGHT)
    },

    // Get staff lines clamped to valid range
    clampStaffLines: (lines: number) => {
        return UIUtils.clamp(lines, UI_CONSTANTS.STAFF.MIN_LINES, UI_CONSTANTS.STAFF.MAX_LINES)
    },

    // Check if movement should be treated as a click
    isClick: (deltaX: number, deltaY: number) => {
        const distance = Math.hypot(deltaX, deltaY)
        return distance < UI_CONSTANTS.INTERACTION.DRAG_START_THRESHOLD
    },

    // Get color with alpha
    colorWithAlpha: (color: number, alpha: number) => {
        return { color, alpha: UIUtils.clamp(alpha, 0, 1) }
    },

    // Convert hex color to RGB components
    hexToRgb: (hex: number) => {
        const r = (hex >> 16) & 0xFF
        const g = (hex >> 8) & 0xFF
        const b = hex & 0xFF
        return { r, g, b }
    },

    // Create RGB color from components
    rgbToHex: (r: number, g: number, b: number) => {
        return (UIUtils.clamp(r, 0, 255) << 16) | (UIUtils.clamp(g, 0, 255) << 8) | UIUtils.clamp(b, 0, 255)
    },

    // Get responsive font size based on element size
    getResponsiveFontSize: (elementHeight: number, baseSize: number = UI_CONSTANTS.FONT.SIZE_DEFAULT) => {
        const scale = UIUtils.clamp(elementHeight / 24, 0.8, 1.5) // Scale relative to 24px baseline
        return Math.max(UI_CONSTANTS.FONT.SIZE_SMALL, Math.round(baseSize * scale))
    },

    // Interpolate between two values
    lerp: (a: number, b: number, t: number) => {
        return a + (b - a) * UIUtils.clamp(t, 0, 1)
    },

    // Easing functions
    easeOutCubic: (t: number) => {
        const clamped = UIUtils.clamp(t, 0, 1)
        return 1 - Math.pow(1 - clamped, 3)
    },

    easeInOutCubic: (t: number) => {
        const clamped = UIUtils.clamp(t, 0, 1)
        return clamped < 0.5
            ? 4 * clamped * clamped * clamped
            : 1 - Math.pow(-2 * clamped + 2, 3) / 2
    },
} as const

// Export individual constant groups for convenience
export const SIDEBAR = UI_CONSTANTS.SIDEBAR
export const MODAL = UI_CONSTANTS.MODAL
export const BUTTON = UI_CONSTANTS.BUTTON
export const TASK = UI_CONSTANTS.TASK
export const SPACING = UI_CONSTANTS.SPACING
export const COLORS = UI_CONSTANTS.COLORS
export const ALPHA = UI_CONSTANTS.ALPHA
export const FONT = UI_CONSTANTS.FONT
export const HEADER = UI_CONSTANTS.HEADER
export const INPUT = UI_CONSTANTS.INPUT
export const STAFF = UI_CONSTANTS.STAFF
