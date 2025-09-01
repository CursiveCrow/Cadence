export interface PersistenceProvider { init(): Promise<void>; saveUpdate(docId: string, update: Uint8Array): Promise<void>; loadUpdates(docId: string): Promise<Uint8Array[]>; saveSnapshot(docId: string, snapshot: Uint8Array): Promise<void>; loadSnapshot(docId: string): Promise<Uint8Array | null> }

class MemoryProvider implements PersistenceProvider {
  private updates = new Map<string, Uint8Array[]>(); private snapshots = new Map<string, Uint8Array>()
  async init(): Promise<void> { /* no-op */ }
  async saveUpdate(docId: string, update: Uint8Array): Promise<void> { const list = this.updates.get(docId) || []; list.push(update); this.updates.set(docId, list) }
  async loadUpdates(docId: string): Promise<Uint8Array[]> { return [...(this.updates.get(docId) || [])] }
  async saveSnapshot(docId: string, snapshot: Uint8Array): Promise<void> { this.snapshots.set(docId, snapshot) }
  async loadSnapshot(docId: string): Promise<Uint8Array | null> { return this.snapshots.get(docId) || null }
}

let provider: PersistenceProvider | null = null
export function getPersistenceProvider(): PersistenceProvider { if (!provider) provider = new MemoryProvider(); return provider }
export async function initializePersistence(): Promise<void> { await getPersistenceProvider().init() }

