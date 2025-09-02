/**
 * SQLite WASM + OPFS Persistence Provider for Yjs
 * Based on Design.md specification
 */

// Note: This is a placeholder for the SQLite WASM persistence implementation
// The actual implementation would require the @sqlite.org/sqlite-wasm package

export interface PersistenceProvider {
  init(): Promise<void>
  saveUpdate(docId: string, update: Uint8Array): Promise<void>
  loadUpdates(docId: string): Promise<Uint8Array[]>
  saveSnapshot(docId: string, snapshot: Uint8Array): Promise<void>
  loadSnapshot(docId: string): Promise<Uint8Array | null>
}

/**
 * SQLite WASM + OPFS Persistence Provider
 * Implements the schema from Design.md:
 * - projects table for metadata
 * - crdt_updates table for Yjs update stream
 * - crdt_snapshots table for optimized loading
 */
class SQLiteOPFSProvider implements PersistenceProvider {
  private db: any = null
  private ready = false
  private memoryUpdates = new Map<string, Uint8Array[]>()
  private memorySnapshots = new Map<string, Uint8Array>()

  async init(): Promise<void> {
    if (this.ready) return
    const t0 = typeof performance !== 'undefined' && performance.now ? performance.now() : 0
    try {
      // Dynamically import the SQLite WASM module. Use a non-literal specifier
      // so Vite dev's import-analysis doesn't try to resolve it.
      const modId = '@sqlite.org' + '/sqlite-wasm'
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - module provides its own types at runtime
      const sqlite3InitModule = (await import(/* @vite-ignore */ modId)).default
      const sqlite3 = await sqlite3InitModule()
      // Use OPFS VFS if available
      const db = new sqlite3.oo1.DB('file:cadence.db?vfs=opfs', 'c')
      db.exec(`CREATE TABLE IF NOT EXISTS crdt_updates (
        doc_id TEXT NOT NULL,
        clock INTEGER NOT NULL,
        update_data BLOB NOT NULL,
        PRIMARY KEY (doc_id, clock)
      );`)
      db.exec(`CREATE TABLE IF NOT EXISTS crdt_snapshots (
        doc_id TEXT PRIMARY KEY,
        snapshot_data BLOB NOT NULL
      );`)
      this.db = db
      this.ready = true
      const t1 = typeof performance !== 'undefined' && performance.now ? performance.now() : 0
      try {
        console.info(`[CRDT] SQLite WASM initialized in ${Math.round(t1 - t0)}ms`)
      } catch {}
    } catch (e) {
      try {
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        console.warn('[CRDT] SQLite WASM init failed; falling back to in-memory persistence.', {
          error: (e as any)?.message || String(e),
          name: (e as any)?.name,
          ua,
        })
      } catch {
        /* ignore */
      }
      this.db = null
      this.ready = true
    }
  }

  async saveUpdate(docId: string, update: Uint8Array): Promise<void> {
    if (!this.ready) await this.init()
    if (this.db) {
      // Compute next clock for this doc using a simple SELECT
      let nextClock = this._selectNextClockFallback(docId)
      try {
        const sel = this.db.prepare(
          `SELECT IFNULL(MAX(clock), -1) + 1 AS nextClock FROM crdt_updates WHERE doc_id = ?`
        )
        sel.bind([docId])
        if (sel.step()) {
          const row = sel.getAsObject()
          const val = (row as any).nextClock
          if (typeof val === 'number' && Number.isFinite(val)) nextClock = val
        }
        sel.finalize()
      } catch {}
      const stmt = this.db.prepare(
        `INSERT INTO crdt_updates (doc_id, clock, update_data) VALUES (?, ?, ?)`
      )
      stmt.bind([docId, nextClock, update])
      stmt.step()
      stmt.finalize()
      return
    }
    // Fallback: memory store
    const list = this.memoryUpdates.get(docId) || []
    list.push(update)
    this.memoryUpdates.set(docId, list)
  }

  async loadUpdates(docId: string): Promise<Uint8Array[]> {
    if (!this.ready) await this.init()
    if (this.db) {
      const stmt = this.db.prepare(
        `SELECT update_data FROM crdt_updates WHERE doc_id = ? ORDER BY clock ASC`
      )
      stmt.bind([docId])
      const results: Uint8Array[] = []
      while (stmt.step()) {
        const row = stmt.getAsObject()
        // Depending on WASM build, blob may come as Uint8Array or as a JS object
        const data = row.update_data as Uint8Array
        results.push(data)
      }
      stmt.finalize()
      return results
    }
    return [...(this.memoryUpdates.get(docId) || [])]
  }

  async saveSnapshot(docId: string, snapshot: Uint8Array): Promise<void> {
    if (!this.ready) await this.init()
    if (this.db) {
      const stmt = this.db.prepare(
        `REPLACE INTO crdt_snapshots (doc_id, snapshot_data) VALUES (?, ?)`
      )
      stmt.bind([docId, snapshot])
      stmt.step()
      stmt.finalize()
      return
    }
    this.memorySnapshots.set(docId, snapshot)
  }

  async loadSnapshot(docId: string): Promise<Uint8Array | null> {
    if (!this.ready) await this.init()
    if (this.db) {
      const stmt = this.db.prepare(`SELECT snapshot_data FROM crdt_snapshots WHERE doc_id = ?`)
      stmt.bind([docId])
      let result: Uint8Array | null = null
      if (stmt.step()) {
        const row = stmt.getAsObject()
        result = row.snapshot_data as Uint8Array
      }
      stmt.finalize()
      return result
    }
    return this.memorySnapshots.get(docId) || null
  }

  private _selectNextClockFallback(docId: string): number {
    const arr = this.memoryUpdates.get(docId) || []
    return arr.length
  }
}

// Global provider instance
let provider: PersistenceProvider | null = null

export function getPersistenceProvider(): PersistenceProvider {
  if (!provider) {
    provider = new SQLiteOPFSProvider()
  }
  return provider
}

export async function initializePersistence(): Promise<void> {
  const persistenceProvider = getPersistenceProvider()
  await persistenceProvider.init()
}
