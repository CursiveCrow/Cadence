export type Rect = { x: number; y: number; w: number; h: number }

export function rectContains(r: Rect, px: number, py: number): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h
}

export function firstHit(rects: Record<string, Rect>, px: number, py: number): string | null {
  for (const [k, r] of Object.entries(rects)) {
    if (rectContains(r, px, py)) return k
  }
  return null
}

