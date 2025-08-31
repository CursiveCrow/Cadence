import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface UIDialogsState {
    taskDetailsOpen: boolean
    staffManagerOpen: boolean
}

const initialState: UIDialogsState = {
    taskDetailsOpen: false,
    staffManagerOpen: false,
}

const uiDialogsSlice = createSlice({
    name: 'uiDialogs',
    initialState,
    reducers: {
        setTaskDetailsOpen: (state, action: PayloadAction<boolean>) => {
            state.taskDetailsOpen = action.payload
        },
        setStaffManagerOpen: (state, action: PayloadAction<boolean>) => {
            state.staffManagerOpen = action.payload
        },
    },
})

export const { setTaskDetailsOpen, setStaffManagerOpen } = uiDialogsSlice.actions
export default uiDialogsSlice.reducer


