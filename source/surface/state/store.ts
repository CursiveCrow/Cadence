import { configureStore } from '@reduxjs/toolkit'
import ui from './ui'
import staffs from './staffs'

export const store = configureStore({ reducer: { ui, staffs } })

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

