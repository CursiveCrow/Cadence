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
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="modal-header">
          <strong className="sm-title">Staff Manager</strong>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="modal-row">
          <input className="sm-input-name" value={name} placeholder="Name" onChange={(e) => setName(e.target.value)} />
          <input className="sm-input-lines" type="number" min={1} max={10} value={lines} onChange={(e) => setLines(parseInt(e.target.value, 10) || 5)} />
          <button onClick={() => { onAdd(name, lines); setName('') }}>Add</button>
        </div>
        {staffs.map((s, i) => (
          <div key={s.id} className="sm-grid-row">
            <input value={s.name} onChange={(e) => onUpdate(s.id, { name: e.target.value })} />
            <input type="number" min={1} max={10} value={s.numberOfLines} onChange={(e) => onUpdate(s.id, { numberOfLines: parseInt(e.target.value, 10) || s.numberOfLines })} />
            <input type="number" min={8} max={40} value={s.lineSpacing} onChange={(e) => onUpdate(s.id, { lineSpacing: parseInt(e.target.value, 10) || s.lineSpacing })} />
            <input placeholder="TimeSig e.g. 4/4" value={s.timeSignature ?? ''} onChange={(e) => onUpdate(s.id, { timeSignature: e.target.value })} />
            <div className="sm-actions">
              <button onClick={() => onMoveUp(s.id, i)}>Up</button>
              <button onClick={() => onMoveDown(s.id, i)}>Down</button>
              <button onClick={() => onDelete(s.id)} className="btn-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

