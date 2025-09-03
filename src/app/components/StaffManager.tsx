import React, { useState } from 'react'
import type { Staff } from '@types'

interface StaffManagerProps {
  isOpen: boolean
  staffs: Staff[]
  onClose: () => void
  onAdd: (name: string, lines: number) => void
  onUpdate: (id: string, updates: Partial<Staff>) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string, index: number) => void
  onMoveDown: (id: string, index: number) => void
}

export const StaffManager: React.FC<StaffManagerProps> = ({ isOpen, staffs, onClose, onAdd, onUpdate, onDelete, onMoveUp, onMoveDown }) => {
  const [name, setName] = useState('')
  const [lines, setLines] = useState(5)
  if (!isOpen) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#12151c', border: '1px solid #2b3242', borderRadius: 8, width: 520, maxHeight: '80vh', overflow: 'auto', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <strong style={{ color: '#e6e6e6' }}>Staff Manager</strong>
          <button onClick={onClose}>Close</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={name} placeholder="Name" onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
          <input type="number" min={1} max={10} value={lines} onChange={(e) => setLines(parseInt(e.target.value, 10) || 5)} style={{ width: 80 }} />
          <button onClick={() => { onAdd(name, lines); setName('') }}>Add</button>
        </div>
        {staffs.map((s, i) => (
          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px 1fr', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid #1c2230' }}>
            <input value={s.name} onChange={(e) => onUpdate(s.id, { name: e.target.value })} />
            <input type="number" min={1} max={10} value={s.numberOfLines} onChange={(e) => onUpdate(s.id, { numberOfLines: parseInt(e.target.value, 10) || s.numberOfLines })} />
            <input type="number" min={8} max={40} value={s.lineSpacing} onChange={(e) => onUpdate(s.id, { lineSpacing: parseInt(e.target.value, 10) || s.lineSpacing })} />
            <input placeholder="TimeSig e.g. 4/4" value={s.timeSignature ?? ''} onChange={(e) => onUpdate(s.id, { timeSignature: e.target.value })} />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button onClick={() => onMoveUp(s.id, i)}>Up</button>
              <button onClick={() => onMoveDown(s.id, i)}>Down</button>
              <button onClick={() => onDelete(s.id)} style={{ color: '#ef4444' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

