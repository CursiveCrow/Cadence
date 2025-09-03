import type { TimelineConfig } from '../core/types/renderer'
import { TimelineRendererEngine, type EngineDependencies, type EngineTasks } from '../core/engine'
import type { Task, Staff, DependencyType } from '@cadence/core'

export type Viewport = { x: number; y: number; zoom: number }

export type RendererCallbacks = {
  select: (payload: { ids: string[]; anchor?: { x: number; y: number } }) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void
  createDependency: (projectId: string, dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }) => void
  onViewportChange?: (v: Viewport) => void
  onVerticalScaleChange?: (scale: number) => void
}

export type RendererUtils = {
  getProjectStartDate: () => Date
  findNearestStaffLine: (y: number) => { staff: Staff; staffLine: number; centerY: number } | null
  snapXToDay: (x: number) => { snappedX: number; dayIndex: number }
  dayIndexToIsoDate: (dayIndex: number) => string
}

export type RendererInitOptions = {
  canvas: HTMLCanvasElement
  projectId: string
  config: TimelineConfig
  utils: RendererUtils
  callbacks: RendererCallbacks
}

export type RendererPort = {
  init(): Promise<void>
  render(input: { tasks: EngineTasks; dependencies: EngineDependencies; staffs: Staff[]; selection: string[] }, viewport: Viewport): void
  setVerticalScale(scale: number): void
  destroy(): void
}

export function createRenderer(options: RendererInitOptions): RendererPort {
  const engine = new TimelineRendererEngine({
    canvas: options.canvas,
    projectId: options.projectId,
    config: options.config,
    utils: options.utils as any,
    callbacks: options.callbacks as any,
  })

  return {
    init: () => engine.init(),
    render: (input, viewport) => engine.render(input as any, viewport as any),
    setVerticalScale: (s: number) => engine.setVerticalScale(s),
    destroy: () => engine.destroy(),
  }
}
