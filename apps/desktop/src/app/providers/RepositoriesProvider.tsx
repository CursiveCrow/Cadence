import React, { createContext, useContext, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { YjsTasksRepository, YjsDependenciesRepository, MemoryStaffsRepository } from '@cadence/repositories'
import { upsertTasksMany, removeTasksMany } from '@cadence/core/state'
import { upsertDependenciesMany, removeDependenciesMany } from '@cadence/core/state'
import { setActiveProject, addStaff, updateStaff, deleteStaff, type RootState } from '@cadence/core/state'
import type { Staff } from '@cadence/core'
import { seedDemoProject } from '@cadence/fixtures'

interface Repositories {
    tasks: YjsTasksRepository
    dependencies: YjsDependenciesRepository
    staffs: MemoryStaffsRepository
}

const RepositoriesContext = createContext<Repositories | null>(null)

export function useRepositories() {
    const ctx = useContext(RepositoriesContext)
    if (!ctx) throw new Error('RepositoriesProvider missing')
    return ctx
}

export const RepositoriesProvider: React.FC<{ children: React.ReactNode; projectId: string }> = ({ children, projectId }) => {
    const dispatch = useDispatch()
    const reposRef = React.useRef<Repositories | null>(null)
    if (!reposRef.current) {
        reposRef.current = {
            tasks: new YjsTasksRepository(),
            dependencies: new YjsDependenciesRepository(),
            staffs: new MemoryStaffsRepository(),
        }
    }

    useEffect(() => {
        const repos = reposRef.current!
        void repos.tasks.initialize()
        void repos.dependencies.initialize()
        void repos.staffs.initialize()

        // Attach project observers inside repositories and subscribe to repo events
        const detachTasks = repos.tasks.attachProject(projectId)
        const detachDeps = repos.dependencies.attachProject(projectId)
        const unwatchTasks = repos.tasks.watch((e) => {
            if (e.type === 'upsert') {
                dispatch(upsertTasksMany(e.data))
            } else if (e.type === 'remove') {
                const ids = (e.data as any[]).map((t) => t.id as string)
                dispatch(removeTasksMany(ids))
            }
        })
        const unwatchDeps = repos.dependencies.watch((e) => {
            if (e.type === 'upsert') {
                dispatch(upsertDependenciesMany(e.data))
            } else if (e.type === 'remove') {
                const ids = (e.data as any[]).map((d) => d.id as string)
                dispatch(removeDependenciesMany(ids))
            }
        })
        // Staffs repository watcher (memory-backed for now)
        const staffsRef = { current: [] as Staff[] }
        try { staffsRef.current = (document as any).__CADENCE_STAFFS_CACHE__ || [] } catch { }
        const unwatchStaffs = repos.staffs.watch((e) => {
            if (e.type === 'upsert') {
                for (const s of e.data as Staff[]) {
                    const existing = staffsRef.current.find((x) => x.id === s.id)
                    if (existing) {
                        (dispatch as any)(updateStaff({ id: s.id, updates: s }))
                        Object.assign(existing, s)
                    } else {
                        (dispatch as any)(addStaff(s))
                        staffsRef.current.push(s)
                    }
                }
                staffsRef.current.sort((a, b) => a.position - b.position)
            } else if (e.type === 'remove') {
                for (const s of e.data as Staff[]) {
                    (dispatch as any)(deleteStaff(s.id as any))
                    const idx = staffsRef.current.findIndex((x) => x.id === (s as any).id)
                    if (idx !== -1) staffsRef.current.splice(idx, 1)
                }
            }
            try { (document as any).__CADENCE_STAFFS_CACHE__ = staffsRef.current } catch { }
        })

        return () => {
            try { unwatchTasks() } catch { }
            try { unwatchDeps() } catch { }
            try { unwatchStaffs() } catch { }
            try { detachTasks() } catch { }
            try { detachDeps() } catch { }
            void repos.tasks.dispose(); void repos.dependencies.dispose(); void repos.staffs.dispose()
        }
    }, [dispatch, projectId])

    // Demo project seeding and active project setup
    const activeProjectId = useSelector((state: RootState) => state.ui.activeProjectId)
    const staffs = useSelector((state: RootState) => state.staffs.list)
    const tasks = useSelector((state: any) => (state as any).tasks.entities as Record<string, any>)
    const seededRef = React.useRef<boolean>(false)

    useEffect(() => {
        if (seededRef.current) return
        // Ensure active project is set
        if (!activeProjectId) {
            dispatch(setActiveProject(projectId))
        }
        // Seed default staffs via repository if none exist yet
        if (staffs.length === 0) {
            const now = new Date().toISOString()
            const defaults = [
                { id: 'staff-treble', name: 'Treble', numberOfLines: 5, lineSpacing: 12, position: 0, projectId, createdAt: now, updatedAt: now },
                { id: 'staff-bass', name: 'Bass', numberOfLines: 5, lineSpacing: 12, position: 1, projectId, createdAt: now, updatedAt: now },
            ]
            const repos = reposRef.current!
            void repos.staffs.bulkUpsert(defaults as any)
        }
        // Seed tasks/dependencies via repositories if not yet present
        if (Object.keys(tasks || {}).length === 0) {
            const repos = reposRef.current!
            seedDemoProject(
                projectId,
                {
                    createTask: async (_projectId, partial) => {
                        const now = new Date().toISOString()
                        const full = { ...(partial as any), projectId: _projectId, createdAt: now, updatedAt: now }
                        await repos.tasks.create(full as any)
                    },
                    createDependency: async (_projectId, partial) => {
                        const now = new Date().toISOString()
                        const full = { ...(partial as any), projectId: _projectId, createdAt: now, updatedAt: now }
                        await repos.dependencies.create(full as any)
                    },
                },
                () => Object.keys(tasks || {}).length > 0,
            )
        }
        seededRef.current = true
    }, [dispatch, projectId, activeProjectId, staffs.length, tasks])

    return <RepositoriesContext.Provider value={reposRef.current!}>{children}</RepositoriesContext.Provider>
}


