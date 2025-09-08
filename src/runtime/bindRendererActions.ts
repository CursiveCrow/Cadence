import type { IRenderer, Staff, Task } from '../types'
import { store } from '@state/store'
import { addTask, updateTask } from '@state/slices/tasksSlice'
import { addDependency } from '@state/slices/dependenciesSlice'
import { addStaff, updateStaff, deleteStaff, reorderStaffs } from '@state/slices/staffsSlice'
import { setSelection } from '@state/slices/uiSlice'

export function bindRendererActions(renderer: IRenderer) {
  renderer.setActions({
    addTask: (task: Task) => store.dispatch(addTask(task)),
    updateTask: (payload: { id: string; updates: Partial<Task> }) => store.dispatch(updateTask(payload)),
    addDependency: (dep: any) => store.dispatch(addDependency(dep)),
    addStaff: (staff: Staff) => store.dispatch(addStaff(staff)),
    updateStaff: (payload: { id: string; updates: Partial<Staff> }) => store.dispatch(updateStaff(payload)),
    deleteStaff: (id: string) => store.dispatch(deleteStaff(id)),
    reorderStaffs: (payload: { staffId: string; newPosition: number }) => store.dispatch(reorderStaffs(payload)),
    setSelection: (ids: string[]) => store.dispatch(setSelection(ids)),
  })
}





