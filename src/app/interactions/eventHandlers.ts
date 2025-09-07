import { store, RootState } from '../../state/store'
import { TIMELINE, pixelsPerDay, applyAnchorZoom, screenXToWorldDays, dayIndexFromISO, computeScaledTimeline, staffCenterY } from '../../renderer/utils'
import { PROJECT_START_DATE } from '../../config'
import { setViewport, setSelection, setSelectionWithAnchor } from '../../state/ui'
import { addTask, updateTask } from '../../state/tasks'
import { errorLogger, ErrorSeverity } from '../../renderer/core/ErrorBoundary'
import {
  getMinAllowedStartDayForTask,
  findStaffBlockAtY,
  findAvailableDay,
  createNewTask,
  moveTask,
  resizeTask,
  createDependencyBetweenTasks,
  createLinkDependency,
  shouldTreatAsClick,
  calculateTaskDurationFromResize,
  calculateTaskPositionFromMove
} from './taskOperations'
import type { Staff, Task } from '../../types'

// Types for event handler context  
interface EventHandlerContext {
  renderer: any  // Using any for now to match existing Renderer class
  canvas: HTMLCanvasElement
  viewportRef: { current: { x: number; y: number; zoom: number } }
}

interface TaskOperation {
  mode: 'none' | 'move' | 'resize' | 'dep'
  taskId?: string
  clickOffsetX?: number
  initialDuration?: number
  sourceRect?: { x: number; y: number; w: number; h: number }
  startX?: number
  startY?: number
}

interface DragState {
  startX: number
  startY: number
  startV: { x: number; y: number; zoom: number }
}

interface HeaderZoomState {
  startX: number
  startZoom: number
  anchorLocalX: number
}


// Event handler factory
export function createEventHandlers(context: EventHandlerContext) {
  const { renderer, canvas, viewportRef } = context

  // State for drag operations
  let drag: DragState | null = null
  let headerZoom: HeaderZoomState | null = null
  const taskOpRef: TaskOperation = { mode: 'none' }

  // Helper functions
  const pxPerDayLocal = (z: number) => pixelsPerDay(z, TIMELINE.DAY_WIDTH)

  function onPointerDown(e: PointerEvent) {
    canvas.setPointerCapture(e.pointerId)
    const rect = canvas.getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    const headerH = (renderer as any).getHeaderHeight?.() || 0

    // Middle button drag on header for zoom scrub
    if (e.button === 1 && localY <= headerH) {
      headerZoom = { startX: localX, startZoom: viewportRef.current.zoom, anchorLocalX: localX }
      return
    }

    // UI hit testing (buttons, modals)
    const uiHit = (renderer as any).hitTestUI?.(localX, localY) || null
    if (uiHit) {
      if (uiHit === 'btn:addNote') {
        const s = store.getState() as RootState
        const newTask = createNewTask(s.staffs.list)
        store.dispatch(addTask(newTask))
        return
      }
      if (uiHit === 'btn:manage') {
        (renderer as any).openStaffManager?.()
        return
      }
      if (uiHit === 'btn:link') {
        const s = store.getState() as RootState
        createLinkDependency(s.ui.selection)
        return
      }
      // Staff manager or task details actions handled inside renderer via hidden input
      if ((uiHit as string).startsWith('sm:') || (uiHit as string).startsWith('td:')) {
        (renderer as any).setActions?.({
          addStaff: (payload: Staff) => store.dispatch({ type: 'staffs/addStaff', payload }),
          updateStaff: (payload: { id: string; updates: Partial<Staff> }) => store.dispatch({ type: 'staffs/updateStaff', payload }),
          deleteStaff: (id: string) => store.dispatch({ type: 'staffs/deleteStaff', payload: id }),
          reorderStaffs: (payload: { staffId: string; newPosition: number }) => store.dispatch({ type: 'staffs/reorderStaffs', payload }),
          updateTask: (payload: { id: string; updates: Partial<Task> }) => store.dispatch(updateTask(payload)),
        })
          ; (renderer as any).handleUIAction?.(uiHit)
        return
      }
    }

    // Default to panning or task interaction
    const sidebarW = (renderer as any).getSidebarWidth?.() || 0
    if (localY > headerH && localX > sidebarW) {
      const hit = renderer.hitTest(localX, localY)
      if (e.button === 2) {
        if (hit) { taskOpRef.mode = 'dep'; taskOpRef.taskId = hit; taskOpRef.sourceRect = renderer.getTaskRect(hit) || undefined }
        e.preventDefault(); return
      }
      if (e.button === 0 && hit) {
        const rectTask = renderer.getTaskRect(hit)
        if (rectTask && localX >= rectTask.x + rectTask.w - 10) {
          const s = store.getState() as RootState
          const t = (s.tasks.list).find((tt) => tt.id === hit)
          taskOpRef.mode = 'resize'; taskOpRef.taskId = hit; taskOpRef.initialDuration = Math.max(1, t?.durationDays || 1); taskOpRef.startX = localX; taskOpRef.startY = localY
        } else {
          taskOpRef.mode = 'move'; taskOpRef.taskId = hit; taskOpRef.clickOffsetX = rectTask ? (localX - rectTask.x) : 0; taskOpRef.startX = localX; taskOpRef.startY = localY
        }
        return
      }
    }
    // Start panning
    drag = { startX: e.clientX, startY: e.clientY, startV: { ...viewportRef.current } }
  }

  function onPointerMove(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    renderer.setHover(localX, localY)

    // Header zoom scrub
    if (headerZoom) {
      const dx = localX - headerZoom.startX
      const factor = Math.pow(1.01, dx)
      const nextZoom = Math.max(0.1, Math.min(20, Math.round((headerZoom.startZoom * factor) * 100) / 100))
      const next = applyAnchorZoom(viewportRef.current, nextZoom, headerZoom.anchorLocalX, TIMELINE.LEFT_MARGIN, TIMELINE.DAY_WIDTH)
      store.dispatch(setViewport(next))
      return
    }

    // Task operations
    if (taskOpRef.mode === 'dep') {
      if (taskOpRef.sourceRect) renderer.drawDependencyPreview(taskOpRef.sourceRect, { x: localX, y: localY })
      return
    }
    if (taskOpRef.mode === 'resize') {
      const s = store.getState() as RootState
      const t = (s.tasks.list).find((tt) => tt.id === taskOpRef.taskId)
      if (!t) return
      const ppd = pxPerDayLocal(viewportRef.current.zoom)
      const newDur = calculateTaskDurationFromResize(
        t.startDate, localX, viewportRef.current,
        TIMELINE.LEFT_MARGIN, TIMELINE.DAY_WIDTH, screenXToWorldDays
      )
      const dayIndex = Math.max(0, dayIndexFromISO(t.startDate, PROJECT_START_DATE))
      const xStartPx = TIMELINE.LEFT_MARGIN + (dayIndex - viewportRef.current.x) * ppd
      const metrics = renderer.getMetrics()
      const rectTask = renderer.getTaskRect(t.id)
      const hpx = Math.max(18, Math.min(28, Math.floor(((metrics.staffBlocks[0]?.lineSpacing || 18) / 2) * 1.8)))
      renderer.drawDragPreview(xStartPx, (rectTask?.y || 0), newDur * ppd, hpx)
      return
    }
    if (taskOpRef.mode === 'move') {
      const s = store.getState() as RootState
      const t = (s.tasks.list).find((tt) => tt.id === taskOpRef.taskId)
      if (!t) return
      const ppd = pxPerDayLocal(viewportRef.current.zoom)
      const metrics = renderer.getMetrics()
      const scaled = computeScaledTimeline((store.getState() as RootState).ui.verticalScale)

      const position = calculateTaskPositionFromMove(
        localX, localY, taskOpRef.clickOffsetX || 0,
        viewportRef.current, TIMELINE.LEFT_MARGIN, TIMELINE.DAY_WIDTH,
        metrics.staffBlocks, scaled.lineSpacing, screenXToWorldDays
      )

      const minIdx = getMinAllowedStartDayForTask(t.id, s)
      const clampedDay = Math.max(position.dayIndex, minIdx)
      const sb = findStaffBlockAtY(metrics.staffBlocks as any, localY)
      const lineStep = scaled.lineSpacing / 2
      const hpx = Math.max(18, Math.min(28, Math.floor(lineStep * 1.8)))
      const allowedDay = findAvailableDay((sb as any)?.id || t.staffId, clampedDay, t.id)
      const xStartPx = TIMELINE.LEFT_MARGIN + (allowedDay - viewportRef.current.x) * ppd
      const yTop = staffCenterY((sb?.yTop || 0), position.staffLine, scaled.lineSpacing) - hpx / 2
      const wpx = Math.max(ppd * (t.durationDays || 1), 4)
      renderer.drawDragPreview(xStartPx, yTop, wpx, hpx)
      return
    }
    if (!drag) {
      requestAnimationFrame(() => {
        try {
          renderer.render()
        } catch (error) {
          errorLogger.log(
            'EventHandlers',
            'onPointerMove',
            ErrorSeverity.WARNING,
            'Render failed during pointer move',
            error instanceof Error ? error : undefined
          )
        }
      });
      return
    }
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    const ppd = pixelsPerDay(drag.startV.zoom, TIMELINE.DAY_WIDTH)
    const rawX = (drag.startV.x - dx / ppd)
    const newX = Math.max(0, Math.round(rawX * ppd) / ppd)
    const newY = Math.max(0, (drag.startV.y - dy))
    store.dispatch(setViewport({ x: newX, y: newY, zoom: drag.startV.zoom }))
  }

  function onPointerUp(e: PointerEvent) {
    canvas.releasePointerCapture(e.pointerId)
    const rect = canvas.getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top

    // End header zoom if active
    if (headerZoom) { headerZoom = null; return }

    // Commit task ops
    if (taskOpRef.mode === 'dep' && taskOpRef.taskId) {
      const hit = renderer.hitTest(localX, localY)
      renderer.clearDependencyPreview()
      if (hit && hit !== taskOpRef.taskId) {
        const s = store.getState() as RootState
        const srcTask = (s.tasks.list).find((tt) => tt.id === taskOpRef.taskId)
        const dstTask = (s.tasks.list).find((tt) => tt.id === hit)
        if (srcTask && dstTask) {
          createDependencyBetweenTasks(srcTask, dstTask)
        }
      }
      taskOpRef.mode = 'none'
      return
    }
    if (taskOpRef.mode === 'resize' && taskOpRef.taskId) {
      const s = store.getState() as RootState
      const t = (s.tasks.list).find((tt) => tt.id === taskOpRef.taskId)
      if (t) {
        const newDur = calculateTaskDurationFromResize(
          t.startDate, localX, viewportRef.current,
          TIMELINE.LEFT_MARGIN, TIMELINE.DAY_WIDTH, screenXToWorldDays
        )
        resizeTask(t.id, newDur)
      }
      renderer.clearPreview(); taskOpRef.mode = 'none'; return
    }
    if (taskOpRef.mode === 'move' && taskOpRef.taskId) {
      const s = store.getState() as RootState
      const t = (s.tasks.list).find((tt) => tt.id === taskOpRef.taskId)
      if (t) {
        const wasMoved = !shouldTreatAsClick(taskOpRef.startX || localX, taskOpRef.startY || localY, localX, localY)
        if (!wasMoved) {
          // Handle selection toggle for click-like interactions
          const selection = s.ui.selection
          if ((e as any).ctrlKey || (e as any).metaKey || (e as any).shiftKey) {
            const exists = selection.includes(t.id)
            const next = exists ? selection.filter((id) => id !== t.id) : selection.concat(t.id)
            store.dispatch(setSelectionWithAnchor({ ids: next, anchor: { x: localX, y: localY } }))
          } else {
            store.dispatch(setSelectionWithAnchor({ ids: [t.id], anchor: { x: localX, y: localY } }))
          }
          renderer.clearPreview(); taskOpRef.mode = 'none'; return
        }

        // Actually move the task
        const metrics = renderer.getMetrics()
        const scaled = computeScaledTimeline(s.ui.verticalScale)
        const position = calculateTaskPositionFromMove(
          localX, localY, taskOpRef.clickOffsetX || 0,
          viewportRef.current, TIMELINE.LEFT_MARGIN, TIMELINE.DAY_WIDTH,
          metrics.staffBlocks, scaled.lineSpacing, screenXToWorldDays
        )

        const minIdx = getMinAllowedStartDayForTask(t.id, s)
        const clampedDay = Math.max(position.dayIndex, minIdx)

        moveTask(t.id, position.staffId, position.staffLine, clampedDay)
      }
      renderer.clearPreview(); taskOpRef.mode = 'none'; return
    }

    // No task op: interpret as selection if minimal movement
    if (drag) {
      const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY)
      if (moved < 5) {
        const hit = renderer.hitTest(localX, localY)
        if (hit) store.dispatch(setSelectionWithAnchor({ ids: [hit], anchor: { x: localX, y: localY } }))
        else store.dispatch(setSelection([]))
      }
    }
    drag = null
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const vp = viewportRef.current
    if (e.ctrlKey || e.metaKey) {
      const factor = Math.exp(-e.deltaY * 0.001)
      const z1 = Math.max(0.1, Math.min(20, (vp.zoom || 1) * factor))
      const rect = canvas.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const next = applyAnchorZoom(vp, z1, localX, TIMELINE.LEFT_MARGIN, TIMELINE.DAY_WIDTH)
      store.dispatch(setViewport(next))
    } else {
      const ppd = pixelsPerDay(vp.zoom, TIMELINE.DAY_WIDTH)
      const rawX = (vp.x + e.deltaX / ppd)
      const newX = Math.max(0, Math.round(rawX * ppd) / ppd)
      const newY = Math.max(0, (vp.y + e.deltaY))
      store.dispatch(setViewport({ x: newX, y: newY, zoom: vp.zoom }))
    }
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    cleanup: () => {
      // Reset state on cleanup
      drag = null
      headerZoom = null
      taskOpRef.mode = 'none'
    }
  }
}
