/**
 * Bun Runtime Optimizations
 * Leverages Bun's native APIs for better performance
 */

import { Database } from "bun:sqlite"

export class BunOptimizedServices {
    private cache: Database
    private memoryCache: Map<string, any> = new Map()

    constructor() {
        // Use Bun's native SQLite for local caching
        this.cache = new Database(":memory:")
        this.initializeCache()
    }

    private initializeCache(): void {
        // Create cache tables
        this.cache.run(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT,
        expires INTEGER
      )
    `)

        this.cache.run(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        value REAL,
        timestamp INTEGER
      )
    `)
    }

    /**
     * Fast cache operations using Bun's SQLite
     */
    async cacheSet(key: string, value: any, ttl: number = 3600): Promise<void> {
        const expires = Date.now() + (ttl * 1000)
        const serialized = JSON.stringify(value)

        this.cache.run(
            "INSERT OR REPLACE INTO cache (key, value, expires) VALUES (?, ?, ?)",
            [key, serialized, expires]
        )

        // Also store in memory for ultra-fast access
        this.memoryCache.set(key, { value, expires })
    }

    async cacheGet<T>(key: string): Promise<T | null> {
        // Check memory cache first
        const memCached = this.memoryCache.get(key)
        if (memCached && memCached.expires > Date.now()) {
            return memCached.value
        }

        // Check SQLite cache
        const result = this.cache.query<{ value: string; expires: number }, [string]>(
            "SELECT value, expires FROM cache WHERE key = ? AND expires > ?",
        ).get(key, Date.now())

        if (result) {
            const value = JSON.parse(result.value)
            this.memoryCache.set(key, { value, expires: result.expires })
            return value
        }

        return null
    }

    /**
     * Leverage Bun's fast subprocess spawning for heavy computations
     */
    async runHeavyComputation<T>(workerPath: string, data: any): Promise<T> {
        const subprocess = Bun.spawn({
            cmd: ["bun", "run", workerPath],
            stdin: "pipe",
            stdout: "pipe",
        })

        // Send data to subprocess
        const writer = subprocess.stdin.getWriter()
        await writer.write(new TextEncoder().encode(JSON.stringify(data)))
        await writer.close()

        // Read result
        const output = await new Response(subprocess.stdout).text()
        return JSON.parse(output)
    }

    /**
     * Use Bun's native HTTP server for development API
     */
    startDevServer(port: number = 3001): void {
        Bun.serve({
            port,
            async fetch(request) {
                const url = new URL(request.url)

                // Handle API routes
                if (url.pathname.startsWith('/api/')) {
                    return this.handleApiRequest(request)
                }

                // Serve static files with Bun's fast file I/O
                const file = Bun.file(`./dist${url.pathname}`)
                if (await file.exists()) {
                    return new Response(file)
                }

                // 404
                return new Response("Not Found", { status: 404 })
            },

            // WebSocket support for real-time updates
            websocket: {
                open(ws) {
                    console.log("WebSocket opened")
                },
                message(ws, message) {
                    // Handle real-time collaboration messages
                    ws.send(message)
                },
                close(ws) {
                    console.log("WebSocket closed")
                },
            },
        })

        console.log(`Bun dev server running on http://localhost:${port}`)
    }

    private async handleApiRequest(request: Request): Promise<Response> {
        const url = new URL(request.url)
        const path = url.pathname.replace('/api/', '')

        try {
            switch (path) {
                case 'health':
                    return Response.json({ status: 'ok', runtime: 'bun', version: Bun.version })

                case 'metrics':
                    const metrics = this.cache.query("SELECT * FROM metrics ORDER BY timestamp DESC LIMIT 100").all()
                    return Response.json(metrics)

                default:
                    return new Response("Not Found", { status: 404 })
            }
        } catch (error) {
            return Response.json({ error: String(error) }, { status: 500 })
        }
    }

    /**
     * Track performance metrics
     */
    trackMetric(name: string, value: number): void {
        this.cache.run(
            "INSERT INTO metrics (name, value, timestamp) VALUES (?, ?, ?)",
            [name, value, Date.now()]
        )
    }

    /**
     * Fast file operations with Bun
     */
    async saveFile(path: string, content: string): Promise<void> {
        await Bun.write(path, content)
    }

    async readFile(path: string): Promise<string> {
        const file = Bun.file(path)
        return await file.text()
    }

    async fileExists(path: string): Promise<boolean> {
        const file = Bun.file(path)
        return await file.exists()
    }

    /**
     * Use Bun's fast hashing
     */
    hash(data: string): string {
        const hasher = new Bun.CryptoHasher("sha256")
        hasher.update(data)
        return hasher.digest("hex")
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.cache.close()
        this.memoryCache.clear()
    }
}

/**
 * Worker pool for parallel processing
 */
export class BunWorkerPool {
    private workers: Worker[] = []
    private taskQueue: Array<{ id: string; task: any; resolve: Function; reject: Function }> = []
    private busyWorkers = new Set<Worker>()

    constructor(private workerPath: string, private poolSize: number = 4) {
        this.initializeWorkers()
    }

    private initializeWorkers(): void {
        for (let i = 0; i < this.poolSize; i++) {
            const worker = new Worker(this.workerPath)

            worker.addEventListener("message", (event) => {
                this.handleWorkerMessage(worker, event.data)
            })

            worker.addEventListener("error", (error) => {
                console.error("Worker error:", error)
                this.busyWorkers.delete(worker)
                this.processNextTask()
            })

            this.workers.push(worker)
        }
    }

    private handleWorkerMessage(worker: Worker, data: any): void {
        // Mark worker as available
        this.busyWorkers.delete(worker)

        // Process result
        const task = this.taskQueue.find(t => t.id === data.id)
        if (task) {
            this.taskQueue = this.taskQueue.filter(t => t.id !== data.id)

            if (data.error) {
                task.reject(new Error(data.error))
            } else {
                task.resolve(data.result)
            }
        }

        // Process next task
        this.processNextTask()
    }

    private processNextTask(): void {
        if (this.taskQueue.length === 0) return

        const availableWorker = this.workers.find(w => !this.busyWorkers.has(w))
        if (!availableWorker) return

        const task = this.taskQueue.shift()
        if (!task) return

        this.busyWorkers.add(availableWorker)
        availableWorker.postMessage({ id: task.id, task: task.task })
    }

    async execute<T>(task: any): Promise<T> {
        return new Promise((resolve, reject) => {
            const id = crypto.randomUUID()
            this.taskQueue.push({ id, task, resolve, reject })
            this.processNextTask()
        })
    }

    terminate(): void {
        for (const worker of this.workers) {
            worker.terminate()
        }
        this.workers = []
        this.taskQueue = []
        this.busyWorkers.clear()
    }
}

// Export singleton instance
export const bunOptimized = new BunOptimizedServices()
