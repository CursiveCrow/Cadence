import { useState, useEffect } from 'react'
import { getProjectDoc, TaskData, DependencyData } from '../ydoc'

export function useProjectTasks(projectId: string): Record<string, TaskData> {
  const ydoc = getProjectDoc(projectId)
  const [tasks, setTasks] = useState<Record<string, TaskData>>({})
  useEffect(() => { const tasksMap = ydoc.tasks; const observer = () => { setTasks(tasksMap.toJSON() as Record<string, TaskData>) }; tasksMap.observe(observer); observer(); return () => tasksMap.unobserve(observer) }, [ydoc])
  return tasks
}

export function useProjectDependencies(projectId: string): Record<string, DependencyData> {
  const ydoc = getProjectDoc(projectId)
  const [dependencies, setDependencies] = useState<Record<string, DependencyData>>({})
  useEffect(() => { const dependenciesMap = ydoc.dependencies; const observer = () => { setDependencies(dependenciesMap.toJSON() as Record<string, DependencyData>) }; dependenciesMap.observe(observer); observer(); return () => dependenciesMap.unobserve(observer) }, [ydoc])
  return dependencies
}

export function useTask(projectId: string, taskId: string): TaskData | undefined { const tasks = useProjectTasks(projectId); return tasks[taskId] }

export function useUndoRedo(projectId: string): { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void } {
  const ydoc = getProjectDoc(projectId)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  useEffect(() => { const updateState = () => { setCanUndo(ydoc.undoManager.canUndo()); setCanRedo(ydoc.undoManager.canRedo()) }; ydoc.undoManager.on('stack-item-added', updateState); ydoc.undoManager.on('stack-item-popped', updateState); updateState(); return () => { ydoc.undoManager.off('stack-item-added', updateState); ydoc.undoManager.off('stack-item-popped', updateState) } }, [ydoc])
  const undo = () => ydoc.undoManager.undo(); const redo = () => ydoc.undoManager.redo(); return { canUndo, canRedo, undo, redo }
}

