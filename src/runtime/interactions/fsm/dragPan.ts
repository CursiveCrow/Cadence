import type { ViewportState } from '@state/slices/uiSlice'
import { pixelsPerDay } from '@renderer/timeline'
import { TIMELINE } from '@shared/timeline'

export class DragPanFSM {
  private startV: ViewportState
  private startX: number
  private startY: number

  constructor(startV: ViewportState, startX: number, startY: number) {
    this.startV = { ...startV }
    this.startX = startX
    this.startY = startY
  }

  update(clientX: number, clientY: number): ViewportState {
    const dx = clientX - this.startX
    const dy = clientY - this.startY
    const ppd = pixelsPerDay(this.startV.zoom || 1, TIMELINE.DAY_WIDTH)
    const rawX = (this.startV.x - dx / ppd)
    const newX = Math.max(0, Math.round(rawX * ppd) / ppd)
    const newY = Math.max(0, (this.startV.y - dy))
    return { x: newX, y: newY, zoom: this.startV.zoom }
  }
}

