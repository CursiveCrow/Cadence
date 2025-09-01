import { Rectangle } from 'pixi.js'
import type { TimelineConfig, TimelineSceneManager } from '../../core/scene'
import type { ViewportState } from '../../core/panzoom'
import { computeTaskLayout } from '../../utils/layout'
import type { Task, Staff } from '@cadence/core'
import type { TimelineDnDController } from '../../core/dnd'

export function renderTasks(
    scene: TimelineSceneManager | null,
    dnd: TimelineDnDController | null,
    data: { tasks: Record<string, Task>; staffs: Staff[]; selection: string[] },
    viewport: ViewportState,
    effectiveCfg: TimelineConfig,
    getProjectStartDate: () => Date
): void {
    if (!scene) return
    const projectStartDate = getProjectStartDate()
    const currentIds = new Set(Object.keys(data.tasks))
    for (const task of Object.values(data.tasks)) {
        const layout = computeTaskLayout(effectiveCfg as any, task, projectStartDate, data.staffs)
        const isSelected = data.selection.includes(task.id)
        const { container } = scene.upsertTask(task, layout, effectiveCfg as any, task.title, task.status, viewport.zoom, isSelected)
        container.position.set(Math.round(layout.startX), Math.round(layout.topY))
        container.hitArea = new Rectangle(0, 0, layout.width, (effectiveCfg as any).TASK_HEIGHT)
        if (dnd) dnd.registerTask(task, container, layout)
    }
    scene.removeMissingTasks(currentIds)
}


