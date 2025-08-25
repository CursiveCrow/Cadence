/**
 * TimelineCanvas component - PixiJS integration with OffscreenCanvas
 * Based on Design.md specification
 */

import React, { useRef, useEffect } from 'react'

export interface TimelineCanvasProps {
  width?: number
  height?: number
  className?: string
  onTaskSelect?: (taskId: string) => void
  onTaskMove?: (taskId: string, newDate: string) => void
}

export function TimelineCanvas({
  width = 800,
  height = 600,
  className = '',
  onTaskSelect,
  onTaskMove,
}: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas dimensions
    canvas.width = width
    canvas.height = height

    // TODO: Initialize rendering worker with OffscreenCanvas
    // This would use the RenderingWorker from @cadence/renderer
    console.log('TimelineCanvas: TODO - Initialize rendering worker with OffscreenCanvas')

    /*
    // Example implementation:
    try {
      const offscreenCanvas = canvas.transferControlToOffscreen()
      workerRef.current = new Worker(new URL('../workers/timeline-worker.ts', import.meta.url))
      
      workerRef.current.postMessage({
        type: 'INIT',
        payload: { canvas: offscreenCanvas, width, height }
      }, [offscreenCanvas])

      workerRef.current.onmessage = (e) => {
        const { type, payload } = e.data
        switch (type) {
          case 'TASK_CLICK':
            if (onTaskSelect) onTaskSelect(payload.taskId)
            break
          case 'TASK_MOVE':
            if (onTaskMove) onTaskMove(payload.taskId, payload.newDate)
            break
        }
      }
    } catch (error) {
      console.error('Failed to setup OffscreenCanvas:', error)
    }
    */

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [width, height, onTaskSelect, onTaskMove])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // TODO: Proxy click events to worker for hit-testing
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'CLICK',
          payload: { x, y }
        })
      }
    }
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className="border border-gray-300 cursor-pointer"
        style={{ width, height }}
      />
      <div className="absolute top-2 right-2 bg-white bg-opacity-80 px-2 py-1 rounded text-sm text-gray-600">
        Timeline Canvas ({width}×{height})
        <br />
        <span className="text-xs">TODO: PixiJS + OffscreenCanvas</span>
      </div>
    </div>
  )
}
