import React from 'react'
import '../styles/tokens.css'
import { UIStaff } from '../types'

export interface ViewportLike { x: number; y: number; zoom: number }

export interface StaffSidebarProps {
    staffs: UIStaff[]
    viewport: ViewportLike
    width: number
    topMargin: number
    staffSpacing: number
    staffLineSpacing: number
    /** Height of the date header above the canvas to align Y positions */
    headerHeight?: number
    /** Current vertical scale so we can anchor zoom based on the initial value */
    verticalScale?: number
    onAddNote?: () => void
    onOpenMenu?: () => void
    onVerticalZoomChange?: (newZoom: number, anchorLocalY: number, startZoom: number) => void
}

export const StaffSidebar: React.FC<StaffSidebarProps> = ({ staffs, viewport, width, topMargin, staffSpacing, staffLineSpacing, headerHeight, verticalScale, onAddNote, onOpenMenu, onVerticalZoomChange }) => {
    const header = typeof headerHeight === 'number' ? headerHeight : 32

    const containerStyle: React.CSSProperties = {
        width: `${width}px`,
        flexShrink: 0,
        borderRight: '1px solid var(--ui-color-border)',
        background: 'linear-gradient(180deg, var(--ui-surface-1) 0%, var(--ui-surface-1-focus) 100%)',
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        color: 'var(--ui-color-text)',
        zIndex: 2
    }

    const labelContainerStyle: React.CSSProperties = {
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    }

    const dragRef = React.useRef<{ active: boolean; originY: number; originLocalY: number; startZoom: number }>({ active: false, originY: 0, originLocalY: 0, startZoom: verticalScale || 1 })

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 1) return
        try { e.preventDefault() } catch { }
        try { e.stopPropagation() } catch { }
        dragRef.current.active = true
        dragRef.current.originY = e.clientY
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        dragRef.current.originLocalY = e.clientY - rect.top
        dragRef.current.startZoom = verticalScale || 1
    }
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current.active || !onVerticalZoomChange) return
        const dy = e.clientY - dragRef.current.originY
        const factor = Math.pow(1.01, -dy) // up = zoom in (more lines per screen)
        const next = Math.max(0.5, Math.min(3, Math.round(dragRef.current.startZoom * factor * 100) / 100))
        onVerticalZoomChange(next, dragRef.current.originLocalY, dragRef.current.startZoom)
    }
    const onPointerUp = () => { dragRef.current.active = false }

    return (
        <div style={containerStyle} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
            <div style={{ position: 'absolute', top: 4, right: 4, left: 4, display: 'flex', justifyContent: 'space-between', gap: 6, pointerEvents: 'auto' }}>
                <button
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'var(--ui-color-text)', borderRadius: 6, padding: '6px 8px', fontSize: 12, cursor: 'pointer' }}
                    onClick={onAddNote}
                >
                    + Add Note
                </button>
                <button
                    style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.25)', color: 'var(--ui-color-text)', borderRadius: 6, padding: '6px 8px', fontSize: 12, cursor: 'pointer' }}
                    onClick={onOpenMenu}
                    aria-label="Project menu"
                >
                    ⋮
                </button>
            </div>
            <div style={labelContainerStyle}>
                {staffs.map((staff, index) => {
                    const staffStartY = topMargin + index * staffSpacing
                    const staffCenterY = staffStartY + ((staff.numberOfLines - 1) * staffLineSpacing) / 2
                    // Map world -> screen without applying horizontal zoom, to stay centered regardless of zoom level
                    const y = header + (staffCenterY - viewport.y)
                    const itemStyle: React.CSSProperties = {
                        position: 'absolute',
                        top: `${y}px`,
                        left: 0,
                        right: 0,
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0 8px',
                        color: 'var(--ui-color-text)'
                    }
                    const clefSymbol = staff.name.toLowerCase().includes('treble') ? '𝄞' :
                        staff.name.toLowerCase().includes('bass') ? '𝄢' : '♪'
                    return (
                        <div key={staff.id} style={itemStyle}>
                            <span style={{ fontFamily: 'serif', fontSize: 18, lineHeight: 1 }}>{clefSymbol}</span>
                            <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>{staff.name}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}


