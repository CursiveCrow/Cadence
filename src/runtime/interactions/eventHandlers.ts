import { store, RootState } from '@state/store'
import { TIMELINE, pixelsPerDay, applyAnchorZoom } from '@renderer/timeline'
import { DragPanFSM } from '@runtime/interactions/fsm/dragPan'
import { MoveTaskFSM } from '@runtime/interactions/fsm/moveTask'
import { ResizeTaskFSM } from '@runtime/interactions/fsm/resizeTask'
import { DependencyLinkFSM } from '@runtime/interactions/fsm/linkDependency'
import { SelectionFSM } from '@runtime/interactions/fsm/selection'
import { setViewport, setSelection, setSelectionWithAnchor, setSidebarWidth } from '@state/slices/uiSlice'
import { addTask, updateTask } from '@state/slices/tasksSlice'
import { errorLogger, ErrorSeverity } from '@renderer/core/ErrorBoundary'
import { createNewTask, createLinkDependency, shouldTreatAsClick } from '@domain/services/tasks'
import type { Staff, Task, IRenderer } from '../../types'

// Types for event handler context  
interface EventHandlerContext {
  renderer: IRenderer
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
  let panFSM: import('./fsm/dragPan').DragPanFSM | null = null
  let headerZoom: HeaderZoomState | null = null
  let moveFSM: import('./fsm/moveTask').MoveTaskFSM | null = null
  let resizeFSM: import('./fsm/resizeTask').ResizeTaskFSM | null = null
  let depFSM: import('./fsm/linkDependency').DependencyLinkFSM | null = null
  const taskOpRef: TaskOperation = { mode: 'none' }
  let resizingSidebar: { startX: number; startWidth: number } | null = null

  // Helper functions
  // keep helper for potential future local math

  function onPointerDown(e: PointerEvent) {
    canvas.setPointerCapture(e.pointerId)
    const rect = canvas.getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top
    const headerH = renderer.getHeaderHeight?.() || 0

    // Middle button drag on header for zoom scrub
    if (e.button === 1 && localY <= headerH) {
      headerZoom = { startX: localX, startZoom: viewportRef.current.zoom, anchorLocalX: localX }
      return
    }

    // UI hit testing (buttons, modals)
    const uiHit = renderer.hitTestUI?.(localX, localY) || null
    if (uiHit) {
      if (uiHit === 'btn:addNote') {
        const s = store.getState() as RootState
        const newTask = createNewTask(s.staffs.list)
        store.dispatch(addTask(newTask))
        return
      }
      if (uiHit === 'btn:manage') {
        renderer.openStaffManager?.()
        return
      }
      if (uiHit === 'sb:resize') {
        const s = store.getState() as RootState
        resizingSidebar = { startX: e.clientX, startWidth: (s.ui as any).sidebarWidth || 220 }
        return
      }
      if (uiHit === 'btn:link') {
        const s = store.getState() as RootState
        createLinkDependency(s.ui.selection)
        return
      }
      // Staff manager or task details actions handled inside renderer via pre-bound actions
      if ((uiHit as string).startsWith('sm:') || (uiHit as string).startsWith('td:')) {
        renderer.setActions?.({
          addStaff: (payload: Staff) => store.dispatch({ type: 'staffs/addStaff', payload }),
          updateStaff: (payload: { id: string; updates: Partial<Staff> }) => store.dispatch({ type: 'staffs/updateStaff', payload }),
          deleteStaff: (id: string) => store.dispatch({ type: 'staffs/deleteStaff', payload: id }),
          reorderStaffs: (payload: { staffId: string; newPosition: number }) => store.dispatch({ type: 'staffs/reorderStaffs', payload }),
          updateTask: (payload: { id: string; updates: Partial<Task> }) => store.dispatch(updateTask(payload)),
        })
          ; renderer.handleUIAction?.(uiHit)
        return
      }
    }

    // Default to panning or task interaction
    const sidebarW = renderer.getSidebarWidth?.() || 0
    if (localY > headerH && localX > sidebarW) {
      const hit = renderer.hitTest(localX, localY)
      if (e.button === 2) {
        if (hit) {
          taskOpRef.mode = 'dep'; taskOpRef.taskId = hit; taskOpRef.sourceRect = renderer.getTaskRect(hit) || undefined
          depFSM = new DependencyLinkFSM({ srcTaskId: hit, renderer, sourceRect: taskOpRef.sourceRect! })
        }
        e.preventDefault(); return
      }
      if (e.button === 0 && hit) {
        const rectTask = renderer.getTaskRect(hit)
        if (rectTask && localX >= rectTask.x + rectTask.w - 10) {
          const s = store.getState() as RootState
          const t = (s.tasks.list).find((tt) => tt.id === hit)
          taskOpRef.mode = 'resize'; taskOpRef.taskId = hit; taskOpRef.initialDuration = Math.max(1, t?.durationDays || 1); taskOpRef.startX = localX; taskOpRef.startY = localY
          resizeFSM = new ResizeTaskFSM({ taskId: hit, renderer, viewportRef, getLeftMargin: () => renderer.getSidebarWidth?.() || 0 })
        } else {
          taskOpRef.mode = 'move'; taskOpRef.taskId = hit; taskOpRef.clickOffsetX = rectTask ? (localX - rectTask.x) : 0; taskOpRef.startX = localX; taskOpRef.startY = localY
          moveFSM = new MoveTaskFSM({ taskId: hit, clickOffsetX: taskOpRef.clickOffsetX || 0, renderer, viewportRef, getLeftMargin: () => renderer.getSidebarWidth?.() || 0 })
        }
        return
      }
    }
    // Start panning
    drag = { startX: e.clientX, startY: e.clientY, startV: { ...viewportRef.current } }
    panFSM = new DragPanFSM(drag.startV, drag.startX, drag.startY)
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
      const next = applyAnchorZoom(
        viewportRef.current,
        nextZoom,
        headerZoom.anchorLocalX,
        renderer.getSidebarWidth?.() || 0,
        TIMELINE.DAY_WIDTH
      )
      store.dispatch(setViewport(next))
      return
    }

    // Task operations
    if (resizingSidebar) {
      const s = store.getState() as RootState
      const dxGrip = e.clientX - resizingSidebar.startX
      const raw = resizingSidebar.startWidth + dxGrip
      const clamped = Math.max(180, Math.min(320, Math.round(raw)))
      if (clamped !== s.ui.sidebarWidth) store.dispatch(setSidebarWidth(clamped))
      return
    }
    if (taskOpRef.mode === 'dep') {
      if (depFSM) depFSM.update(localX, localY)
      return
    }
    if (taskOpRef.mode === 'resize') {
      if (resizeFSM) resizeFSM.update(localX)
      return
    }
    if (taskOpRef.mode === 'move') {
      if (moveFSM) moveFSM.update(localX, localY)
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
    if (panFSM) {
      const next = panFSM.update(e.clientX, e.clientY)
      store.dispatch(setViewport(next))
    } else {
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      const ppd = pixelsPerDay(drag.startV.zoom, TIMELINE.DAY_WIDTH)
      const rawX = (drag.startV.x - dx / ppd)
      const newX = Math.max(0, Math.round(rawX * ppd) / ppd)
      const newY = Math.max(0, (drag.startV.y - dy))
      store.dispatch(setViewport({ x: newX, y: newY, zoom: drag.startV.zoom }))
    }
  }

  function onPointerUp(e: PointerEvent) {
    canvas.releasePointerCapture(e.pointerId)
    const rect = canvas.getBoundingClientRect()
    const localX = e.clientX - rect.left
    const localY = e.clientY - rect.top

    // End header zoom if active
    if (headerZoom) { headerZoom = null; return }

    if (resizingSidebar) { resizingSidebar = null; return }

    // Commit task ops
    if (taskOpRef.mode === 'dep' && taskOpRef.taskId) {
      const hit = renderer.hitTest(localX, localY)
      if (depFSM) depFSM.commit(hit)
      taskOpRef.mode = 'none'
      return
    }
    if (taskOpRef.mode === 'resize' && taskOpRef.taskId) {
      if (resizeFSM) resizeFSM.commit(localX)
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
        if (moveFSM) moveFSM.commit(localX, localY)
      }
      renderer.clearPreview(); taskOpRef.mode = 'none'; return
    }

    // No task op: interpret as selection if minimal movement
    if (drag) {
      const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY)
      if (moved < 5) {
        const hit = renderer.hitTest(localX, localY)
        const fsm = new SelectionFSM({})
        const next = fsm.commit(hit, { ctrl: (e as any).ctrlKey, meta: (e as any).metaKey, shift: (e as any).shiftKey, x: localX, y: localY })
        if (next.ids.length > 0) store.dispatch(setSelectionWithAnchor({ ids: next.ids, anchor: next.anchor }))
        else store.dispatch(setSelection([]))
      }
    }
    drag = null
    panFSM = null
    moveFSM = null
    resizeFSM = null
    depFSM = null
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const vp = viewportRef.current
    if (e.ctrlKey || e.metaKey) {
      const factor = Math.exp(-e.deltaY * 0.001)
      const z1 = Math.max(0.1, Math.min(20, (vp.zoom || 1) * factor))
      const rect = canvas.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const next = applyAnchorZoom(vp, z1, localX, renderer.getSidebarWidth?.() || 0, TIMELINE.DAY_WIDTH)
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








