/**
 * Redux Toolkit Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit'
import ui from './slices/uiSlice'
import selection from './slices/selectionSlice'
import viewport from './slices/viewportSlice'
import staffs from './slices/staffsSlice'
import tasks from './slices/tasksSlice'
import dependencies from './slices/dependenciesSlice'
import projects from './slices/projectsSlice'
import uiDialogs from './slices/uiDialogsSlice'

export const store = configureStore({
  reducer: {
    ui,
    selection,
    viewport,
    staffs,
    tasks,
    dependencies,
    projects,
    uiDialogs,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
