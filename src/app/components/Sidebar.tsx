import React, { useRef, useState } from 'react'
import type { Staff } from '@types'
import { computeDateHeaderHeight } from './DateHeader'
import { TIMELINE } from '@renderer/utils'

interface SidebarProps {
  staffs: Staff[]
  viewport: { x: number; y: number; zoom: number }
  onAddNote: () => void
  onOpenStaffManager: () => void
  onChangeTimeSignature?: (staffId: string, timeSignature: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ staffs, viewport, onAddNote, onOpenStaffManager, onChangeTimeSignature }) => {
  const headerH = computeDateHeaderHeight(viewport.zoom || 1)
  const [tsEditing, setTsEditing] = useState<{ id: string; value: string; rect: DOMRect } | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className="sidebar ui-surface-1 ui-text"
      style={{ position: 'relative', overflow: 'hidden', height: '100%' }}
    >
      {/* Internal top padding that does not create a gap with the header */}
      <div ref={headerRef} className="ui-flex ui-items-center" style={{ marginTop: 12, marginBottom: 8, gap: 6, paddingRight: 0, justifyContent: 'flex-start' }}>
        <strong className="ui-text-sm" style={{ color: '#bcc3d6' }}>Staves</strong>
        <div className="ui-flex ui-gap-2" style={{ marginLeft: 8 }}>
          <button className="ui-btn ui-btn-primary ui-rounded-md ui-text-sm ui-focus-ring" onClick={onAddNote}>+ Add Note</button>
          <button className="ui-btn ui-rounded-md ui-text-sm ui-focus-ring" onClick={onOpenStaffManager}>Manage</button>
        </div>
      </div>

      {/* Staff labels follow their staff centers */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: (headerRef.current?.offsetHeight || 0), pointerEvents: 'none', zIndex: 1, paddingLeft: 12, paddingRight: 12 }}>
        {staffs.map((s, index) => {
          const staffStartY = TIMELINE.TOP_MARGIN + index * TIMELINE.STAFF_SPACING
          const centerY = staffStartY + ((s.numberOfLines - 1) * TIMELINE.STAFF_LINE_SPACING) / 2
          const top = (centerY - viewport.y)
          const ts = (s.timeSignature || '4/4').split('/')
          return (
            <div key={s.id} className="ui-flex ui-items-center" style={{ position: 'absolute', top, left: 0, right: 0, transform: 'translateY(-50%)', gap: 8, paddingRight: 12, justifyContent: 'flex-end' }}>
              <span className="ui-font-700 ui-text-sm" style={{ color: '#bcc3d6', whiteSpace: 'nowrap', textAlign: 'right' }}>{s.name}</span>
              <button
                className="ui-btn ui-btn-ghost ui-rounded-md ui-text-sm"
                style={{ pointerEvents: 'auto' }}
                title="Edit time signature"
                onClick={(e) => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  setTsEditing({ id: s.id, value: s.timeSignature || '4/4', rect: r })
                }}
              >
                <span className="ui-font-700" style={{ marginRight: 6 }}>{ts[0]}</span>
                <span className="ui-text-muted">{ts[1]}</span>
              </button>
            </div>
          )
        })}
      </div>
      {tsEditing && (
        <div style={{ position: 'fixed', top: Math.max(8, tsEditing.rect.top - 6), left: tsEditing.rect.right + 8, zIndex: 1000 }} className="ui-surface-1 ui-shadow ui-rounded-lg ui-p-3">
          <div className="ui-text-sm ui-mb-2 ui-font-700">Time signature</div>
          <input value={tsEditing.value} onChange={(e) => setTsEditing({ ...tsEditing, value: e.target.value })} className="ui-input" />
          <div className="ui-flex ui-gap-2" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
            <button className="ui-btn ui-rounded-md" onClick={() => setTsEditing(null)}>Cancel</button>
            <button className="ui-btn ui-btn-primary ui-rounded-md" onClick={() => { if (tsEditing) { onChangeTimeSignature?.(tsEditing.id, tsEditing.value) }; setTsEditing(null) }}>Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
