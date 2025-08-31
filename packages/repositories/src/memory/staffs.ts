import type { Staff } from '@cadence/core'
import type { RepositoryBase, WatchEvent } from '../interfaces'

export class MemoryStaffsRepository implements RepositoryBase<Staff> {
    private items = new Map<string, Staff>()
    private listeners = new Set<(e: WatchEvent<Staff>) => void>()

    async initialize(): Promise<void> { }

    async dispose(): Promise<void> {
        this.listeners.clear()
        this.items.clear()
    }

    watch(cb: (e: WatchEvent<Staff>) => void): () => void {
        this.listeners.add(cb)
        // Emit initial snapshot for convenience
        const init = Array.from(this.items.values())
        if (init.length > 0) {
            try { cb({ type: 'upsert', data: init }) } catch { }
        }
        return () => { this.listeners.delete(cb) }
    }

    private emit(e: WatchEvent<Staff>): void {
        this.listeners.forEach((cb) => {
            try { cb(e) } catch { }
        })
    }

    async bulkUpsert(items: Staff[]): Promise<void> {
        const upserts: Staff[] = []
        for (const s of items) {
            const cloned = { ...s }
            this.items.set(cloned.id, cloned)
            upserts.push(cloned)
        }
        if (upserts.length > 0) this.emit({ type: 'upsert', data: upserts })
    }

    async create(item: Staff): Promise<void> { await this.bulkUpsert([item]) }

    async update(id: string, updates: Partial<Staff>): Promise<void> {
        const existing = this.items.get(id)
        if (!existing) return
        const updated = { ...existing, ...updates }
        this.items.set(id, updated)
        this.emit({ type: 'upsert', data: [updated] })
    }

    async delete(id: string): Promise<void> {
        if (this.items.delete(id)) {
            this.emit({ type: 'remove', data: [{ id } as unknown as Staff] })
        }
    }
}


