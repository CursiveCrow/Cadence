/**
 * Redux Toolkit Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit'
import ui from './slices/uiSlice'
import selection from './slices/selectionSlice'
import viewport from './slices/viewportSlice'
import staffs from './slices/staffsSlice'

export const store = configureStore({
  reducer: {
    ui,
    selection,
    viewport,
    staffs,
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
