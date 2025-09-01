import type { TimelineSceneManager, TimelineConfig } from '../../core/scene'

export function rebuildSceneIndex(scene: TimelineSceneManager | null, effectiveCfg: TimelineConfig): void {
    if (!scene) return
    scene.rebuildSpatialIndex(effectiveCfg as any)
}


