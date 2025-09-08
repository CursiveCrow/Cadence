import { store, RootState } from '@state/store'
import type { Task } from '@types'
import { createDependencyBetweenTasks } from '@domain/services/tasks'

export class DependencyLinkFSM {
  private srcTaskId: string
  private renderer: any
  private sourceRect: { x: number; y: number; w: number; h: number }

  constructor(params: { srcTaskId: string; renderer: any; sourceRect: { x: number; y: number; w: number; h: number } }) {
    this.srcTaskId = params.srcTaskId
    this.renderer = params.renderer
    this.sourceRect = params.sourceRect
  }

  update(x: number, y: number) {
    this.renderer.drawDependencyPreview(this.sourceRect, { x, y })
  }

  commit(targetTaskId: string | null) {
    this.renderer.clearDependencyPreview()
    if (!targetTaskId || targetTaskId === this.srcTaskId) return
    const s = store.getState() as RootState
    const srcTask = (s.tasks.list as Task[]).find(tt => tt.id === this.srcTaskId)
    const dstTask = (s.tasks.list as Task[]).find(tt => tt.id === targetTaskId)
    if (!srcTask || !dstTask) return
    createDependencyBetweenTasks(srcTask, dstTask)
  }
}







