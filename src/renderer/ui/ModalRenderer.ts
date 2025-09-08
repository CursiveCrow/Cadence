import { Container } from 'pixi.js'
import { firstHit } from '@shared/geom'
import type { Staff, Task } from '@types'
import { STAFF } from '@config/ui'
import { StaffManagerModal } from './modals/StaffManagerModal'
import { TaskDetailsModal } from './modals/TaskDetailsModal'

export class ModalRenderer {
  private uiRects: Record<string, { x: number; y: number; w: number; h: number }> = {}
  private tempStaffName: string = ''
  private tempStaffLines: number = 5
  private staffModal = new StaffManagerModal()
  private taskDetailsModal = new TaskDetailsModal()

  renderStaffManager(ui: Container, screenW: number, screenH: number, staffs: Staff[]) {
    this.staffModal.render(ui, screenW, screenH, staffs, {
      setRect: (k, r) => { this.uiRects[k] = r },
      getTempStaffName: () => this.tempStaffName,
      setTempStaffName: (n: string) => { this.tempStaffName = n },
      getTempStaffLines: () => this.tempStaffLines,
      setTempStaffLines: (n: number) => { this.tempStaffLines = Math.max(1, Math.min(10, n)) },
    })
  }

  renderTaskDetails(
    ui: Container,
    screenW: number,
    screenH: number,
    task: Task,
    taskLayout: { x: number; y: number; w: number; h: number },
    staffs: Staff[]
  ) {
    this.taskDetailsModal.render(ui, screenW, screenH, task, taskLayout, staffs, {
      setRect: (k, r) => { this.uiRects[k] = r }
    })
  }

  // Accessors for UI state
  getTempStaffName(): string { return this.tempStaffName }
  setTempStaffName(name: string) { this.tempStaffName = name }
  getTempStaffLines(): number { return this.tempStaffLines }
  setTempStaffLines(lines: number) { this.tempStaffLines = Math.max(STAFF.MIN_LINES, Math.min(STAFF.MAX_LINES, lines)) }

  // UI hit testing
  hitTestUI(px: number, py: number): string | null { return firstHit(this.uiRects, px, py) }

  resetRects() { this.uiRects = {} }
  getUIRects() { return this.uiRects }
}
