import { configureStore, combineReducers } from '@reduxjs/toolkit'
import ui from './ui'
import staffs from './staffs'
import tasks from './tasks'
import dependencies from './dependencies'

const PERSIST_KEY = 'cadence_state'
const PERSIST_VERSION = 2

function loadState() {
    try {
        const json = localStorage.getItem(PERSIST_KEY)
        if (!json) return undefined
        const parsed = JSON.parse(json)
        if (!parsed || parsed.__v !== PERSIST_VERSION) return undefined
        const { __v, ...state } = parsed
        return state
    } catch {
        return undefined
    }
}

function saveState(state: unknown) {
    try {
        const wrapped = { ...(state as object), __v: PERSIST_VERSION }
        localStorage.setItem(PERSIST_KEY, JSON.stringify(wrapped))
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
