import type { Dependency } from '@cadence/core'
import type { RepositoryBase, WatchEvent } from '../interfaces'
import { getProjectDoc } from '@cadence/crdt'

export class YjsDependenciesRepository implements RepositoryBase<Dependency> {
    private unsubscribes = new Map<string, () => void>()
    private listeners = new Set<(e: WatchEvent<Dependency>) => void>()

    async initialize(): Promise<void> { }
    async dispose(): Promise<void> { this.unsubscribes.forEach((u) => { try { u() } catch { } }); this.unsubscribes.clear(); this.listeners.clear() }

    watch(cb: (e: WatchEvent<Dependency>) => void): () => void {
        this.listeners.add(cb)
        return () => { this.listeners.delete(cb) }
    }

    attachProject(projectId: string): () => void {
        if (this.unsubscribes.has(projectId)) return this.unsubscribes.get(projectId) as () => void
        const doc = getProjectDoc(projectId)
        const observer = (event: any) => {
            try {
                const changedKeys: string[] = []
                const removedKeys: string[] = []
                event.keys?.forEach?.((change: any, key: string) => {
                    if (change?.action === 'add' || change?.action === 'update') changedKeys.push(key)
                    if (change?.action === 'delete') removedKeys.push(key)
                })

                if (changedKeys.length > 0) {
                    const upserts: Dependency[] = changedKeys
                        .map((k) => doc.dependencies.get(k))
                        .filter(Boolean)
                        .map((d: any) => ({ projectId, ...d })) as Dependency[]
                    if (upserts.length > 0) this.emit({ type: 'upsert', data: upserts })
                }
                if (removedKeys.length > 0) {
                    const removals: Dependency[] = removedKeys.map((id) => ({ id } as unknown as Dependency))
                    this.emit({ type: 'remove', data: removals })
                }
            } catch { }
        }
        doc.dependencies.observe(observer as any)
        const unobserve = () => { try { doc.dependencies.unobserve(observer as any) } catch { } }
        this.unsubscribes.set(projectId, unobserve)
        // Emit initial snapshot to seed consumers
        try {
            const initial = Object.values(doc.getDependencies()).map((d: any) => ({ projectId, ...d })) as Dependency[]
            if (initial.length > 0) this.emit({ type: 'upsert', data: initial })
        } catch { }
        return unobserve
    }

    private emit(e: WatchEvent<Dependency>): void {
        this.listeners.forEach((cb) => { try { cb(e) } catch { } })
    }

    async bulkUpsert(items: Dependency[]): Promise<void> {
        const byProject = new Map<string, Dependency[]>()
        for (const d of items) {
            const arr = byProject.get((d as any).projectId) || []
            arr.push(d)
            byProject.set((d as any).projectId, arr)
        }
        byProject.forEach((arr, pid) => {
            const doc = getProjectDoc(pid)
            doc.ydoc.transact(() => {
                for (const d of arr) doc.dependencies.set(d.id as any, { ...d, projectId: pid } as any)
            }, 'local')
            if (!this.unsubscribes.has(pid)) this.attachProject(pid)
        })
    }
    async create(item: Dependency): Promise<void> { await this.bulkUpsert([item]) }
    async update(id: string, updates: Partial<Dependency>): Promise<void> {
        const pid = (updates as any).projectId as string | undefined
        if (!pid) return
        const doc = getProjectDoc(pid)
        const existing = doc.dependencies.get(id as any)
        if (!existing) return
        const next = { projectId: pid, ...existing, ...updates }
        doc.ydoc.transact(() => {
            doc.dependencies.set(id as any, next as any)
        }, 'local')
        if (!this.unsubscribes.has(pid)) this.attachProject(pid)
    }
    async delete(id: string): Promise<void> {
        for (const [pid] of this.unsubscribes.entries()) {
            try {
                const doc = getProjectDoc(pid)
                if (doc.dependencies.has(id as any)) {
                    doc.ydoc.transact(() => {
                        doc.dependencies.delete(id as any)
                    }, 'local')
                    return
                }
            } catch { }
        }
    }
}

