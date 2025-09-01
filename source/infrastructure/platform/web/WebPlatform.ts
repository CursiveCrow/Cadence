/**
 * Web Platform Service
 * Handles browser-specific functionality
 */

export class WebPlatformService {
    isWeb(): boolean {
        return typeof window !== 'undefined' && !window.electronAPI
    }

    async saveToLocalStorage(key: string, data: any): Promise<void> {
        try {
            const serialized = JSON.stringify(data)
            localStorage.setItem(key, serialized)
        } catch (error) {
            throw new Error(`Failed to save to localStorage: ${error}`)
        }
    }

    async loadFromLocalStorage<T>(key: string): Promise<T | null> {
        try {
            const item = localStorage.getItem(key)
            if (item === null) {
                return null
            }
            return JSON.parse(item) as T
        } catch (error) {
            throw new Error(`Failed to load from localStorage: ${error}`)
        }
    }

    async removeFromLocalStorage(key: string): Promise<void> {
        localStorage.removeItem(key)
    }

    async clearLocalStorage(): Promise<void> {
        localStorage.clear()
    }

    async saveToIndexedDB(storeName: string, data: any): Promise<void> {
        const db = await this.openIndexedDB()
        const transaction = db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)

        return new Promise((resolve, reject) => {
            const request = store.put(data)

            request.onsuccess = () => resolve()
            request.onerror = () => reject(new Error('Failed to save to IndexedDB'))

            transaction.oncomplete = () => db.close()
        })
    }

    async loadFromIndexedDB<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
        const db = await this.openIndexedDB()
        const transaction = db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)

        return new Promise((resolve, reject) => {
            const request = store.get(key)

            request.onsuccess = () => {
                resolve(request.result || null)
            }
            request.onerror = () => reject(new Error('Failed to load from IndexedDB'))

            transaction.oncomplete = () => db.close()
        })
    }

    async deleteFromIndexedDB(storeName: string, key: IDBValidKey): Promise<void> {
        const db = await this.openIndexedDB()
        const transaction = db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)

        return new Promise((resolve, reject) => {
            const request = store.delete(key)

            request.onsuccess = () => resolve()
            request.onerror = () => reject(new Error('Failed to delete from IndexedDB'))

            transaction.oncomplete = () => db.close()
        })
    }

    async exportAsJSON(data: any, filename: string): Promise<void> {
        const json = JSON.stringify(data, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        URL.revokeObjectURL(url)
    }

    async importFromFile(): Promise<any> {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.json'

            input.onchange = async (event) => {
                const file = (event.target as HTMLInputElement).files?.[0]
                if (!file) {
                    reject(new Error('No file selected'))
                    return
                }

                try {
                    const text = await file.text()
                    const data = JSON.parse(text)
                    resolve(data)
                } catch (error) {
                    reject(new Error(`Failed to parse file: ${error}`))
                }
            }

            input.click()
        })
    }

    copyToClipboard(text: string): Promise<void> {
        return navigator.clipboard.writeText(text)
    }

    async readFromClipboard(): Promise<string> {
        return navigator.clipboard.readText()
    }

    showNotification(title: string, options?: NotificationOptions): void {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(title, options)
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(title, options)
                    }
                })
            }
        }
    }

    setDocumentTitle(title: string): void {
        document.title = title
    }

    enterFullscreen(): Promise<void> {
        const elem = document.documentElement
        if (elem.requestFullscreen) {
            return elem.requestFullscreen()
        }
        return Promise.reject(new Error('Fullscreen not supported'))
    }

    exitFullscreen(): Promise<void> {
        if (document.exitFullscreen) {
            return document.exitFullscreen()
        }
        return Promise.reject(new Error('Exit fullscreen not supported'))
    }

    isFullscreen(): boolean {
        return !!document.fullscreenElement
    }

    getScreenSize(): { width: number; height: number } {
        return {
            width: window.screen.width,
            height: window.screen.height
        }
    }

    getWindowSize(): { width: number; height: number } {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        }
    }

    onWindowResize(callback: () => void): () => void {
        window.addEventListener('resize', callback)
        return () => window.removeEventListener('resize', callback)
    }

    onOnline(callback: () => void): () => void {
        window.addEventListener('online', callback)
        return () => window.removeEventListener('online', callback)
    }

    onOffline(callback: () => void): () => void {
        window.addEventListener('offline', callback)
        return () => window.removeEventListener('offline', callback)
    }

    isOnline(): boolean {
        return navigator.onLine
    }

    private async openIndexedDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('CadenceDB', 1)

            request.onerror = () => reject(new Error('Failed to open IndexedDB'))
            request.onsuccess = () => resolve(request.result)

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('projects')) {
                    db.createObjectStore('projects', { keyPath: 'id' })
                }
                if (!db.objectStoreNames.contains('tasks')) {
                    db.createObjectStore('tasks', { keyPath: 'id' })
                }
                if (!db.objectStoreNames.contains('dependencies')) {
                    db.createObjectStore('dependencies', { keyPath: 'id' })
                }
                if (!db.objectStoreNames.contains('staffs')) {
                    db.createObjectStore('staffs', { keyPath: 'id' })
                }
            }
        })
    }
}
