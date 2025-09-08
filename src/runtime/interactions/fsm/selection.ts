import { store } from '@state/store'

export class SelectionFSM {
  private startSelection: string[]

  constructor(params?: { startSelection?: string[]; anchor?: { x: number; y: number } | null }) {
    const state = store.getState()
    this.startSelection = params?.startSelection || (state as any)?.ui?.selection || []
    // anchor retained for future region selection
  }

  commit(hitId: string | null, opts: { ctrl?: boolean; meta?: boolean; shift?: boolean; x: number; y: number }) {
    const toggle = !!(opts.ctrl || opts.meta || opts.shift)
    let ids: string[] = []
    if (!hitId) {
      ids = []
    } else if (!toggle) {
      ids = [hitId]
    } else {
      const exists = this.startSelection.includes(hitId)
      ids = exists ? this.startSelection.filter(id => id !== hitId) : [...this.startSelection, hitId]
    }
    const anchor = { x: opts.x, y: opts.y }
    return { ids, anchor }
  }
}



