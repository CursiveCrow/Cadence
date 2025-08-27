import React from 'react'
import '../styles/tokens.css'
import { UIStaff } from '../types'

export interface StaffManagerProps {
    isOpen: boolean
    staffs: UIStaff[]
    onClose: () => void
    onAdd: (name: string, lines: number) => void
    onUpdate: (id: string, updates: Partial<UIStaff>) => void
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'linear-gradient(180deg, var(--ui-surface-1) 0%, var(--ui-surface-1-focus) 100%)', border: '2px solid var(--ui-surface-1-border)', borderRadius: 12, width: 480, maxHeight: '80vh', boxShadow: '0 8px 32px var(--ui-color-shadow)', color: 'var(--ui-color-text)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottom: '1px solid var(--ui-surface-1-border)', background: 'linear-gradient(90deg, var(--ui-color-primary) 0%, #a855f7 100%)' }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Staff Management</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ui-color-text)', fontSize: 24, width: 32, height: 32, borderRadius: 6, cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 20, maxHeight: 300 }}>
                    {staffs.map((staff, index) => (
                        <div key={staff.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, marginBottom: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
                            <div style={{ flex: 1 }}>
                                {editingStaff === staff.id ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="text" defaultValue={staff.name} placeholder="Staff name" onBlur={(e) => { onUpdate(staff.id, { name: e.target.value }); setEditingStaff(null) }} style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--ui-surface-1-border)', borderRadius: 4, background: '#333', color: 'var(--ui-color-text)', fontSize: 12 }} />
                                        <input type="number" min={1} max={11} defaultValue={staff.numberOfLines} onChange={(e) => onUpdate(staff.id, { numberOfLines: parseInt(e.target.value) })} style={{ width: 50, padding: '4px 8px', border: '1px solid var(--ui-surface-1-border)', borderRadius: 4, background: '#333', color: 'var(--ui-color-text)', fontSize: 12 }} />
                                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>lines</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{staff.name}</span>
                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>({staff.numberOfLines} lines)</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <button onClick={() => onMoveUp(staff.id, index)} disabled={index === 0} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--ui-color-text)', width: 28, height: 28, borderRadius: 4, cursor: index === 0 ? 'not-allowed' : 'pointer' }}>↑</button>
                                <button onClick={() => onMoveDown(staff.id, index)} disabled={index === staffs.length - 1} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--ui-color-text)', width: 28, height: 28, borderRadius: 4, cursor: index === staffs.length - 1 ? 'not-allowed' : 'pointer' }}>↓</button>
                                <button onClick={() => setEditingStaff(editingStaff === staff.id ? null : staff.id)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--ui-color-text)', width: 28, height: 28, borderRadius: 4, cursor: 'pointer' }}>✏️</button>
                                <button onClick={() => onDelete(staff.id)} disabled={staffs.length <= 1} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--ui-color-text)', width: 28, height: 28, borderRadius: 4, cursor: staffs.length <= 1 ? 'not-allowed' : 'pointer' }}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ padding: 20, borderTop: '1px solid var(--ui-surface-1-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Add New Staff</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <input type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Staff name (e.g., Violin, Piano)" style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--ui-surface-1-border)', borderRadius: 6, background: '#333', color: 'var(--ui-color-text)', fontSize: 14 }} />
                        <input type="number" value={newStaffLines} onChange={(e) => setNewStaffLines(parseInt(e.target.value))} min={1} max={11} style={{ width: 60, padding: 8, border: '1px solid var(--ui-surface-1-border)', borderRadius: 6, background: '#333', color: 'var(--ui-color-text)', fontSize: 14, textAlign: 'center' }} />
                        <span>lines</span>
                    </div>
                    <button onClick={() => onAdd(newStaffName, newStaffLines)} disabled={!newStaffName.trim()} style={{ background: 'linear-gradient(90deg, var(--ui-color-primary) 0%, #a855f7 100%)', border: 'none', color: 'var(--ui-color-text)', padding: '8px 16px', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: !newStaffName.trim() ? 'not-allowed' : 'pointer' }}>Add Staff</button>
                </div>
            </div>
        </div>
    )
}
