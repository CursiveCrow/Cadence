import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Dependency } from '@types'

export interface DependenciesState { list: Dependency[] }

const initialState: DependenciesState = { list: [] }

const dependenciesSlice = createSlice({
  name: 'dependencies',
  initialState,
  reducers: {
    setDependencies: (_state, action: PayloadAction<Dependency[]>) => ({ list: [...action.payload] }),
    addDependency: (state, action: PayloadAction<Dependency>) => { state.list.push(action.payload) },
    deleteDependency: (state, action: PayloadAction<string>) => { state.list = state.list.filter(d => d.id !== action.payload) },
  },
})

export const { setDependencies, addDependency, deleteDependency } = dependenciesSlice.actions
export default dependenciesSlice.reducer
