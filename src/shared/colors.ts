const cache = new Map<string, number>()

export function getCssVarColor(varName: string, fallback: number): number {
  try {
    if (cache.has(varName)) return cache.get(varName) as number
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    if (!v) return fallback
    if (v.startsWith('#')) {
      const hex = v.slice(1)
      const n = parseInt(hex, 16)
      if (!Number.isNaN(n)) { cache.set(varName, n); return n }
    }
    const m = v.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
    if (m) {
      const r = Math.max(0, Math.min(255, parseInt(m[1]!, 10)))
      const g = Math.max(0, Math.min(255, parseInt(m[2]!, 10)))
      const b = Math.max(0, Math.min(255, parseInt(m[3]!, 10)))
      const n = (r << 16) | (g << 8) | b
      cache.set(varName, n)
      return n
    }
  } catch {}
  return fallback
}

export function clearColorCache() {
  cache.clear()
}

