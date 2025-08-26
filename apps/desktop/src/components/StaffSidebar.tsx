import React from 'react'
import { Staff } from '@cadence/core'
import { TIMELINE_CONFIG } from '@cadence/renderer'

interface StaffSidebarProps {
  staffs: Staff[]
  viewport: { x: number; y: number; zoom: number }
  width: number
  onAddNote?: () => void
  onOpenMenu?: () => void
}

export const StaffSidebar: React.FC<StaffSidebarProps> = ({ staffs, viewport, width, onAddNote, onOpenMenu }) => {
  const zoom = viewport.zoom || 1
  const topMargin = TIMELINE_CONFIG.TOP_MARGIN
  const staffSpacing = TIMELINE_CONFIG.STAFF_SPACING
  const lineSpacing = TIMELINE_CONFIG.STAFF_LINE_SPACING

  const containerStyle: React.CSSProperties = {
    width: `${width}px`,
    flexShrink: 0,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(180deg, rgba(26,26,26,1) 0%, rgba(20,20,20,1) 100%)',
    position: 'relative',
    height: '100%',
    overflow: 'hidden',
    color: '#ffffff',
    zIndex: 2
  }

  // Compute vertical offset so labels follow viewport pan/zoom vertically, but stay fixed horizontally
  const labelContainerStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    // Allow pointer events so panel can be extended later (e.g., context menus)
  }

  return (
    <div style={containerStyle}>
      {/* Corner controls */}
      <div style={{ position: 'absolute', top: 4, right: 4, left: 4, display: 'flex', justifyContent: 'space-between', gap: 6, pointerEvents: 'auto' }}>
        <button
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 6, padding: '6px 8px', fontSize: 12, cursor: 'pointer' }}
          onClick={onAddNote}
        >
          + Add Note
        </button>
        <button
          style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: 6, padding: '6px 8px', fontSize: 12, cursor: 'pointer' }}
          onClick={onOpenMenu}
          aria-label="Project menu"
        >
          ⋮
        </button>
      </div>
      <div style={labelContainerStyle}>
        {staffs.map((staff, index) => {
          const staffStartY = topMargin + index * staffSpacing
          const staffCenterY = staffStartY + ((staff.numberOfLines - 1) * lineSpacing) / 2
          const y = (staffCenterY - viewport.y) * zoom
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
            color: '#ffffff'
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
