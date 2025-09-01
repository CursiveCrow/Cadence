import type { TimelineConfig, TimelineSceneManager } from '../../core/scene'
import { drawDependencyArrow } from '../../rendering/shapes'
import type { Dependency } from '@cadence/core'

export function renderDependencies(
    scene: TimelineSceneManager | null,
    dependencies: Record<string, Dependency>,
    effectiveCfg: TimelineConfig
): void {
    if (!scene) return
    const currentDepIds = new Set(Object.keys(dependencies))
    for (const dependency of Object.values(dependencies)) {
        const srcA = scene.getAnchors(dependency.srcTaskId)
        const dstA = scene.getAnchors(dependency.dstTaskId)
        if (!srcA || !dstA) continue
        const g = scene.upsertDependency(dependency.id)
        drawDependencyArrow(g, srcA.rightCenterX, srcA.rightCenterY, dstA.leftCenterX, dstA.leftCenterY, (effectiveCfg as any).DEPENDENCY_COLOR)
    }
    scene.removeMissingDependencies(currentDepIds)
}


