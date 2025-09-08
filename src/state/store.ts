import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { storage } from '../domain/services/storage'
import ui from './slices/uiSlice'
import staffs from './slices/staffsSlice'
import tasks from './slices/tasksSlice'
import dependencies from './slices/dependenciesSlice'

const PERSIST_KEY = 'cadence_state'
const PERSIST_VERSION = 3

function loadState() {
    try {
        const json = storage.getItem(PERSIST_KEY)
        if (!json) return undefined
        const parsed = JSON.parse(json)
        if (!parsed || parsed.__v !== PERSIST_VERSION) return undefined
        const { __v, ...state } = parsed
        // Normalize UI shape when older states are loaded in the future
        if ((state as any).ui) {
            const ui: any = (state as any).ui
            if (!Number.isFinite(ui.sidebarWidth)) ui.sidebarWidth = 220
            if (!ui.viewport) ui.viewport = { x: 0, y: 0, zoom: 1 }
            if (!Number.isFinite(ui.verticalScale)) ui.verticalScale = 1
        }
        return state
    } catch {
        return undefined
    }
}

function saveState(state: unknown) {
    try {
        const wrapped = { ...(state as object), __v: PERSIST_VERSION }
        storage.setItem(PERSIST_KEY, JSON.stringify(wrapped))
    } catch {
        // ignore
    }
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
    let t: number | undefined
    return ((...args: any[]) => {
        if (t) window.clearTimeout(t)
        t = window.setTimeout(() => { fn(...args) }, ms)
    }) as T
}

const rootReducer = combineReducers({ ui, staffs, tasks, dependencies })
export type RootState = ReturnType<typeof rootReducer>

export const store = configureStore({
    reducer: rootReducer,
    preloadedState: loadState() as Partial<RootState>,
})

const persist = debounce(() => {
    const { ui, staffs, tasks, dependencies } = store.getState()
    saveState({ ui, staffs, tasks, dependencies })
}, 250)

store.subscribe(persist)
export type AppDispatch = typeof store.dispatch
