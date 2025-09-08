export {}

declare global {
  interface Window {
    cadence: {
      version: string
      storageSync?: {
        getItem: (key: string) => string | null
        setItem: (key: string, value: string) => void
      }
      onCommand?: (handler: (id: string) => void) => () => void
    }
  }
}
