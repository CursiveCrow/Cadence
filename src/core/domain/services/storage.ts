// Simple storage abstraction; can be extended to file-based in Electron via IPC

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

class LocalStorageService implements StorageLike {
  getItem(key: string): string | null {
    try { return window.localStorage.getItem(key) } catch { return null }
  }
  setItem(key: string, value: string): void {
    try { window.localStorage.setItem(key, value) } catch { /* ignore */ }
  }
}

class ElectronStorageService implements StorageLike {
  getItem(key: string): string | null {
    try {
      // Prefer sync IPC exposed by preload
      const sync = (window as any)?.cadence?.storageSync
      if (sync && typeof sync.getItem === 'function') {
        return sync.getItem(key)
      }
    } catch {}
    return null
  }
  setItem(key: string, value: string): void {
    try {
      const sync = (window as any)?.cadence?.storageSync
      if (sync && typeof sync.setItem === 'function') {
        sync.setItem(key, value)
        return
      }
    } catch {}
  }
}

function detectStorage(): StorageLike {
  try {
    const w = (window as any)
    if (w?.cadence?.storageSync) return new ElectronStorageService()
  } catch {}
  return new LocalStorageService()
}

export const storage: StorageLike = detectStorage()
