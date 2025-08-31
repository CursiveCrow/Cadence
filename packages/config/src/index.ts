export const PROJECT_START_DATE = new Date('2024-01-01')

export const FLAGS = {
  enableWebGPU: true,
  enablePersistence: true,
  debugRenderer: false,
} as const

export type FeatureFlags = typeof FLAGS

export function isDevEnvironment(): boolean {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.DEV) return true
  } catch { }
  try {
    const p: any = (typeof globalThis !== 'undefined') ? (globalThis as any).process : undefined
    if (p && p.env && p.env.NODE_ENV !== 'production') return true
  } catch { }
  return false
}