import { createEntityAdapter, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Dependency } from '@cadence/core'

export const dependenciesAdapter = createEntityAdapter<Dependency>()

const dependenciesSlice = createSlice({
    name: 'dependencies',
    initialState: dependenciesAdapter.getInitialState(),
    reducers: {
        upsertMany: (state, action: PayloadAction<Dependency[]>) => {
            dependenciesAdapter.upsertMany(state, action.payload)
        },
        upsertOne: (state, action: PayloadAction<Dependency>) => {
            dependenciesAdapter.upsertOne(state, action.payload)
        },
        removeMany: (state, action: PayloadAction<string[]>) => {
            dependenciesAdapter.removeMany(state, action.payload)
        },
        removeOne: (state, action: PayloadAction<string>) => {
            dependenciesAdapter.removeOne(state, action.payload)
        },
        setAll: (state, action: PayloadAction<Dependency[]>) => {
            dependenciesAdapter.setAll(state, action.payload)
        },
        clear: (state) => {
            dependenciesAdapter.removeAll(state)
        },
    },
})

export const { upsertMany: upsertDependenciesMany, upsertOne: upsertDependency, removeMany: removeDependenciesMany, removeOne: removeDependency, setAll: setAllDependencies, clear: clearDependencies } = dependenciesSlice.actions
export default dependenciesSlice.reducer
export const dependenciesSelectors = dependenciesAdapter.getSelectors((state: any) => state.dependencies)

