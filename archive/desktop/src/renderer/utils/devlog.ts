function isDevEnv(): boolean {
  try { const meta: any = (import.meta as any); if (meta && meta.env && typeof meta.env.DEV === 'boolean') return !!meta.env.DEV } catch {}
  try { const g: any = (typeof globalThis !== 'undefined' ? globalThis : {}); const env: any = g && g.process && g.process.env ? g.process.env : undefined; return env ? env.NODE_ENV !== 'production' : false } catch { return false }
}
const DEV = isDevEnv()
export const devLog = { info: (...args: any[]) => { if (DEV) { try { console.info('[renderer]', ...args) } catch {} } }, warn: (...args: any[]) => { if (DEV) { try { console.warn('[renderer]', ...args) } catch {} } }, error: (...args: any[]) => { if (DEV) { try { console.error('[renderer]', ...args) } catch {} } } }
export function safeCall(label: string, fn: () => void): void { try { fn() } catch (err) { devLog.warn(label, err) } }

