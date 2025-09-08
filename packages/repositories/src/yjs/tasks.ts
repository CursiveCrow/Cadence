import type { Task } from '@cadence/core'
import type { RepositoryBase, WatchEvent } from '../interfaces'
import { getProjectDoc } from '@cadence/crdt'

export class YjsTasksRepository implements RepositoryBase<Task> {
    private unsubscribes = new Map<string, () => void>()
    private listeners = new Set<(e: WatchEvent<Task>) => void>()

    async initialize(): Promise<void> { }

    async dispose(): Promise<void> {
        this.unsubscribes.forEach((u) => { try { u() } catch { } })
        this.unsubscribes.clear()
        this.listeners.clear()
    }

    /**
     * Subscribe to repository change events (upsert/remove) aggregated from Yjs docs
     */
    watch(cb: (e: WatchEvent<Task>) => void): () => void {
        this.listeners.add(cb)
        return () => { this.listeners.delete(cb) }
    }

    /**
     * Attach observers for a specific project document. Multiple calls are idempotent.
     */
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
                    const upserts: Task[] = changedKeys
                        .map((k) => doc.tasks.get(k))
                        .filter(Boolean)
                        .map((t: any) => ({ ...t })) as Task[]
                    if (upserts.length > 0) this.emit({ type: 'upsert', data: upserts })
                }
                if (removedKeys.length > 0) {
                    // For remove we only need ids, but WatchEvent requires T[]; emit empty objects with ids
                    const removals: Task[] = removedKeys.map((id) => ({ id } as unknown as Task))
                    this.emit({ type: 'remove', data: removals })
                }
            } catch { }
        }

        doc.tasks.observe(observer as any)
        const unobserve = () => { try { doc.tasks.unobserve(observer as any) } catch { } }
        this.unsubscribes.set(projectId, unobserve)
        // Emit initial snapshot to seed consumers
        try {
            const initial = Object.values(doc.getTasks()) as Task[]
            if (initial.length > 0) this.emit({ type: 'upsert', data: initial })
        } catch { }
        return unobserve
    }

    private emit(e: WatchEvent<Task>): void {
        this.listeners.forEach((cb) => {
            try { cb(e) } catch { }
        })
    }

    async bulkUpsert(items: Task[]): Promise<void> {
        const byProject = new Map<string, Task[]>()
        for (const t of items) {
            const arr = byProject.get(t.projectId) || []
            arr.push(t)
            byProject.set(t.projectId, arr)
        }
        byProject.forEach((arr, pid) => {
            const doc = getProjectDoc(pid)
            doc.ydoc.transact(() => {
                for (const t of arr) doc.tasks.set(t.id as any, t as any)
            }, 'local')
            // Ensure observer is attached for this project so external mutations are observed
            if (!this.unsubscribes.has(pid)) this.attachProject(pid)
        })
    }
    async create(item: Task): Promise<void> { await this.bulkUpsert([item]) }
    async update(id: string, updates: Partial<Task>): Promise<void> {
        // Determine projectId from existing entry by scanning attached docs
        // For simplicity, require updates to include projectId to avoid cross-doc lookups
        const pid = (updates as any).projectId as string | undefined
        if (!pid) return
        const doc = getProjectDoc(pid)
        const existing = doc.tasks.get(id as any)
        if (!existing) return
        const next = { ...existing, ...updates }
        doc.ydoc.transact(() => {
            doc.tasks.set(id as any, next as any)
        }, 'local')
        if (!this.unsubscribes.has(pid)) this.attachProject(pid)
    }
    async delete(id: string): Promise<void> {
        // projectId is required to locate the right map; attempt best-effort by iterating attached docs
        for (const [pid] of this.unsubscribes.entries()) {
            try {
                const doc = getProjectDoc(pid)
                if (doc.tasks.has(id as any)) {
                    doc.ydoc.transact(() => {
                        doc.tasks.delete(id as any)
                    }, 'local')
                    return
                }
            } catch { }
        }
    }
}

