import { Container } from 'pixi.js'
import type { TaskLike, TaskLayout } from '../types/renderer'
import { TimelineDnDController } from './controller'

export function onDownTask(this: TimelineDnDController, event: any, task: TaskLike, container: Container) {
    const globalPos = event.global
    const viewportPos = this.layers.viewport ? this.layers.viewport.toLocal(globalPos) : globalPos
    const localPos = container.toLocal(globalPos)
    const layout = this.scene.taskLayouts.get((task as any).id) as TaskLayout | undefined
    const isRightButton = event.button === 2
    if (isRightButton) {
        this.state.isCreatingDependency = true
        this.state.dependencySourceTaskId = (task as any).id
        this.callbacks.onDragStart && this.callbacks.onDragStart()
        return
    }

    try {
        const view = this.app.view as HTMLCanvasElement
        const rect = view.getBoundingClientRect()
        const cssX = rect.left + (globalPos.x * (rect.width / view.width))
        const cssY = rect.top + (globalPos.y * (rect.height / view.height))
            ; (window as any).__CADENCE_LAST_SELECT_POS = { x: Math.round(cssX), y: Math.round(cssY) }
    } catch { }
    this.callbacks.select([(task as any).id])
    const widthNow = layout ? layout.width : (container as any).hitArea?.width || 0
    const isNearRightEdge = localPos.x > widthNow - 10 && localPos.x >= 0
    if (isNearRightEdge) {
        this.state = {
            ...this.state,
            isDragging: false,
            isResizing: true,
            isCreatingDependency: false,
            dragPending: false,
            draggedTaskId: (task as any).id,
            draggedTask: task,
            dragStartX: globalPos.x,
            dragStartY: globalPos.y,
            offsetX: 0,
            offsetY: 0,
            clickLocalX: localPos.x,
            clickLocalY: localPos.y,
            dragPreview: null,
            dependencyPreview: null,
            initialDuration: (task as any).durationDays,
            dropProcessed: false,
            minAllowedDayIndex: this.computeMinAllowedDayIndex((task as any).id)
        } as any
        container.cursor = 'ew-resize'
        this.app.renderer?.events?.setCursor?.('ew-resize')
        this.callbacks.onDragStart && this.callbacks.onDragStart()
    } else {
        const taskY = (layout ? layout.centerY : (this.scene.taskLayouts.get((task as any).id)?.centerY ?? 0)) - this.config.TASK_HEIGHT / 2
        this.state = {
            ...this.state,
            isDragging: false,
            isResizing: false,
            isCreatingDependency: false,
            dragPending: true,
            draggedTaskId: (task as any).id,
            draggedTask: task,
            dragStartX: globalPos.x,
            dragStartY: globalPos.y,
            offsetX: viewportPos.x - (layout ? layout.startX : (this.scene.taskLayouts.get((task as any).id)?.startX ?? viewportPos.x)),
            offsetY: viewportPos.y - taskY,
            clickLocalX: localPos.x,
            clickLocalY: localPos.y,
            dragPreview: null,
            dependencyPreview: null,
            initialDuration: 0,
            dropProcessed: false,
            minAllowedDayIndex: this.computeMinAllowedDayIndex((task as any).id)
        } as any
    }
}

export function onMove(this: TimelineDnDController, event: any) {
    const globalPos = event.global
    const localPos = this.layers.viewport ? this.layers.viewport.toLocal(globalPos) : globalPos

    if (this.state.dragPending && !this.state.isDragging) {
        const dx = globalPos.x - this.state.dragStartX
        const dy = globalPos.y - this.state.dragStartY
        const distanceSq = dx * dx + dy * dy
        const thresholdSq = 4 * 4
        if (distanceSq >= thresholdSq) {
            this.state.isDragging = true
            this.state.dragPending = false
            this.app.renderer?.events?.setCursor?.('grabbing')
            this.callbacks.onDragStart && this.callbacks.onDragStart()
        }
    }

    if (this.state.isCreatingDependency && this.state.dependencySourceTaskId) {
        if (this.dependencyPreview && !this.layers.dragLayer.children.includes(this.dependencyPreview)) {
            this.layers.dragLayer.addChild(this.dependencyPreview)
        }
        const srcA = this.scene.getAnchors(this.state.dependencySourceTaskId)
        if (!srcA) return
        let hoverId: string | null = null
        let dstX = localPos.x
        let dstY = localPos.y
        const found = this.findTaskAtGlobal(globalPos, this.state.dependencySourceTaskId || undefined)
        if (found) {
            hoverId = found
            const a = this.scene.getAnchors(found)
            if (a) { dstX = a.leftCenterX; dstY = a.leftCenterY }
        }
        this.state.dependencyHoverTargetId = hoverId
        const g = this.dependencyPreview || new Graphics()
        g.clear()
        g.moveTo(srcA.leftCenterX, srcA.leftCenterY)
        g.lineTo(dstX, dstY)
        g.stroke({ width: 2, color: 0x10B981, alpha: 0.9 })
        const angle = Math.atan2(dstY - srcA.rightCenterY, dstX - srcA.rightCenterX)
        const arrow = 8
        g.beginPath()
        g.moveTo(dstX, dstY)
        g.lineTo(dstX - arrow * Math.cos(angle - Math.PI / 6), dstY - arrow * Math.sin(angle - Math.PI / 6))
        g.lineTo(dstX - arrow * Math.cos(angle + Math.PI / 6), dstY - arrow * Math.sin(angle + Math.PI / 6))
        g.closePath()
        g.fill({ color: 0x10B981, alpha: 0.8 })
            ; (g as any).eventMode = 'none'
        if (!this.dependencyPreview) {
            this.layers.dragLayer.addChild(g)
        }
        this.dependencyPreview = g
        return
    }

    if (this.state.isResizing && this.state.draggedTask) {
        const g = this.dragPreview || new Graphics()
        g.clear()
        const taskStart = new Date((this.state.draggedTask as any).startDate)
        const projectStartDate = this.utils.getProjectStartDate()
        const dayIndex = Math.floor((taskStart.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
        const dayWidth = this.getDayWidthFn ? this.getDayWidthFn() : this.config.DAY_WIDTH
        const startX = this.config.LEFT_MARGIN + dayIndex * dayWidth
        const snapRight = this.utils.snapXToTime
            ? this.utils.snapXToTime(localPos.x)
            : (() => {
                const rel = Math.round((localPos.x - this.config.LEFT_MARGIN) / Math.max(dayWidth, 0.0001))
                const snappedX = this.config.LEFT_MARGIN + rel * dayWidth
                return { snappedX, dayIndex: rel }
            })()
        const snappedRightX = Math.max(startX + dayWidth, snapRight.snappedX)
        const newWidth = Math.max(dayWidth, snappedRightX - startX)
        const taskY = this.scene.taskLayouts.get((this.state.draggedTask as any).id)?.topY ?? 0
        const taskH = this.getTaskHeightFn ? this.getTaskHeightFn() : this.config.TASK_HEIGHT
        drawNoteBodyPathAbsolute(g, startX, taskY, newWidth, taskH)
        g.fill({ color: 0x10B981, alpha: 0.5 })
        g.stroke({ width: 2, color: 0x10B981, alpha: 1 })
        if (!this.dragPreview) this.layers.dragLayer.addChild(g)
        this.dragPreview = g
        return
    }

    if (this.state.isDragging && this.state.draggedTask) {
        const preview = this.dragPreview || new Graphics()
        preview.clear()
        const localClickX = this.state.clickLocalX ?? 0
        const localClickY = this.state.clickLocalY ?? 0
        const dragX = localPos.x - localClickX
        const dragY = localPos.y - localClickY
        const dayWidth = this.getDayWidthFn ? this.getDayWidthFn() : this.config.DAY_WIDTH
        const layoutForTask = this.scene.taskLayouts.get((this.state.draggedTask as any).id)
        const taskWidth = layoutForTask ? layoutForTask.width : Math.max(dayWidth, (this.state.draggedTask as any).durationDays * dayWidth)
        const taskH2 = this.getTaskHeightFn ? this.getTaskHeightFn() : this.config.TASK_HEIGHT
        const radius = taskH2 / 2
        const scaledCfg = this.getScaledConfigFn ? this.getScaledConfigFn() : { TOP_MARGIN: this.config.TOP_MARGIN, STAFF_SPACING: this.config.STAFF_SPACING, STAFF_LINE_SPACING: this.config.STAFF_LINE_SPACING }
        const nearest = this.findNearestStaffLineScaled(dragY + radius, scaledCfg)
        if (nearest) {
            const targetLineY = nearest.centerY
            const snappedTopY = targetLineY - radius
            const snap = this.utils.snapXToTime ? this.utils.snapXToTime(dragX) : this.utils.snapXToDay(dragX)
            const snappedX = snap.snappedX
            const dayIndex = snap.dayIndex
            const minIdx = this.state.minAllowedDayIndex ?? 0
            const clampedDayIndex = Math.max(dayIndex, minIdx)
            this.state.snapDayIndex = clampedDayIndex
            this.state.snapStaffId = (nearest.staff as any).id
            this.state.snapStaffLine = nearest.staffLine
            const minX = this.config.LEFT_MARGIN + (minIdx * dayWidth)
            const clampedX = Math.max(snappedX, minX)
            this.state.snapSnappedX = clampedX
            const drawX = clampedX
            drawNoteBodyPathAbsolute(preview, drawX, snappedTopY, taskWidth, taskH2)
            preview.fill({ color: 0x8B5CF6, alpha: 0.5 })
            preview.stroke({ width: 2, color: 0xFCD34D, alpha: 1 })
        }
        ; (preview as any).eventMode = 'none'
        if (!this.dragPreview) this.layers.dragLayer.addChild(preview)
        this.dragPreview = preview
    }
}

export function onUp(this: TimelineDnDController, event: any) {
    const globalPos = event.global
    const localPos = this.layers.viewport ? this.layers.viewport.toLocal(globalPos) : globalPos

    if (this.dragPreview && this.layers.dragLayer.children.includes(this.dragPreview)) {
        this.layers.dragLayer.removeChild(this.dragPreview)
        this.dragPreview.destroy()
        this.dragPreview = null
    }
    if (this.dependencyPreview && this.layers.dragLayer.children.includes(this.dependencyPreview)) {
        this.layers.dragLayer.removeChild(this.dependencyPreview)
        this.dependencyPreview.destroy()
        this.dependencyPreview = null
    }

    if (this.state.isCreatingDependency && this.state.dependencySourceTaskId) {
        let targetTaskId: string | null = this.state.dependencyHoverTargetId || null
        if (!targetTaskId) {
            targetTaskId = this.findTaskAtGlobal(globalPos, this.state.dependencySourceTaskId || undefined)
        }
        if (targetTaskId && targetTaskId !== this.state.dependencySourceTaskId) {
            const sourceTask = this.data.getTasks()[this.state.dependencySourceTaskId]
            const destTask = this.data.getTasks()[targetTaskId]
            if (sourceTask && destTask) {
                const src = new Date(sourceTask.startDate) <= new Date(destTask.startDate) ? sourceTask : destTask
                const dst = src === sourceTask ? destTask : sourceTask
                const id = `dep-${Date.now()}`
                this.callbacks.createDependency(this.projectId, { id, srcTaskId: (src as any).id, dstTaskId: (dst as any).id, type: DependencyType.FINISH_TO_START })
            }
        }
        this.state.isCreatingDependency = false
        this.state.dependencySourceTaskId = null
        this.state.dependencyHoverTargetId = null
        this.callbacks.onDragEnd && this.callbacks.onDragEnd()
        this.resetCursor()
        return
    }

    if (this.state.isResizing && this.state.draggedTask && this.state.draggedTaskId) {
        const taskStart = new Date((this.state.draggedTask as any).startDate)
        const projectStartDate = this.utils.getProjectStartDate()
        const startDayIndex = Math.floor((taskStart.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24))
        const dayWidth = this.getDayWidthFn ? this.getDayWidthFn() : this.config.DAY_WIDTH
        const snapRight = this.utils.snapXToTime
            ? this.utils.snapXToTime(localPos.x)
            : (() => {
                const rel = Math.round((localPos.x - this.config.LEFT_MARGIN) / Math.max(dayWidth, 0.0001))
                const snappedX = this.config.LEFT_MARGIN + rel * dayWidth
                return { snappedX, dayIndex: rel }
            })()
        const rightIndex = Math.max(startDayIndex + 1, snapRight.dayIndex)
        const newDuration = Math.max(1, rightIndex - startDayIndex)
        this.callbacks.updateTask(this.projectId, this.state.draggedTaskId, { durationDays: newDuration })
        this.resetState()
        this.callbacks.onDragEnd && this.callbacks.onDragEnd()
        this.resetCursor()
        return
    }

    if (this.state.isDragging && this.state.draggedTask && this.state.draggedTaskId) {
        const taskH = this.getTaskHeightFn ? this.getTaskHeightFn() : this.config.TASK_HEIGHT
        const radius = taskH / 2
        const localClickX = this.state.clickLocalX ?? 0
        const localClickY = this.state.clickLocalY ?? 0
        const dropX = localPos.x - localClickX
        const dropY = localPos.y - localClickY
        const nearest = this.utils.findNearestStaffLine(dropY + radius)
        const dayIndex = this.state.snapDayIndex !== undefined
            ? this.state.snapDayIndex
            : (this.state.snapSnappedX !== undefined
                ? Math.round((this.state.snapSnappedX - this.config.LEFT_MARGIN) / ((this.getDayWidthFn ? this.getDayWidthFn() : this.config.DAY_WIDTH)))
                : (this.utils.snapXToTime ? this.utils.snapXToTime(dropX).dayIndex : this.utils.snapXToDay(dropX).dayIndex))
        const clampedDayIndex = Math.max(dayIndex, this.state.minAllowedDayIndex ?? 0)
        const startDate = this.utils.dayIndexToIsoDate(clampedDayIndex)
        const updates: any = { startDate }
        if (this.state.snapStaffId !== undefined && this.state.snapStaffLine !== undefined) {
            updates.staffId = this.state.snapStaffId
            updates.staffLine = this.state.snapStaffLine
        } else if (nearest) {
            updates.staffId = (nearest as any).staff.id
            updates.staffLine = (nearest as any).staffLine
        }
        this.callbacks.updateTask(this.projectId, this.state.draggedTaskId, updates)
        this.resetState()
        this.callbacks.onDragEnd && this.callbacks.onDragEnd()
        this.resetCursor()
    }

    if (this.state.dragPending) {
        this.state.dragPending = false
        this.resetCursor()
    }

    if (this.state.pointerDownOnStage && !this.state.isDragging && !this.state.isResizing && !this.state.isCreatingDependency && !this.state.dragPending) {
        const target = (event as any).target
        const matchedIdFromTarget = target ? this.resolveTaskIdFromHit(target) : null
        if (!matchedIdFromTarget) {
            this.callbacks.select([])
        }
    }
    this.state.stageDownOnEmpty = false
    this.state.pointerDownOnStage = false
}

export function onTap(this: TimelineDnDController, event: any) {
    if (event?.button === 2) return
    if (this.state.isDragging || this.state.isResizing || this.state.isCreatingDependency) return
    const target = (event as any).target
    const matchedIdFromTarget = target ? this.resolveTaskIdFromHit(target) : null
    if (!matchedIdFromTarget) {
        this.callbacks.select([])
    }
    this.state.pointerDownOnStage = false
}

export function onUpWindow(this: TimelineDnDController, e: PointerEvent | MouseEvent) {
    if (!this.state.isDragging && !this.state.isResizing && !this.state.isCreatingDependency) return
    const view = this.app.view as HTMLCanvasElement
    const rect = view.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (view.width / rect.width)
    const y = (e.clientY - rect.top) * (view.height / rect.height)
    const global = { x: x, y: y }
    this.onUp({ global } as any)
}

export function onContextMenu(this: TimelineDnDController, e: Event) {
    e.preventDefault()
}

export function onStageDown(this: TimelineDnDController, event: any) {
    if (event?.button === 2) return
    if (this.state.isDragging || this.state.isResizing || this.state.isCreatingDependency || this.state.dragPending) return
    const target = (event as any).target
    this.state.pointerDownOnStage = (target === this.app.stage)
    if (target === this.app.stage) {
        this.callbacks.select([])
        this.state.stageDownOnEmpty = false
        return
    }
    this.state.stageDownOnEmpty = true
}
