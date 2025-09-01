import React, { useState } from 'react'
import '../styles/tokens.css'
import '../styles/ui.css'
import { Staff } from '@cadence/core'
import { TimeSignaturePopover } from './TimeSignaturePopover'

export interface ViewportLike { x: number; y: number; zoom: number }
export interface StaffSidebarProps {
  staffs: Staff[]
  viewport: ViewportLike
  width: number
  topMargin: number
  staffSpacing: number
  staffLineSpacing: number
  headerHeight?: number
  verticalScale?: number
  onAddNote?: () => void
  onOpenMenu?: () => void
  onVerticalZoomChange?: (newZoom: number, anchorLocalY: number, startZoom: number) => void
  onChangeTimeSignature?: (staffId: string, timeSignature: string) => void
}

export const StaffSidebar: React.FC<StaffSidebarProps> = ({ staffs, viewport, width, topMargin, staffSpacing, staffLineSpacing, headerHeight, verticalScale, onAddNote, onOpenMenu, onVerticalZoomChange, onChangeTimeSignature }) => {
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const header = typeof headerHeight === 'number' ? headerHeight : 32
  const containerStyle: React.CSSProperties = { width: `${width}px`, flexShrink: 0, position: 'relative', height: '100%', overflow: 'hidden', zIndex: 2 }
  const labelContainerStyle: React.CSSProperties = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }
  const dragRef = React.useRef<{ active: boolean; originY: number; originLocalY: number; startZoom: number }>({ active: false, originY: 0, originLocalY: 0, startZoom: verticalScale || 1 })
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => { if (e.button !== 1) return; try { e.preventDefault() } catch {}; try { e.stopPropagation() } catch {}; dragRef.current.active = true; dragRef.current.originY = e.clientY; const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); dragRef.current.originLocalY = e.clientY - rect.top; dragRef.current.startZoom = verticalScale || 1 }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => { if (!dragRef.current.active || !onVerticalZoomChange) return; const dy = e.clientY - dragRef.current.originY; const factor = Math.pow(1.01, -dy); const next = Math.max(0.5, Math.min(3, Math.round((verticalScale || dragRef.current.startZoom) * factor * 100) / 100)); onVerticalZoomChange(next, dragRef.current.originLocalY, dragRef.current.startZoom) }
  const onPointerUp = () => { dragRef.current.active = false }
  const handleTimeSignatureClick = (e: React.MouseEvent<HTMLButtonElement>, staff: Staff) => { e.stopPropagation(); setEditingStaff(staff); setPopoverAnchor(e.currentTarget) }
  const handleClosePopover = () => { setPopoverAnchor(null); setEditingStaff(null) }
  const handleSaveTimeSignature = (newValue: string) => { if (editingStaff && onChangeTimeSignature) onChangeTimeSignature(editingStaff.id, newValue) }
  return (
    <div className="ui-surface-1 ui-border-r ui-text" style={containerStyle} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <div className="ui-absolute ui-flex ui-justify-between ui-items-center" style={{ top: 4, right: 4, left: 4, gap: 6, pointerEvents: 'auto' }}>
        <button className="ui-btn ui-btn-primary ui-rounded-md ui-text-sm ui-focus-ring" onClick={onAddNote}>+ Add Note</button>
        <button className="ui-btn ui-rounded-md ui-text-sm ui-focus-ring" onClick={onOpenMenu} aria-label="Project menu">⋮</button>
      </div>
      <div style={labelContainerStyle}>
        {staffs.map((staff, index) => {
          const staffStartY = topMargin + index * staffSpacing
          const staffCenterY = staffStartY + ((staff.numberOfLines - 1) * staffLineSpacing) / 2
          const y = (header || 0) + (staffCenterY - viewport.y)
          const itemStyle: React.CSSProperties = { position: 'absolute', top: `${y}px`, left: 0, right: 0, transform: 'translateY(-50%)', padding: '0 8px' }
          const clefSymbol = staff.name.toLowerCase().includes('treble') ? '𝄞' : staff.name.toLowerCase().includes('bass') ? '𝄢' : '♪'
          const ts = staff.timeSignature
          const [tsTop, tsBottom] = (ts && ts.includes('/')) ? ts.split('/') : ['4', '4']
          return (
            <div key={staff.id} className="ui-flex ui-items-center ui-gap-2 ui-text" style={itemStyle}>
              <span style={{ fontFamily: 'serif', fontSize: 18, lineHeight: 1 }}>{clefSymbol}</span>
              <span className="ui-font-700 ui-text-md" style={{ whiteSpace: 'nowrap' }}>{staff.name}</span>
              <div style={{ flex: 1 }} />
              <button className="ui-timesig" aria-label={`Time signature ${tsTop}/${tsBottom}`} onClick={(e) => handleTimeSignatureClick(e, staff)} title="Edit time signature" style={{ cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}>
                <span className="ui-timesig-num">{tsTop}</span>
                <span className="ui-timesig-den">{tsBottom}</span>
              </button>
            </div>
          )
        })}
      </div>
      {editingStaff && (
        <TimeSignaturePopover anchorElement={popoverAnchor} initialValue={editingStaff.timeSignature || '4/4'} onClose={handleClosePopover} onSave={handleSaveTimeSignature} />
      )}
    </div>
  )
}

