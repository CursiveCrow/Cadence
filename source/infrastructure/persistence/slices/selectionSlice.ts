import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface SelectionState {
  ids: string[]
}

const initialState: SelectionState = { ids: [] }

const selectionSlice = createSlice({
  name: 'selection',
  initialState,
  reducers: {
    setSelection: (state, action: PayloadAction<string[]>) => {
      state.ids = action.payload
    },
  },
})

export const { setSelection } = selectionSlice.actions
export default selectionSlice.reducer
