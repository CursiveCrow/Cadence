import React from 'react'
import './styles/tokens.css'
import './styles/ui.css'
import { Staff } from '@cadence/core'

export interface StaffManagerProps {
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
    const [newStaffName, setNewStaffName] = React.useState('')
    const [newStaffLines, setNewStaffLines] = React.useState(5)
    const [editingStaff, setEditingStaff] = React.useState<string | null>(null)

    if (!isOpen) return null

    return (
        <div className="ui-overlay-backdrop">
            <div className="ui-surface-1 ui-shadow ui-rounded-xl ui-dialog" style={{ borderWidth: 2, display: 'flex', flexDirection: 'column' }}>
                <div className="ui-dialog-header" style={{ borderBottom: '1px solid var(--ui-surface-1-border)', background: 'linear-gradient(90deg, var(--ui-color-primary) 0%, #a855f7 100%)' }}>
                    <h3 className="ui-text" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Staff Management</h3>
                    <button onClick={onClose} className="ui-btn" style={{ background: 'none', border: 'none', fontSize: 24, width: 32, height: 32, borderRadius: 6, cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 20, maxHeight: 300 }}>
                    {staffs.map((staff, index) => (
                        <div key={staff.id} className="ui-rounded-md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, marginBottom: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ flex: 1 }}>
                                {editingStaff === staff.id ? (
                                    <div className="ui-flex ui-items-center ui-gap-2">
                                        <input type="text" defaultValue={staff.name} placeholder="Staff name" onBlur={(e) => { onUpdate(staff.id, { name: (e.target as HTMLInputElement).value }); setEditingStaff(null) }} style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--ui-surface-1-border)', borderRadius: 4, background: '#333', color: 'var(--ui-color-text)', fontSize: 12 }} />
                                        <input type="number" min={1} max={11} defaultValue={staff.numberOfLines} onChange={(e) => onUpdate(staff.id, { numberOfLines: parseInt((e.target as HTMLInputElement).value) })} style={{ width: 50, padding: '4px 8px', border: '1px solid var(--ui-surface-1-border)', borderRadius: 4, background: '#333', color: 'var(--ui-color-text)', fontSize: 12 }} />
                                        <span className="ui-text-muted ui-text-xs">lines</span>
                                    </div>
                                ) : (
                                    <div className="ui-flex ui-items-center ui-gap-2">
                                        <span className="ui-font-600 ui-text-md">{staff.name}</span>
                                        <span className="ui-text-muted ui-text-sm">({staff.numberOfLines} lines)</span>
                                    </div>
                                )}
                            </div>
                            <div className="ui-flex ui-gap-1 ui-items-center">
                                <button onClick={() => onMoveUp(staff.id, index)} disabled={index === 0} className="ui-btn ui-rounded-sm" style={{ width: 28, height: 28, cursor: index === 0 ? 'not-allowed' : 'pointer' }}>↑</button>
                                <button onClick={() => onMoveDown(staff.id, index)} disabled={index === staffs.length - 1} className="ui-btn ui-rounded-sm" style={{ width: 28, height: 28, cursor: index === staffs.length - 1 ? 'not-allowed' : 'pointer' }}>↓</button>
                                <button onClick={() => setEditingStaff(editingStaff === staff.id ? null : staff.id)} className="ui-btn ui-rounded-sm" style={{ width: 28, height: 28 }}>✏️</button>
                                <button onClick={() => onDelete(staff.id)} disabled={staffs.length <= 1} className="ui-btn ui-rounded-sm" style={{ width: 28, height: 28, cursor: staffs.length <= 1 ? 'not-allowed' : 'pointer' }}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ padding: 20, borderTop: '1px solid var(--ui-surface-1-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <h4 className="ui-text" style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Add New Staff</h4>
                    <div className="ui-flex ui-items-center ui-gap-2" style={{ marginBottom: 12 }}>
                        <input type="text" value={newStaffName} onChange={(e) => setNewStaffName((e.target as HTMLInputElement).value)} placeholder="Staff name (e.g., Violin, Piano)" style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--ui-surface-1-border)', borderRadius: 6, background: '#333', color: 'var(--ui-color-text)', fontSize: 14 }} />
                        <input type="number" value={newStaffLines} onChange={(e) => setNewStaffLines(parseInt((e.target as HTMLInputElement).value))} min={1} max={11} style={{ width: 60, padding: 8, border: '1px solid var(--ui-surface-1-border)', borderRadius: 6, background: '#333', color: 'var(--ui-color-text)', fontSize: 14, textAlign: 'center' }} />
                        <span className="ui-text">lines</span>
                    </div>
                    <button onClick={() => onAdd(newStaffName, newStaffLines)} disabled={!newStaffName.trim()} className="ui-btn ui-btn-primary ui-rounded-md" style={{ padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: !newStaffName.trim() ? 'not-allowed' : 'pointer' }}>Add Staff</button>
                </div>
            </div>
        </div>
    )
}
