import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface SelectionState { ids: string[] }
const initialState: SelectionState = { ids: [] }
const selectionSlice = createSlice({
  name: 'selection', initialState,
  reducers: {
    setSelection: (state, action: PayloadAction<string[]>) => { state.ids = action.payload },
    addToSelection: (state, action: PayloadAction<string>) => { if (!state.ids.includes(action.payload)) state.ids.push(action.payload) },
    removeFromSelection: (state, action: PayloadAction<string>) => { state.ids = state.ids.filter(id => id !== action.payload) },
    clearSelection: (state) => { state.ids = [] },
  },
})
export const { setSelection, addToSelection, removeFromSelection, clearSelection } = selectionSlice.actions
export default selectionSlice.reducer

