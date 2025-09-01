/**
 * TimelineContainer
 * Smart container component that connects timeline to Redux store and business logic
 */

import React, { useEffect, useCallback, useMemo } from 'react'
import { useAppSelector, useAppDispatch } from '../../infrastructure/persistence/redux/store'
import { TimelineView } from '../components/TimelineView'
import { DateHeader } from '../components/DateHeader'
import { StaffSidebar } from '../components/StaffSidebar'
import { CreateTaskCommand } from '../../core/use-cases/commands/CreateTaskCommand'
import { UpdateTaskCommand } from '../../core/use-cases/commands/UpdateTaskCommand'
import { CreateDependencyCommand } from '../../core/use-cases/commands/CreateDependencyCommand'
import { GetTasksQuery } from '../../core/use-cases/queries/GetTasksQuery'
import { GetDependenciesQuery } from '../../core/use-cases/queries/GetDependenciesQuery'
import {
    selectTasksByProject,
    selectDependenciesByProject,
    selectStaffsByProject,
    selectProjectById,
    selectSelectedTaskIds,
    selectViewport,
    selectTimelineConfig
} from '../../infrastructure/persistence/redux/store'
import { setViewport, pan, zoom, setVerticalScale } from '../../infrastructure/persistence/redux/slices/viewportSlice'
import { selectTasks, clearSelection } from '../../infrastructure/persistence/redux/slices/selectionSlice'
import { setHoveredTask, setDraggedTask } from '../../infrastructure/persistence/redux/slices/timelineSlice'
import { useRepositories } from '../hooks/useRepositories'
import { useServices } from '../hooks/useServices'
import type { CreateTaskDTO, UpdateTaskDTO, CreateDependencyDTO } from '../../core/use-cases/dto/TaskDTO'

export interface TimelineContainerProps {
    projectId: string
}

export const TimelineContainer: React.FC<TimelineContainerProps> = ({ projectId }) => {
    const dispatch = useAppDispatch()

    // Get data from Redux store
    // Memoize selector instances to keep referential stability across renders for a given projectId
    const tasksSelector = useMemo(() => selectTasksByProject(projectId), [projectId])
    const depsSelector = useMemo(() => selectDependenciesByProject(projectId), [projectId])
    const staffsSelector = useMemo(() => selectStaffsByProject(projectId), [projectId])
    const projectSelector = useMemo(() => selectProjectById(projectId), [projectId])

    const tasks = useAppSelector(tasksSelector)
    const dependencies = useAppSelector(depsSelector)
    const staffs = useAppSelector(staffsSelector)
    const project = useAppSelector(projectSelector)
    const selection = useAppSelector(selectSelectedTaskIds)
    const viewport = useAppSelector(selectViewport)
    const config = useAppSelector(selectTimelineConfig)

    // Get repositories and services
    const repositories = useRepositories()
    const services = useServices()

    // Create command and query instances
    const createTaskCommand = useMemo(() => {
        if (!repositories || !services) return null
        return new CreateTaskCommand(
            repositories.taskRepository,
            repositories.staffRepository,
            repositories.projectRepository,
            services.validationService,
            services.eventBus
        )
    }, [repositories, services])

    const updateTaskCommand = useMemo(() => {
        if (!repositories || !services) return null
        return new UpdateTaskCommand(
            repositories.taskRepository,
            repositories.staffRepository,
            repositories.projectRepository,
            services.validationService,
            services.eventBus
        )
    }, [repositories, services])

    const createDependencyCommand = useMemo(() => {
        if (!repositories || !services) return null
        return new CreateDependencyCommand(
            repositories.dependencyRepository,
            repositories.taskRepository,
            services.dependencyService,
            services.validationService,
            services.eventBus
        )
    }, [repositories, services])

    const getTasksQuery = useMemo(() => {
        if (!repositories || !services) return null
        return new GetTasksQuery(
            repositories.taskRepository,
            repositories.dependencyRepository,
            services.taskService,
            services.schedulingService
        )
    }, [repositories, services])

    const getDependenciesQuery = useMemo(() => {
        if (!repositories || !services) return null
        return new GetDependenciesQuery(
            repositories.dependencyRepository,
            services.dependencyService
        )
    }, [repositories, services])

    // Task operations
    const handleCreateTask = useCallback(async (dto: CreateTaskDTO) => {
        if (!createTaskCommand) return
        try {
            const task = await createTaskCommand.execute(dto)
            // Task will be added to Redux store via repository
            return task
        } catch (error) {
            console.error('Failed to create task:', error)
            throw error
        }
    }, [createTaskCommand])

    const handleUpdateTask = useCallback(async (taskId: string, updates: UpdateTaskDTO) => {
        if (!updateTaskCommand) return
        try {
            const task = await updateTaskCommand.execute(taskId, updates)
            // Task will be updated in Redux store via repository
            return task
        } catch (error) {
            console.error('Failed to update task:', error)
            throw error
        }
    }, [updateTaskCommand])

    const handleDeleteTask = useCallback(async (taskId: string) => {
        if (!repositories) return
        try {
            await repositories.taskRepository.delete(taskId)
            // Task will be removed from Redux store via repository
        } catch (error) {
            console.error('Failed to delete task:', error)
            throw error
        }
    }, [repositories])

    // Dependency operations
    const handleCreateDependency = useCallback(async (dto: CreateDependencyDTO) => {
        if (!createDependencyCommand) return
        try {
            const dependency = await createDependencyCommand.execute(dto)
            // Dependency will be added to Redux store via repository
            return dependency
        } catch (error) {
            console.error('Failed to create dependency:', error)
            throw error
        }
    }, [createDependencyCommand])

    const handleDeleteDependency = useCallback(async (dependencyId: string) => {
        if (!repositories) return
        try {
            await repositories.dependencyRepository.delete(dependencyId)
            // Dependency will be removed from Redux store via repository
        } catch (error) {
            console.error('Failed to delete dependency:', error)
            throw error
        }
    }, [repositories])

    // Selection operations
    const handleSelectTasks = useCallback((taskIds: string[]) => {
        dispatch(selectTasks(taskIds))
    }, [dispatch])

    const handleClearSelection = useCallback(() => {
        dispatch(clearSelection())
    }, [dispatch])

    // Viewport operations
    const handleViewportChange = useCallback((newViewport: { x?: number; y?: number; zoom?: number }) => {
        dispatch(setViewport(newViewport))
    }, [dispatch])

    const handlePan = useCallback((dx: number, dy: number) => {
        dispatch(pan({ dx, dy }))
    }, [dispatch])

    const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
        dispatch(zoom({ delta, centerX, centerY }))
    }, [dispatch])

    const handleVerticalScale = useCallback((factor: number, anchorY: number) => {
        // Map factor to absolute scale using current viewport; for now we reuse zoom semantics
        // If viewport slice had a dedicated action, use it directly
        dispatch(setVerticalScale(Math.max(0.5, Math.min(2, (viewport.verticalScale || 1) * (1 + factor)))))
    }, [dispatch, viewport.verticalScale])

    // Hover and drag operations
    const handleTaskHover = useCallback((taskId: string | null) => {
        dispatch(setHoveredTask(taskId))
    }, [dispatch])

    const handleTaskDragStart = useCallback((taskId: string) => {
        dispatch(setDraggedTask(taskId))
    }, [dispatch])

    const handleTaskDragEnd = useCallback(() => {
        dispatch(setDraggedTask(null))
    }, [dispatch])

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            if (!getTasksQuery || !getDependenciesQuery) return

            try {
                // Data is already in Redux store, but we can fetch fresh data if needed
                const tasks = await getTasksQuery.getByProject(projectId)
                const dependencies = await getDependenciesQuery.getByProject(projectId)

                // Update Redux store if needed
                // This would typically be done through actions
            } catch (error) {
                console.error('Failed to load timeline data:', error)
            }
        }

        loadData()
    }, [projectId, getTasksQuery, getDependenciesQuery])

    if (!project) {
        return <div>Project not found</div>
    }

    const staffSidebarWidth = 120

    const handleHeaderZoomChange = (newZoom: number, anchorX: number) => {
        const factor = Math.max(0.1, Math.min(5, newZoom))
        const delta = factor / Math.max(0.1, viewport.zoom || 1) - 1
        dispatch(zoom({ delta, centerX: anchorX, centerY: 0 }))
    }

    return (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateRows: `auto 1fr`, gridTemplateColumns: `${staffSidebarWidth}px 1fr` }}>
            {/* Date header aligned to canvas grid */}
            <div style={{ gridRow: '1 / 2', gridColumn: '2 / 3', position: 'relative', background: 'white', borderBottom: '1px solid #eee' }}>
                <DateHeader
                    projectStartDate={project.startDate}
                    viewport={{ x: viewport.x, y: viewport.y, zoom: viewport.zoom }}
                    width={0}
                    onZoomChange={handleHeaderZoomChange}
                    config={config}
                />
            </div>
            {/* Staff sidebar aligned with canvas */}
            <div style={{ gridRow: '2 / 3', gridColumn: '1 / 2', position: 'relative', background: 'white', borderRight: '1px solid #eee' }}>
                <StaffSidebar
                    staffs={Object.values(staffs)}
                    viewport={{ x: viewport.x, y: viewport.y, zoom: viewport.zoom, verticalScale: (viewport as any).verticalScale }}
                    width={staffSidebarWidth}
                    onVerticalZoomChange={(scale) => dispatch(setVerticalScale(scale))}
                />
            </div>
            {/* Canvas */}
            <div style={{ gridRow: '2 / 3', gridColumn: '2 / 3', position: 'relative' }}>
                <TimelineView
                    project={project}
                    tasks={Object.values(tasks)}
                    dependencies={Object.values(dependencies)}
                    staffs={Object.values(staffs)}
                    selection={selection}
                    viewport={viewport}
                    config={config}
                    onCreateTask={handleCreateTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onCreateDependency={handleCreateDependency}
                    onDeleteDependency={handleDeleteDependency}
                    onSelectTasks={handleSelectTasks}
                    onClearSelection={handleClearSelection}
                    onViewportChange={handleViewportChange}
                    onPan={handlePan}
                    onZoom={handleZoom}
                    onVerticalScale={handleVerticalScale}
                    onTaskHover={handleTaskHover}
                    onTaskDragStart={handleTaskDragStart}
                    onTaskDragEnd={handleTaskDragEnd}
                />
            </div>
        </div>
    )
}
