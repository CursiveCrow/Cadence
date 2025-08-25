/**
 * Redux Toolkit Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit'
import { uiSlice } from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
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
