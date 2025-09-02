export type EventMap = Record<string, unknown>

export class TypedEventBus<Events extends EventMap> {
  private listeners = new Map<keyof Events, Set<(payload: any) => void>>()

  on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): () => void {
    const set = this.listeners.get(event) ?? new Set()
    set.add(listener as any)
    this.listeners.set(event, set)
    return () => this.off(event, listener)
  }

  off<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): void {
    const set = this.listeners.get(event)
    set?.delete(listener as any)
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const cb of set) {
      try { (cb as any)(payload) } catch { /* no-op */ }
    }
  }
}

// App-level events example
export interface AppEvents extends EventMap {
  'renderer:error': { message: string }
  'selection:changed': { ids: string[] }
}

export const appEvents = new TypedEventBus<AppEvents>()
