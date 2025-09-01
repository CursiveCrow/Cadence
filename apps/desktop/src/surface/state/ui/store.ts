import { configureStore, combineReducers } from '@reduxjs/toolkit'
import ui from './slices/uiSlice'
import selection from './slices/selectionSlice'
import viewport from './slices/viewportSlice'
import staffs from './slices/staffsSlice'
import verticalScale from './slices/verticalScaleSlice'
import tasks from '../slices/tasksSlice'
import dependencies from '../slices/dependenciesSlice'
import storage from 'redux-persist/lib/storage'
import { persistStore, persistReducer } from 'redux-persist'

const rootReducer = combineReducers({ ui, selection, viewport, staffs, verticalScale, tasks, dependencies })

const persistConfig = {
  key: 'cadence-root',
  version: 1,
  storage,
  whitelist: ['ui', 'viewport', 'staffs', 'verticalScale', 'tasks', 'dependencies']
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: { ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'] } }),
})

export const persistor = persistStore(store)
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

