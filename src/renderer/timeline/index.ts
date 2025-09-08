export { TIMELINE } from '@shared/timeline'

// Scale/time resolution helpers
export { getTimeScaleForZoom, DAY_THRESHOLD, HOUR_THRESHOLD }
  from './scale'
export type { TimeScale } from './scale'

// Date header view model + height
export { computeDateHeaderHeight, computeDateHeaderViewModel } from './header'

// Timeline math helpers
export {
  clampZoom,
  pixelsPerDay,
  worldDaysToScreenX,
  screenXToWorldDays,
  applyAnchorZoom,
  dayIndexFromISO,
  isoFromDayIndex,
  computeScaledTimeline,
  staffCenterY,
  EPS,
  nearlyZero,
} from './math'

