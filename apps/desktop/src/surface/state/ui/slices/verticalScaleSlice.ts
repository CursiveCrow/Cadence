import { createSlice, PayloadAction } from '@reduxjs/toolkit'
const initialState = 1 as number
const verticalScaleSlice = createSlice({ name: 'verticalScale', initialState, reducers: { setVerticalScale: (_state, action: PayloadAction<number>) => action.payload } })
export const { setVerticalScale } = verticalScaleSlice.actions
export default verticalScaleSlice.reducer

