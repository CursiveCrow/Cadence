import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Staff } from '@types'
import { computeScaledTimeline, staffCenterY } from '@renderer'

interface SidebarProps {
  staffs: Staff[]
  viewport: { x: number; y: number; zoom: number }
  verticalScale?: number
  onAddNote: () => void
  onOpenStaffManager: () => void
  onChangeTimeSignature?: (staffId: string, timeSignature: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ staffs, viewport, verticalScale = 1, onAddNote, onOpenStaffManager, onChangeTimeSignature }) => {
  const [tsEditing, setTsEditing] = useState<{ id: string; value: string; rect: DOMRect } | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const scaled = useMemo(() => computeScaledTimeline(verticalScale || 1), [verticalScale])

  // Drive sheen and rim highlight with pointer (light source)
  useEffect(() => {
    const host = headerRef.current?.closest('.sidebar') as HTMLElement | null
    if (!host) return

    if (!host.style.getPropertyValue('--sheen-x')) {
      const r = host.getBoundingClientRect()
      host.style.setProperty('--sheen-x', `${Math.round(r.width * 0.33)}px`)
      host.style.setProperty('--sheen-y', `${Math.round(r.height * 0.22)}px`)
    }

    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      const localX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
      const localY = Math.max(0, Math.min(rect.height, e.clientY - rect.top))

      const nearestX = rect.left + localX
      const nearestY = rect.top + localY
      const dx = e.clientX - nearestX
      const dy = e.clientY - nearestY
      const dist = Math.hypot(dx, dy)

      const strength = Math.exp(-dist / 420)
      const alpha1 = Math.min(0.045, 0.012 + 0.03 * strength)
      const alpha2 = Math.min(0.02, 0.004 + 0.012 * strength)
      const sheenPeak = Math.min(0.08, 0.018 + 0.12 * strength)
      const glintSize = Math.max(6, Math.min(12, 10 - dist / 80))
      const lobeW = Math.max(40, Math.min(80, 60 + (dx / 6)))
      const lobeH = Math.max(24, Math.min(56, 36 + (dy / 8)))
      const lobeOffsetX = Math.max(4, Math.min(14, 8 + dx / 12))
      const lobeOffsetY = Math.max(2, Math.min(10, 4 + dy / 12))
      // place glint below/to the right of cursor so it's under the pointer, not at the tip
      const glintOffsetX = Math.max(6, Math.min(16, 10 + dx / 18))
      const glintOffsetY = Math.max(8, Math.min(20, 12 + dy / 18))

      const cx = localX - rect.width * 0.35
      const cy = localY - rect.height * 0.2
      const angle = Math.atan2(cy, cx) * (180 / Math.PI)
      const rot = (angle / 3)

      host.style.setProperty('--sheen-x', `${localX}px`)
      host.style.setProperty('--sheen-y', `${localY}px`)
      host.style.setProperty('--sheen-alpha-1', alpha1.toFixed(3))
      host.style.setProperty('--sheen-alpha-2', alpha2.toFixed(3))
      host.style.setProperty('--sheen-peak', sheenPeak.toFixed(3))
      // absorption ring strength loosely tied to glint strength
      const absorb = Math.max(0.015, Math.min(0.05, sheenPeak * 0.6))
      host.style.setProperty('--absorb-alpha', absorb.toFixed(3))
      host.style.setProperty('--glint-size', `${glintSize.toFixed(0)}px`)
      host.style.setProperty('--lobe-w', `${lobeW.toFixed(0)}px`)
      host.style.setProperty('--lobe-h', `${lobeH.toFixed(0)}px`)
      host.style.setProperty('--lobe-offset-x', `${lobeOffsetX.toFixed(0)}px`)
      host.style.setProperty('--lobe-offset-y', `${lobeOffsetY.toFixed(0)}px`)
      host.style.setProperty('--glint-offset-x', `${glintOffsetX.toFixed(0)}px`)
      host.style.setProperty('--glint-offset-y', `${glintOffsetY.toFixed(0)}px`)
      host.style.setProperty('--sheen-rot', `${rot.toFixed(1)}deg`)

      const streak = Math.max(0.003, Math.min(0.014, alpha1 * 0.20))
      host.style.setProperty('--streak-alpha', streak.toFixed(3))

      const distFromRight = Math.max(0, rect.width - localX)
      const edgeProximity = Math.exp(-distFromRight / 60)
      const edgeAlpha = Math.min(0.16, 0.014 + 0.18 * strength * edgeProximity)
      host.style.setProperty('--edge-alpha', edgeAlpha.toFixed(3))
      // Slightly brighter inner peak at the rim center
      const edgePeak = Math.min(0.26, edgeAlpha * 1.45)
      host.style.setProperty('--edge-peak', edgePeak.toFixed(3))
    }

    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <>
      {/* Internal top padding that does not create a gap with the header */}
      <div ref={headerRef} className="sidebar-header">
        <strong className="ui-text-sm sidebar-label-name">Staves</strong>
        <div className="ui-flex ui-gap-2 sidebar-controls">
          <button className="ui-btn ui-btn-primary ui-rounded-md ui-text-sm ui-focus-ring" onClick={onAddNote}>+ Add Note</button>
          <button className="ui-btn ui-rounded-md ui-text-sm ui-focus-ring" onClick={onOpenStaffManager}>Manage</button>
        </div>
      </div>

      {/* Staff labels follow their staff centers */}
      <div className="sidebar-labels-layer" style={{ top: (headerRef.current?.offsetHeight || 0) }}>
        {staffs.map((s, index) => {
          const yTop = (scaled.topMargin - viewport.y) + index * scaled.staffSpacing
          const centerY = staffCenterY(yTop, (s.numberOfLines - 1), scaled.lineSpacing)
          const top = centerY
          const ts = (s.timeSignature || '4/4').split('/')
          return (
            <div key={s.id} className="sidebar-label-item" style={{ top }}>
              <span className="ui-font-700 ui-text-sm sidebar-label-name">{s.name}</span>
              <button
                className="ui-btn ui-btn-ghost ui-rounded-md ui-text-sm ui-pointer-auto"
                title="Edit time signature"
                onClick={(e) => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  setTsEditing({ id: s.id, value: s.timeSignature || '4/4', rect: r })
                }}
              >
                <span className="ui-font-700 ui-mr-1-5">{ts[0]}</span>
                <span className="ui-text-muted">{ts[1]}</span>
              </button>
            </div>
          )
        })}
      </div>
      {tsEditing && (
        <div className="ui-surface-1 ui-shadow ui-rounded-lg ui-p-3 ui-fixed ui-z-1000" style={{ top: Math.max(8, tsEditing.rect.top - 6), left: tsEditing.rect.right + 8 }}>
          <div className="ui-text-sm ui-mb-2 ui-font-700">Time signature</div>
          <input value={tsEditing.value} onChange={(e) => setTsEditing({ ...tsEditing, value: e.target.value })} className="ui-input" />
          <div className="ui-flex ui-gap-2 ui-mt-2 ui-justify-end">
            <button className="ui-btn ui-rounded-md" onClick={() => setTsEditing(null)}>Cancel</button>
            <button className="ui-btn ui-btn-primary ui-rounded-md" onClick={() => { if (tsEditing) { onChangeTimeSignature?.(tsEditing.id, tsEditing.value) }; setTsEditing(null) }}>Save</button>
          </div>
        </div>
      )}
    </>
  )
}
