import { store, RootState } from '@state/store'
import { TIMELINE, pixelsPerDay, screenXToWorldDays, computeScaledTimeline, staffCenterY } from '@renderer/timeline'
import { findAvailableDay, getMinAllowedStartDayForTask, calculateTaskPositionFromMove, moveTask } from '@domain/services/tasks'

export class MoveTaskFSM {
  private taskId: string
  private clickOffsetX: number
  private renderer: any
  private viewportRef: { current: { x: number; y: number; zoom: number } }
  private getLeftMargin: () => number

  constructor(params: {
    taskId: string
    clickOffsetX: number
    renderer: any
    viewportRef: { current: { x: number; y: number; zoom: number } }
    getLeftMargin: () => number
  }) {
    this.taskId = params.taskId
    this.clickOffsetX = params.clickOffsetX
    this.renderer = params.renderer
    this.viewportRef = params.viewportRef
    this.getLeftMargin = params.getLeftMargin
  }

  update(localX: number, localY: number) {
    const s = store.getState() as RootState
    const t = (s.tasks.list).find(tt => tt.id === this.taskId)
    if (!t) return

    const metrics = this.renderer.getMetrics()
    const scaled = computeScaledTimeline(s.ui.verticalScale)
    const leftMargin = this.getLeftMargin() || 0

    const position = calculateTaskPositionFromMove(
      localX, localY, this.clickOffsetX || 0,
      this.viewportRef.current, leftMargin, TIMELINE.DAY_WIDTH,
      metrics.staffBlocks, scaled.lineSpacing, screenXToWorldDays
    )

    const minIdx = getMinAllowedStartDayForTask(this.taskId, s)
    const clampedDay = Math.max(position.dayIndex, minIdx)
    const wy = this.viewportRef.current.y + localY
    const sb = metrics.staffBlocks.find((b: any) => wy >= b.yTop && wy <= b.yBottom)
    const lineStep = scaled.lineSpacing / 2
    const hpx = Math.max(18, Math.min(28, Math.floor(lineStep * 1.8)))
    const allowedDay = findAvailableDay((sb as any)?.id || t.staffId, clampedDay, t.id)
    const ppd = pixelsPerDay(this.viewportRef.current.zoom, TIMELINE.DAY_WIDTH)
    const xStartPx = leftMargin + (allowedDay - this.viewportRef.current.x) * ppd
    const yTop = staffCenterY((sb?.yTop || 0), position.staffLine, scaled.lineSpacing) - hpx / 2
    const wpx = Math.max(ppd * (t.durationDays || 1), 4)
    this.renderer.drawDragPreview(xStartPx, yTop, wpx, hpx)
  }

  commit(localX: number, localY: number) {
    const s = store.getState() as RootState
    const t = (s.tasks.list).find(tt => tt.id === this.taskId)
    if (!t) return

    const metrics = this.renderer.getMetrics()
    const scaled = computeScaledTimeline(s.ui.verticalScale)
    const leftMargin = this.getLeftMargin() || 0
    const position = calculateTaskPositionFromMove(
      localX, localY, this.clickOffsetX || 0,
      this.viewportRef.current, leftMargin, TIMELINE.DAY_WIDTH,
      metrics.staffBlocks, scaled.lineSpacing, screenXToWorldDays
    )

    const minIdx = getMinAllowedStartDayForTask(this.taskId, s)
    const clampedDay = Math.max(position.dayIndex, minIdx)
    const allowedDay = findAvailableDay(position.staffId || t.staffId, clampedDay, t.id)
    // Use existing moveTask operation to dispatch
    moveTask(this.taskId, position.staffId, position.staffLine, allowedDay)
  }
}


