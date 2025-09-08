import type { IRenderer } from '@types'
import { createCommandRegistry } from '@runtime/commands'

export function setupKeyboardShortcuts(canvas: HTMLCanvasElement, renderer: IRenderer) {
  const commands = createCommandRegistry(canvas, renderer)
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return
    const ctrl = e.ctrlKey || e.metaKey
    if (ctrl && (e.key === '+' || e.key === '=')) { e.preventDefault(); commands['zoom.in'](); return }
    if (ctrl && e.key === '-') { e.preventDefault(); commands['zoom.out'](); return }
    if (ctrl && e.key === '0') { e.preventDefault(); commands['zoom.reset'](); return }
    if (e.key === 'Escape') { commands['selection.clear'](); return }
  }
  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}




