import { store } from '@state/store'
import { setSelection, setViewport } from '@state/slices/uiSlice'
import { applyAnchorZoom } from '@renderer/timeline'
import { TIMELINE } from '@shared/timeline'
import type { IRenderer } from '../types'

export type CommandId = 'zoom.in' | 'zoom.out' | 'zoom.reset' | 'selection.clear'

export function createCommandRegistry(canvas: HTMLCanvasElement, renderer: IRenderer) {
  const zoomAt = (factor: number) => {
    const vp = store.getState().ui.viewport
    const rect = canvas.getBoundingClientRect()
    const anchorLocalX = rect.width / 2
    const z1 = Math.max(0.1, Math.min(20, (vp.zoom || 1) * factor))
    const next = applyAnchorZoom(vp, z1, anchorLocalX, renderer.getSidebarWidth(), TIMELINE.DAY_WIDTH)
    store.dispatch(setViewport(next))
  }

  const commands: Record<CommandId, () => void> = {
    'zoom.in': () => zoomAt(1.1),
    'zoom.out': () => zoomAt(1 / 1.1),
    'zoom.reset': () => {
      const vp = store.getState().ui.viewport
      const rect = canvas.getBoundingClientRect()
      const anchorLocalX = rect.width / 2
      const next = applyAnchorZoom(vp, 1, anchorLocalX, renderer.getSidebarWidth(), TIMELINE.DAY_WIDTH)
      store.dispatch(setViewport(next))
    },
    'selection.clear': () => store.dispatch(setSelection([])),
  }

  return commands
}


