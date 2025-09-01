/**
 * CadenceMain Component
 * Main application component that orchestrates the UI
 */

import React, { useState, useEffect } from 'react'
import { Provider } from 'react-redux'
import { store } from '../../infrastructure/persistence/redux/store'
import { TimelineContainer } from '../containers/TimelineContainer'
import { Sidebar } from './Sidebar'
import { TaskDetails } from './TaskDetails'
import { StaffManager } from './StaffManager'
import { useAppSelector, useAppDispatch } from '../../infrastructure/persistence/redux/store'
import { setSidebarWidth, toggleSidebar } from '../../infrastructure/persistence/redux/slices/uiSlice'
import { setCurrentProject } from '../../infrastructure/persistence/redux/slices/projectsSlice'
import { PlatformService } from '../../infrastructure/platform/PlatformService'
import './CadenceMain.css'

export interface CadenceMainProps {
    initialProjectId?: string
}

const CadenceMainContent: React.FC<CadenceMainProps> = ({ initialProjectId }) => {
    const dispatch = useAppDispatch()
    const sidebarOpen = useAppSelector(state => state.ui.sidebarOpen)
    const sidebarWidth = useAppSelector(state => state.ui.sidebarWidth)
    const currentProjectId = useAppSelector(state => state.projects.currentProjectId)
    const taskDetailsOpen = useAppSelector(state => state.ui.taskDetailsOpen)
    const selectedTaskId = useAppSelector(state => state.ui.selectedTaskId)

    const [isResizingSidebar, setIsResizingSidebar] = useState(false)
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

    // Handle sidebar resize
    const handleSidebarResizeStart = () => {
        setIsResizingSidebar(true)
    }

    const handleSidebarResize = (event: MouseEvent) => {
        if (!isResizingSidebar) return

        const newWidth = Math.max(200, Math.min(600, event.clientX))
        dispatch(setSidebarWidth(newWidth))
    }

    const handleSidebarResizeEnd = () => {
        setIsResizingSidebar(false)
    }

    useEffect(() => {
        if (isResizingSidebar) {
            document.addEventListener('mousemove', handleSidebarResize)
            document.addEventListener('mouseup', handleSidebarResizeEnd)

            return () => {
                document.removeEventListener('mousemove', handleSidebarResize)
                document.removeEventListener('mouseup', handleSidebarResizeEnd)
            }
        }
    }, [isResizingSidebar])

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Toggle sidebar with Cmd/Ctrl+B
            if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
                event.preventDefault()
                dispatch(toggleSidebar())
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [dispatch])

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
            {sidebarOpen && (
                <>
                    <div className="cadence-sidebar" style={{ width: sidebarWidth }}>
                        <Sidebar projectId={currentProjectId} />
                    </div>
                    <div
                        className="sidebar-resize-handle"
                        onMouseDown={handleSidebarResizeStart}
                        style={{ left: sidebarWidth - 2 }}
                    />
                </>
            )}

            <div className="cadence-content" style={{
                marginLeft: sidebarOpen ? sidebarWidth : 0
            }}>
                <div className="cadence-header">
                    <button
                        className="sidebar-toggle"
                        onClick={() => dispatch(toggleSidebar())}
                        title="Toggle Sidebar (Ctrl+B)"
                    >
                        ☰
                    </button>
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
