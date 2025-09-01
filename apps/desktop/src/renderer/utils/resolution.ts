export function computeGraphicsResolution(): number { const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1; return Math.max(1, Math.min(3, Math.round(dpr))) }
export function computeTextResolution(scaleX: number = 1, oversample: number = 1): number { const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1; const desired = dpr * Math.max(1, scaleX) * Math.max(1, oversample); return Math.max(1, Math.min(4, desired)) }

