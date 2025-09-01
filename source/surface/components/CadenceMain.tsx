/**
 * CadenceMain Component
 * Main application component that orchestrates the UI
 */

import React, { useState, useEffect } from 'react'
import { Provider } from 'react-redux'
import { store } from '../../infrastructure/persistence/redux/store'
import { TimelineContainer } from '../containers/TimelineContainer'
// Removed non-canvas task list sidebar to match legacy UI
import { TaskDetails } from './TaskDetails'
import { StaffManager } from './StaffManager'
import { useAppSelector, useAppDispatch } from '../../infrastructure/persistence/redux/store'
// import { toggleSidebar } from '../../infrastructure/persistence/redux/slices/uiSlice'
import { setCurrentProject } from '../../infrastructure/persistence/redux/slices/projectsSlice'
import { PlatformService } from '../../infrastructure/platform/PlatformService'
import './CadenceMain.css'

export interface CadenceMainProps {
    initialProjectId?: string
}

const CadenceMainContent: React.FC<CadenceMainProps> = ({ initialProjectId }) => {
    const dispatch = useAppDispatch()
    // Sidebar removed from layout
    const currentProjectId = useAppSelector(state => state.projects.currentProjectId)
    const taskDetailsOpen = useAppSelector(state => state.ui.taskDetailsOpen)
    const selectedTaskId = useAppSelector(state => state.ui.selectedTaskId)

    // Sidebar resize removed
    const platformService = new PlatformService()

    // Set initial project
    useEffect(() => {
        if (initialProjectId && !currentProjectId) {
            dispatch(setCurrentProject(initialProjectId))
        }
    }, [initialProjectId, currentProjectId, dispatch])

    // Set window title
    useEffect(() => {
        const projectName = currentProjectId ? 'Project' : 'Cadence'
        platformService.setTitle(`${projectName} - Cadence Timeline Manager`)
    }, [currentProjectId])

    // Sidebar resize removed

    // Keyboard shortcut for sidebar removed

    if (!currentProjectId) {
        return (
            <div className="cadence-welcome">
                <h1>Welcome to Cadence</h1>
                <p>Please create or open a project to get started.</p>
                <div className="welcome-actions">
                    <button className="btn btn-primary">New Project</button>
                    <button className="btn btn-secondary">Open Project</button>
                </div>
            </div>
        )
    }

    return (
        <div className="cadence-main">
            {/* App sidebar removed */}

            <div className="cadence-content" style={{ marginLeft: 0 }}>
                <div className="cadence-header">
                    <h2>Timeline</h2>
                    <div className="header-actions">
                        <button className="btn btn-sm">Add Task</button>
                        <button className="btn btn-sm">Zoom In</button>
                        <button className="btn btn-sm">Zoom Out</button>
                        <button className="btn btn-sm">Fit to View</button>
                    </div>
                </div>

                <div className="cadence-timeline">
                    <TimelineContainer projectId={currentProjectId} />
                </div>

                {taskDetailsOpen && selectedTaskId && (
                    <div className="cadence-task-details">
                        <TaskDetails taskId={selectedTaskId} />
                    </div>
                )}
            </div>

            <StaffManager projectId={currentProjectId} />
        </div>
    )
}

export const CadenceMain: React.FC<CadenceMainProps> = (props) => {
    return (
        <Provider store={store}>
            <CadenceMainContent {...props} />
        </Provider>
    )
}
