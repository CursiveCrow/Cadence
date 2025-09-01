import { useState, useCallback, useRef } from 'react'

const MIN_WIDTH = 80
const MAX_WIDTH = 260
const DEFAULT_WIDTH = 120

export function useResizableSidebar() {
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try { const v = localStorage.getItem('cadence.sidebar.width'); return v ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parseInt(v, 10))) : DEFAULT_WIDTH } catch { return DEFAULT_WIDTH }
  })
  const resizerRef = useRef<HTMLDivElement | null>(null)
  const resizingRef = useRef<boolean>(false)
  const startXRef = useRef<number>(0)
  const startWidthRef = useRef<number>(DEFAULT_WIDTH)
  const clampSidebarWidth = useCallback((w: number) => Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w)), [])
  const onMouseMoveResize = useCallback((e: MouseEvent) => { if (!resizingRef.current) return; const dx = e.clientX - startXRef.current; const next = clampSidebarWidth(startWidthRef.current + dx); setSidebarWidth(next); try { localStorage.setItem('cadence.sidebar.width', String(next)) } catch {} }, [clampSidebarWidth])
  const endResize = useCallback(() => { if (!resizingRef.current) return; resizingRef.current = false; window.removeEventListener('mousemove', onMouseMoveResize, true); window.removeEventListener('mouseup', endResize, true); try { document.body.style.cursor = '' } catch {} }, [onMouseMoveResize])
  const beginResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => { e.preventDefault(); resizingRef.current = true; startXRef.current = e.clientX; startWidthRef.current = sidebarWidth; window.addEventListener('mousemove', onMouseMoveResize, true); window.addEventListener('mouseup', endResize, true); try { document.body.style.cursor = 'col-resize' } catch {} }, [sidebarWidth, onMouseMoveResize, endResize])
  const resetSidebarWidth = useCallback(() => { setSidebarWidth(DEFAULT_WIDTH); try { localStorage.setItem('cadence.sidebar.width', String(DEFAULT_WIDTH)) } catch {} }, [])
  return { sidebarWidth, resizerRef, beginResize, resetSidebarWidth }
}

