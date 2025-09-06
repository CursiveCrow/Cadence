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
  const [headerHeight, setHeaderHeight] = useState<number>(0)
  const scaled = useMemo(() => computeScaledTimeline(verticalScale || 1), [verticalScale])

  // Keep label layer aligned with header height
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const measure = () => setHeaderHeight(el.offsetHeight || 0)
    measure()
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure())
      ro.observe(el)
    } else {
      const id = window.setInterval(measure, 300)
      return () => window.clearInterval(id)
    }
    return () => ro?.disconnect()
  }, [])

  // Drive sheen and rim highlight with pointer (light source) using rAF and host-level events
  useEffect(() => {
    const host = headerRef.current?.closest('.sidebar') as HTMLElement | null
    if (!host) return

    if (!host.style.getPropertyValue('--sheen-x')) {
      const r = host.getBoundingClientRect()
      host.style.setProperty('--sheen-x', `${Math.round(r.width * 0.5)}px`)
      host.style.setProperty('--sheen-y', `${Math.round(r.height * 0.5)}px`)
      host.style.setProperty('--lag-x', `${Math.round(r.width * 0.5)}px`)
      host.style.setProperty('--lag-y', `${Math.round(r.height * 0.3)}px`)
    }

    let raf = 0
    const last = { x: 0, y: 0, has: false }

    const update = () => {
      raf = 0
      if (!last.has) return
      const rect = host.getBoundingClientRect()
      const localX = Math.max(0, Math.min(rect.width, last.x - rect.left))
      const localY = Math.max(0, Math.min(rect.height, last.y - rect.top))
      const nearestX = rect.left + localX
      const nearestY = rect.top + localY
      const dx = last.x - nearestX
      const dy = last.y - nearestY
      const dist = Math.hypot(dx, dy)

      const strength = Math.exp(-dist / 380)
      const alpha1 = Math.min(0.055, 0.016 + 0.04 * strength)
      const alpha2 = Math.min(0.025, 0.006 + 0.018 * strength)
      const sheenPeak = Math.min(0.12, 0.025 + 0.15 * strength)
      const inkDispersion = Math.min(0.035, 0.008 + 0.028 * strength)
      const flowIntensity = Math.min(0.012, 0.003 + 0.01 * strength)
      const glintSize = Math.max(7, Math.min(14, 11 - dist / 75))
      const lobeW = Math.max(45, Math.min(85, 65 + (dx / 5.5)))
      const lobeH = Math.max(28, Math.min(62, 40 + (dy / 7.5)))
      const lobeOffsetX = Math.max(5, Math.min(16, 9 + dx / 11))
      const lobeOffsetY = Math.max(3, Math.min(12, 5 + dy / 11))
      const glintOffsetX = Math.max(7, Math.min(18, 11 + dx / 16))
      const glintOffsetY = Math.max(9, Math.min(22, 13 + dy / 16))

      const normalizedX = (localX / rect.width) - 0.5
      const normalizedY = (localY / rect.height) - 0.5
      const baseAngle = (normalizedX * 30) + (normalizedY * 15)
      const rot = baseAngle + (dx * 0.05) + (dy * 0.03)

      host.style.setProperty('--sheen-x', `${localX}px`)
      host.style.setProperty('--sheen-y', `${localY}px`)
      const currentLagX = parseFloat(host.style.getPropertyValue('--lag-x') || '0')
      const currentLagY = parseFloat(host.style.getPropertyValue('--lag-y') || '0')
      const lagX = currentLagX + (localX - currentLagX) * 0.08
      const lagY = currentLagY + (localY - currentLagY) * 0.08
      host.style.setProperty('--lag-x', `${lagX}px`)
      host.style.setProperty('--lag-y', `${lagY}px`)
      host.style.setProperty('--sheen-alpha-1', alpha1.toFixed(3))
      host.style.setProperty('--sheen-alpha-2', alpha2.toFixed(3))
      host.style.setProperty('--sheen-peak', sheenPeak.toFixed(3))
      const absorb = Math.max(0.022, Math.min(0.065, sheenPeak * 0.65))
      host.style.setProperty('--absorb-alpha', absorb.toFixed(3))
      host.style.setProperty('--ink-dispersion', inkDispersion.toFixed(3))
      host.style.setProperty('--flow-alpha', flowIntensity.toFixed(3))
      host.style.setProperty('--glint-size', `${glintSize.toFixed(0)}px`)
      host.style.setProperty('--lobe-w', `${lobeW.toFixed(0)}px`)
      host.style.setProperty('--lobe-h', `${lobeH.toFixed(0)}px`)
      host.style.setProperty('--lobe-offset-x', `${lobeOffsetX.toFixed(0)}px`)
      host.style.setProperty('--lobe-offset-y', `${lobeOffsetY.toFixed(0)}px`)
      host.style.setProperty('--glint-offset-x', `${glintOffsetX.toFixed(0)}px`)
      host.style.setProperty('--glint-offset-y', `${glintOffsetY.toFixed(0)}px`)
      host.style.setProperty('--sheen-rot', `${rot.toFixed(1)}deg`)

      const streak = Math.max(0.004, Math.min(0.018, alpha1 * 0.25))
      host.style.setProperty('--streak-alpha', streak.toFixed(3))

      const distFromRight = Math.max(0, rect.width - localX)
      const edgeProximity = Math.exp(-distFromRight / 28)
      const baseEdgeAlpha = 0.035 + 0.45 * strength * edgeProximity
      const edgeAlpha = Math.min(0.35, baseEdgeAlpha)
      host.style.setProperty('--edge-alpha', edgeAlpha.toFixed(3))
      const edgePeak = Math.min(0.65, edgeAlpha * 2.4)
      host.style.setProperty('--edge-peak', edgePeak.toFixed(3))
    }

    const onMove = (e: PointerEvent) => {
      last.x = e.clientX
      last.y = e.clientY
      last.has = true
      if (!raf) raf = window.requestAnimationFrame(update)
    }

    window.addEventListener('pointermove', onMove)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
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
      <div className="sidebar-labels-layer" style={{ top: headerHeight }}>
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
