export const PROJECT_START_DATE = new Date('2024-01-01')

export const FLAGS = {
  enableWebGPU: true,
  enablePersistence: true,
  debugRenderer: false,
} as const

export type FeatureFlags = typeof FLAGS

