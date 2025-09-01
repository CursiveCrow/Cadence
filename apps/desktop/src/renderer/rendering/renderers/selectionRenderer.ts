import type { TimelineConfig, TimelineSceneManager } from '../../core/scene'

export function renderSelection(
    scene: TimelineSceneManager | null,
    selection: string[],
    effectiveCfg: TimelineConfig
): void {
    if (!scene) return
    scene.clearSelection()
    for (const id of selection) {
        scene.drawSelection(id, effectiveCfg as any)
    }
}


