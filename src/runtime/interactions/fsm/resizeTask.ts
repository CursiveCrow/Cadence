import { store, RootState } from '@state/store'
import { TIMELINE, pixelsPerDay, screenXToWorldDays, dayIndexFromISO } from '@renderer/timeline'
import { PROJECT_START_DATE } from '@config'
import { calculateTaskDurationFromResize, resizeTask } from '@domain/services/tasks'

export class ResizeTaskFSM {
  private taskId: string
  private renderer: any
  private viewportRef: { current: { x: number; y: number; zoom: number } }
  private getLeftMargin: () => number

  constructor(params: {
    taskId: string
    renderer: any
    viewportRef: { current: { x: number; y: number; zoom: number } }
    getLeftMargin: () => number
  }) {
    this.taskId = params.taskId
    this.renderer = params.renderer
    this.viewportRef = params.viewportRef
    this.getLeftMargin = params.getLeftMargin
  }

  update(localX: number) {
    const s = store.getState() as RootState
    const t = (s.tasks.list).find(tt => tt.id === this.taskId)
    if (!t) return
    const ppd = pixelsPerDay(this.viewportRef.current.zoom, TIMELINE.DAY_WIDTH)
    const newDur = calculateTaskDurationFromResize(
      t.startDate, localX, this.viewportRef.current,
      this.getLeftMargin() || 0, TIMELINE.DAY_WIDTH, screenXToWorldDays
    )
    const dayIndex = Math.max(0, dayIndexFromISO(t.startDate, PROJECT_START_DATE))
    const xStartPx = (this.getLeftMargin() || 0) + (dayIndex - this.viewportRef.current.x) * ppd
    const metrics = this.renderer.getMetrics()
    const rectTask = this.renderer.getTaskRect(t.id)
    const hpx = Math.max(18, Math.min(28, Math.floor(((metrics.staffBlocks[0]?.lineSpacing || 18) / 2) * 1.8)))
    this.renderer.drawDragPreview(xStartPx, (rectTask?.y || 0), newDur * ppd, hpx)
  }

  commit(localX: number) {
    const s = store.getState() as RootState
    const t = (s.tasks.list).find(tt => tt.id === this.taskId)
    if (!t) return
    const newDur = calculateTaskDurationFromResize(
      t.startDate, localX, this.viewportRef.current,
      this.getLeftMargin() || 0, TIMELINE.DAY_WIDTH, screenXToWorldDays
    )
    resizeTask(this.taskId, newDur)
  }
}








