/**
 * Persistence controller encapsulates persistence lifecycle per project (SRP: dedicated file)
 */

import * as Y from 'yjs'
import { getPersistenceProvider, initializePersistence } from './persistence'

export class ProjectPersistenceController {
    private bound = false

    constructor(private readonly projectId: string, private readonly ydoc: Y.Doc) { }

    async init(): Promise<void> {
        await initializePersistence()
        const provider = getPersistenceProvider()
        // Load historical updates
        const updates = await provider.loadUpdates(this.projectId)
        for (const u of updates) {
            try { Y.applyUpdate(this.ydoc, u) } catch { }
        }
        // Bind persister once
        if (!this.bound) {
            this.ydoc.on('update', (update: Uint8Array) => {
                provider.saveUpdate(this.projectId, update).catch(() => { })
            })
            this.bound = true
        }
    }
}


