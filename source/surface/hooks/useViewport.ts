/**
 * useViewport Hook
 * React hook for managing viewport state using core domain services
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { ViewportService, ViewportState, ViewportBounds } from '../../core/domain/services/ViewportService'
import { InteractionService, InteractionConfig } from '../../core/domain/services/InteractionService'

export interface UseViewportOptions {
    initialState?: Partial<ViewportState>
    bounds?: Partial<ViewportBounds>
    interactionConfig?: Partial<InteractionConfig>
    onViewportChange?: (state: ViewportState) => void
}

export interface UseViewportResult {
    viewport: ViewportState
    setViewport: (state: Partial<ViewportState>) => void
    pan: (deltaX: number, deltaY: number) => void
    zoom: (factor: number, centerX: number, centerY: number) => void
    reset: () => void
    fitToContent: (contentWidth: number, contentHeight: number, viewWidth: number, viewHeight: number) => void

    // Interaction handlers
    startPan: (x: number, y: number) => void
    updatePan: (x: number, y: number) => void
    endPan: () => void
    handleWheel: (deltaY: number, centerX: number, centerY: number, ctrlKey?: boolean) => void

    // State
    isPanning: boolean
    isZooming: boolean

    // Services (for advanced usage)
    viewportService: ViewportService
    interactionService: InteractionService
}

export function useViewport(options: UseViewportOptions = {}): UseViewportResult {
    // Create service instances
    const viewportServiceRef = useRef<ViewportService>()
    const interactionServiceRef = useRef<InteractionService>()

    if (!viewportServiceRef.current) {
        viewportServiceRef.current = new ViewportService()

        // Set initial state
        if (options.initialState) {
            viewportServiceRef.current.setState(options.initialState)
        }

        // Set bounds
        if (options.bounds) {
            viewportServiceRef.current.setBounds(options.bounds)
        }
    }

    if (!interactionServiceRef.current) {
        interactionServiceRef.current = new InteractionService(
            viewportServiceRef.current,
            options.interactionConfig,
            {
                onViewportChange: (state) => {
                    setViewportState(state)
                    options.onViewportChange?.(state)
                },
                onPanStart: () => setIsPanning(true),
                onPanEnd: () => setIsPanning(false),
                onZoomStart: () => setIsZooming(true),
                onZoomEnd: () => setIsZooming(false)
            }
        )
    }

    // React state
    const [viewportState, setViewportState] = useState<ViewportState>(() =>
        viewportServiceRef.current!.getState()
    )
    const [isPanning, setIsPanning] = useState(false)
    const [isZooming, setIsZooming] = useState(false)

    // Update config when it changes
    useEffect(() => {
        if (options.interactionConfig && interactionServiceRef.current) {
            interactionServiceRef.current.updateConfig(options.interactionConfig)
        }
    }, [options.interactionConfig])

    // Viewport methods
    const setViewport = useCallback((state: Partial<ViewportState>) => {
        const newState = viewportServiceRef.current!.setState(state)
        setViewportState(newState)
        options.onViewportChange?.(newState)
    }, [options])

    const pan = useCallback((deltaX: number, deltaY: number) => {
        const newState = viewportServiceRef.current!.pan(deltaX, deltaY)
        setViewportState(newState)
        options.onViewportChange?.(newState)
    }, [options])

    const zoom = useCallback((factor: number, centerX: number, centerY: number) => {
        const newState = viewportServiceRef.current!.zoom(factor, centerX, centerY)
        setViewportState(newState)
        options.onViewportChange?.(newState)
    }, [options])

    const reset = useCallback(() => {
        const newState = viewportServiceRef.current!.reset()
        setViewportState(newState)
        options.onViewportChange?.(newState)
    }, [options])

    const fitToContent = useCallback((
        contentWidth: number,
        contentHeight: number,
        viewWidth: number,
        viewHeight: number
    ) => {
        const newState = viewportServiceRef.current!.fitToBounds(
            contentWidth,
            contentHeight,
            viewWidth,
            viewHeight
        )
        setViewportState(newState)
        options.onViewportChange?.(newState)
    }, [options])

    // Interaction methods
    const startPan = useCallback((x: number, y: number) => {
        interactionServiceRef.current!.startPan(x, y)
    }, [])

    const updatePan = useCallback((x: number, y: number) => {
        interactionServiceRef.current!.updatePan(x, y)
    }, [])

    const endPan = useCallback(() => {
        interactionServiceRef.current!.endPan()
    }, [])

    const handleWheel = useCallback((
        deltaY: number,
        centerX: number,
        centerY: number,
        ctrlKey?: boolean
    ) => {
        interactionServiceRef.current!.handleWheel(deltaY, centerX, centerY, ctrlKey)
    }, [])

    return {
        viewport: viewportState,
        setViewport,
        pan,
        zoom,
        reset,
        fitToContent,
        startPan,
        updatePan,
        endPan,
        handleWheel,
        isPanning,
        isZooming,
        viewportService: viewportServiceRef.current!,
        interactionService: interactionServiceRef.current!
    }
}
