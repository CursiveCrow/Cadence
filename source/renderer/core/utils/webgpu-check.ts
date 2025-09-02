/**
 * WebGPU availability checker
 * Utility to check if WebGPU is available and properly initialized
 */
import { devLog } from './devlog'
export interface WebGPUStatus {
  available: boolean
  rendererType: 'webgpu' | 'webgl' | 'unknown'
  message: string
}

/**
 * Check if WebGPU is available in the current environment
 */
export async function checkWebGPUAvailability(): Promise<WebGPUStatus> {
  try {
    // Check if WebGPU API is available
    if (!('gpu' in navigator)) {
      return {
        available: false,
        rendererType: 'webgl',
        message: 'WebGPU API not available in this browser. Using WebGL fallback.'
      }
    }

    // Try to get GPU adapter
    const adapter = await (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter()
    if (!adapter) {
      return {
        available: false,
        rendererType: 'webgl',
        message: 'WebGPU adapter not available. Using WebGL fallback.'
      }
    }

    // WebGPU adapter is available, assume it will work
    // Don't create a test application to avoid duplicate GPU devices
    return {
      available: true,
      rendererType: 'webgpu',
      message: 'WebGPU adapter is available. Will attempt to use WebGPU renderer.'
    }
  } catch (error) {
    devLog.error('WebGPU check error:', error)
    return {
      available: false,
      rendererType: 'unknown',
      message: `Error checking WebGPU: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Log WebGPU status to console with styling
 */
export function logWebGPUStatus(status: WebGPUStatus): void {
  const style = status.available
    ? 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px;'
    : 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px;'

  devLog.info('%c WebGPU Status ', style, status.message)
  devLog.info('Renderer Type:', status.rendererType.toUpperCase())

  if (!status.available) {
    devLog.info('Note: The application will use WebGL as a fallback, which is fully supported.')
  }
}

/**
 * Log the chosen renderer preference vs availability so logs are consistent with runtime.
 */
export function logRendererPreference(status: WebGPUStatus, chosen: 'webgpu' | 'webgl'): void {
  const msg = `Chosen renderer: ${chosen.toUpperCase()} (${status.available ? 'WebGPU available' : 'WebGPU unavailable'})`
  const style = chosen === 'webgpu'
    ? 'background: #2563eb; color: white; padding: 2px 6px; border-radius: 4px;'
    : 'background: #6b7280; color: white; padding: 2px 6px; border-radius: 4px;'
  devLog.info('%c Renderer Preference ', style, msg)
}

