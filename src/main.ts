import { store, RootState } from './state/store'
import { Renderer } from './renderer/Renderer'
import { TIMELINE, pixelsPerDay, applyAnchorZoom, screenXToWorldDays, dayIndexFromISO, isoFromDayIndex, computeScaledTimeline, staffCenterY } from './renderer'
import { PROJECT_START_DATE } from './config'
import { setViewport, setSelection, setSelectionWithAnchor } from './state/ui'
import { setStaffs } from './state/staffs'
import { setTasks, addTask, updateTask } from './state/tasks'
import { addDependency } from './state/dependencies'
import type { Staff, Task, Dependency, DependencyType, TaskStatus } from './types'

function getMinAllowedStartDayForTask(taskId: string, s: RootState): number {
    let minIdx = 0
    for (const d of s.dependencies.list) {
        if (d.dstTaskId === taskId) {
            const src = s.tasks.list.find(tsk => tsk.id === d.srcTaskId)
            if (src) {
                const sidx = Math.max(0, dayIndexFromISO(src.startDate, PROJECT_START_DATE))
                const req = sidx + src.durationDays
                if (req > minIdx) minIdx = req
            }
        }
    }
    return minIdx
}

function findStaffBlockAtY(metrics: ReturnType<Renderer['getMetrics']>['staffBlocks'], y: number) {
    return metrics.find(b => y >= b.yTop && y <= b.yBottom) || metrics[0]
}

function bootstrap() {
    const root = document.getElementById('root') as HTMLElement
    const content = document.createElement('div'); content.className = 'content'; root.appendChild(content)
    const main = document.createElement('main'); main.className = 'main'; content.appendChild(main)
    const canvas = document.createElement('canvas'); canvas.className = 'canvas'; main.appendChild(canvas)

    const renderer = new Renderer(canvas)

    // Minimal demo seed (replaces React useDemoProject)
    const s0 = store.getState() as RootState
    if (import.meta.env.DEV) {
        if ((s0.staffs.list || []).length === 0) {
            const now = new Date().toISOString()
            const demoStaffs: Staff[] = [
                { id: 'treble', name: 'Treble', numberOfLines: 5, lineSpacing: 12, position: 0, projectId: 'demo', createdAt: now, updatedAt: now, timeSignature: '4/4' },
                { id: 'bass', name: 'Bass', numberOfLines: 5, lineSpacing: 12, position: 1, projectId: 'demo', createdAt: now, updatedAt: now, timeSignature: '3/4' },
            ]
            store.dispatch(setStaffs(demoStaffs))
        }
        if ((s0.tasks.list || []).length === 0) {
            const now = new Date().toISOString()
            const demoTasks: Task[] = [
                { id: 't-1', title: 'Note A', startDate: '2024-01-22', durationDays: 3, status: 'not_started' as TaskStatus, staffId: 'treble', staffLine: 4, projectId: 'demo', createdAt: now, updatedAt: now },
                { id: 't-2', title: 'Note B', startDate: '2024-01-28', durationDays: 2, status: 'in_progress' as TaskStatus, staffId: 'bass', staffLine: 6, projectId: 'demo', createdAt: now, updatedAt: now },
            ]
            store.dispatch(setTasks(demoTasks))
        }
    }

    // Pump renderer from store with stable reference checks and RAF coalescing
    let lastStaffs: RootState['staffs']['list'] | null = null
    let lastTasks: RootState['tasks']['list'] | null = null
    let lastDeps: RootState['dependencies']['list'] | null = null
    let lastSelection: RootState['ui']['selection'] | null = null
    let lastViewport: RootState['ui']['viewport'] | null = null
    let lastVScale: number | null = null
    let scheduled = false

    const scheduleRender = () => {
        if (scheduled) return
        scheduled = true
        requestAnimationFrame(() => {
            scheduled = false
            try { renderer.render() } catch { }
        })
    }

    const pump = () => {
        const s = store.getState() as RootState
        const staffsRef = s.staffs.list
        const tasksRef = s.tasks.list
        const depsRef = s.dependencies.list
        const selectionRef = s.ui.selection
        const viewportRefLocal = s.ui.viewport
        const vScale = s.ui.verticalScale

        let dirty = false
        if (lastStaffs !== staffsRef) { lastStaffs = staffsRef; dirty = true }
        if (lastTasks !== tasksRef) { lastTasks = tasksRef; dirty = true }
        if (lastDeps !== depsRef) { lastDeps = depsRef; dirty = true }
        if (lastSelection !== selectionRef) { lastSelection = selectionRef; dirty = true }
        if (lastViewport !== viewportRefLocal) { lastViewport = viewportRefLocal; dirty = true }
        if (lastVScale !== vScale) { lastVScale = vScale; (renderer as unknown as { setVerticalScale?: (n: number) => void }).setVerticalScale?.(vScale); dirty = true }

        if (dirty) {
            renderer.setData({ staffs: staffsRef, tasks: tasksRef, dependencies: depsRef, selection: selectionRef })
            renderer.setViewport(viewportRefLocal)
            scheduleRender()
        }
    }
    store.subscribe(pump); pump()

    const viewportRef = { current: (store.getState() as RootState).ui.viewport }
    store.subscribe(() => { viewportRef.current = (store.getState() as RootState).ui.viewport })

    // Basic interactions: pan/zoom/hover (+ header middle-drag zoom) and task ops
    let drag: null | { startX: number; startY: number; startV: { x: number; y: number; zoom: number } } = null
    let headerZoom: null | { startX: number; startZoom: number; anchorLocalX: number } = null
    const taskOpRef: { mode: 'none' | 'move' | 'resize' | 'dep'; taskId?: string; clickOffsetX?: number; initialDuration?: number; sourceRect?: { x: number; y: number; w: number; h: number }; startX?: number; startY?: number } = { mode: 'none' }

    // Helpers
    const pxPerDayLocal = (z: number) => pixelsPerDay(z, TIMELINE.DAY_WIDTH)
    function getTimeSignature(staffId: string): { n: number; d: number } {
        const s = store.getState() as RootState
        const ts = (s.staffs.list.find((st) => st.id === staffId)?.timeSignature || '4/4').split('/')
        const n = Math.max(1, parseInt(ts[0] || '4', 10) || 4)
        const d = Math.max(1, parseInt(ts[1] || '4', 10) || 4)
        return { n, d }
    }
    function countNotesOnDay(staffId: string, dayIndex: number, ignoreTaskId?: string): number {
        const s = store.getState() as RootState
        let count = 0
        for (const t of s.tasks.list) {
            if (ignoreTaskId && t.id === ignoreTaskId) continue
            if (t.staffId !== staffId) continue
            const di = Math.max(0, dayIndexFromISO(t.startDate, PROJECT_START_DATE))
            if (di === dayIndex) count++
        }
        return count
    }
    function findAvailableDay(staffId: string, desiredDay: number, ignoreTaskId?: string): number {
        const { n, d } = getTimeSignature(staffId)
        let measureStart = Math.floor(Math.max(0, desiredDay) / d) * d
        let relative = Math.max(0, desiredDay) - measureStart
        for (let attempts = 0; attempts < 64; attempts++) {
            for (let i = 0; i < d; i++) {
                const cand = measureStart + ((relative + i) % d)
                if (countNotesOnDay(staffId, cand, ignoreTaskId) < n) return cand
            }
            measureStart += d
            relative = 0
        }
        return Math.max(0, desiredDay)
    }

    function onPointerDown(e: PointerEvent) {
        canvas.setPointerCapture(e.pointerId)
        const rect = canvas.getBoundingClientRect()
        const localX = e.clientX - rect.left
        const localY = e.clientY - rect.top
        const headerH = (renderer as unknown as { getHeaderHeight?: () => number }).getHeaderHeight?.() || 0
        // Middle button drag on header for zoom scrub
        if (e.button === 1 && localY <= headerH) {
            headerZoom = { startX: localX, startZoom: viewportRef.current.zoom, anchorLocalX: localX }
            return
        }
        // UI hit testing (buttons, modals)
        const uiHit = (renderer as unknown as { hitTestUI?: (x: number, y: number) => string | null }).hitTestUI?.(localX, localY) || null
        if (uiHit) {
            if (uiHit === 'btn:addNote') {
                const s = store.getState() as RootState
                const staffs = s.staffs.list
                const randomStaff = staffs[Math.floor(Math.random() * staffs.length)] || staffs[0]
                const now = new Date().toISOString()
                const newTask: Task = { id: `task-${Date.now()}`, title: 'New Note', startDate: '2024-01-08', durationDays: 2, status: 'not_started' as TaskStatus, staffId: randomStaff?.id || 'treble', staffLine: 4, projectId: 'demo', createdAt: now, updatedAt: now }
                store.dispatch(addTask(newTask))
                return
            }
            if (uiHit === 'btn:manage') { (renderer as unknown as { openStaffManager?: () => void }).openStaffManager?.(); return }
            if (uiHit === 'btn:link') {
                const s = store.getState() as RootState
                const selection = s.ui.selection
                if (selection.length === 2) {
                    const now = new Date().toISOString()
                    const dep: Dependency = { id: `dep-${Date.now()}`, srcTaskId: selection[0], dstTaskId: selection[1], type: 'finish_to_start' as DependencyType, projectId: 'demo', createdAt: now, updatedAt: now }
                    store.dispatch(addDependency(dep))
                }
                return
            }
            // Staff manager or task details actions handled inside renderer via hidden input
            if ((uiHit as string).startsWith('sm:') || (uiHit as string).startsWith('td:')) {
                (renderer as unknown as { setActions?: (a: any) => void }).setActions?.({
                    addStaff: (payload: Staff) => store.dispatch({ type: 'staffs/addStaff', payload }),
                    updateStaff: (payload: { id: string; updates: Partial<Staff> }) => store.dispatch({ type: 'staffs/updateStaff', payload }),
                    deleteStaff: (id: string) => store.dispatch({ type: 'staffs/deleteStaff', payload: id }),
                    reorderStaffs: (payload: { staffId: string; newPosition: number }) => store.dispatch({ type: 'staffs/reorderStaffs', payload }),
                    updateTask: (payload: { id: string; updates: Partial<Task> }) => store.dispatch(updateTask(payload)),
                })
                    ; (renderer as unknown as { handleUIAction?: (key: string) => void }).handleUIAction?.(uiHit)
                return
            }
        }

        // Default to panning or task interaction
        const sidebarW = (renderer as unknown as { getSidebarWidth?: () => number }).getSidebarWidth?.() || 0
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
        drag = { startX: e.clientX, startY: e.clientY, startV: { ...(viewportRef.current) } }
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
            const dayIndex = Math.max(0, dayIndexFromISO(t.startDate, PROJECT_START_DATE))
            const worldAtX = screenXToWorldDays(localX, viewportRef.current, TIMELINE.LEFT_MARGIN, TIMELINE.DAY_WIDTH)
            const rightIndex = Math.max(dayIndex + 1, Math.round(worldAtX))
            const newDur = Math.max(1, rightIndex - dayIndex)
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
            const snappedLocalStart = Math.max(0, (localX - (taskOpRef.clickOffsetX || 0)))
            const worldAtX = screenXToWorldDays(snappedLocalStart, viewportRef.current, TIMELINE.LEFT_MARGIN, TIMELINE.DAY_WIDTH)
            const initialDay = Math.max(0, Math.round(worldAtX))
            const minIdx = getMinAllowedStartDayForTask(t.id, s)
            const clampedDay = Math.max(initialDay, minIdx)
            const metrics = renderer.getMetrics()
            const sb = findStaffBlockAtY(metrics.staffBlocks as any, localY)
            const scaled = computeScaledTimeline((store.getState() as RootState).ui.verticalScale)
            const lineStep = (scaled.lineSpacing) / 2
            const lineIndex = Math.max(0, Math.round(((localY) - (sb?.yTop || 0)) / Math.max(1, lineStep)))
            const hpx = Math.max(18, Math.min(28, Math.floor(lineStep * 1.8)))
            const allowedDay = findAvailableDay((sb as any)?.id || t.staffId, clampedDay, t.id)
            const xStartPx = TIMELINE.LEFT_MARGIN + (allowedDay - viewportRef.current.x) * ppd
            const yTop = staffCenterY((sb?.yTop || 0), lineIndex, scaled.lineSpacing) - hpx / 2
            const wpx = Math.max(ppd * (t.durationDays || 1), 4)
            renderer.drawDragPreview(xStartPx, yTop, wpx, hpx)
            return
        }
        if (!drag) { requestAnimationFrame(() => { try { renderer.render() } catch { } }); return }
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
                    const toMs = (iso: string) => { const p = iso.split('-').map(Number); return Date.UTC(p[0]!, (p[1]! - 1), p[2]!) }
                    const [src, dst] = toMs(srcTask.startDate) <= toMs(dstTask.startDate) ? [srcTask, dstTask] : [dstTask, srcTask]
                    const now = new Date().toISOString()
                    const dep: Dependency = { id: `dep-${Date.now()}`, srcTaskId: src.id, dstTaskId: dst.id, type: 'finish_to_start' as DependencyType, projectId: 'demo', createdAt: now, updatedAt: now }
                    store.dispatch(addDependency(dep))
                }
            }
            taskOpRef.mode = 'none'
            return
        }
        if (taskOpRef.mode === 'resize' && taskOpRef.taskId) {
            const s = store.getState() as RootState
            const t = (s.tasks.list).find((tt) => tt.id === taskOpRef.taskId)
            if (t) {
                const dayIndex = Math.max(0, dayIndexFromISO(t.startDate, PROJECT_START_DATE))
                const worldAtX = screenXToWorldDays(localX, viewportRef.current, TIMELINE.LEFT_MARGIN, TIMELINE.DAY_WIDTH)
                const rightIndex = Math.max(dayIndex + 1, Math.round(worldAtX))
                const newDur = Math.max(1, rightIndex - dayIndex)
                store.dispatch(updateTask({ id: t.id, updates: { durationDays: newDur } }))
            }
            renderer.clearPreview(); taskOpRef.mode = 'none'; return
        }
        if (taskOpRef.mode === 'move' && taskOpRef.taskId) {
            const s = store.getState() as RootState
            const t = (s.tasks.list).find((tt) => tt.id === taskOpRef.taskId)
            if (t) {
                const moved = Math.hypot(localX - (taskOpRef.startX || localX), localY - (taskOpRef.startY || localY))
                if (moved < 5) {
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
                const snappedLocalStart = Math.max(0, (localX - (taskOpRef.clickOffsetX || 0)))
                const initialDay = Math.max(0, Math.round(screenXToWorldDays(snappedLocalStart, viewportRef.current, TIMELINE.LEFT_MARGIN, TIMELINE.DAY_WIDTH)))
                const minIdx = getMinAllowedStartDayForTask(t.id, s)
                const dayIndex = Math.max(initialDay, minIdx)
                const m = renderer.getMetrics()
                const sb = findStaffBlockAtY(m.staffBlocks as any, localY)
                const scaled = computeScaledTimeline((store.getState() as RootState).ui.verticalScale)
                const lineStep = (scaled.lineSpacing) / 2
                const staffLine = Math.max(0, Math.round(((localY) - (sb?.yTop || 0)) / Math.max(1, lineStep)))
                const staffId = (sb as any)?.id || t.staffId
                const allowedDay = Math.max(0, findAvailableDay(staffId, dayIndex, t.id))
                const iso = isoFromDayIndex(allowedDay, PROJECT_START_DATE)
                store.dispatch(updateTask({ id: t.id, updates: { startDate: iso, staffId, staffLine } }))
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

    window.addEventListener('resize', () => { try { renderer.resize(); scheduleRender() } catch { } })
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerleave', () => { try { renderer.setHover(null, null); scheduleRender() } catch { } })
}

bootstrap()


