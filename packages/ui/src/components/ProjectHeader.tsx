import React, { useRef, useEffect, useState } from 'react'
import '../styles/tokens.css'

export interface ProjectHeaderProps {
    projectName: string
    onAddTask: () => void
    onOpenStaffManager: () => void
    onSettings?: () => void
    onExport?: () => void
    onImport?: () => void
    onAbout?: () => void
    showControls?: boolean
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
    projectName,
    onAddTask,
    onOpenStaffManager,
    onSettings,
    onExport,
    onImport,
    onAbout,
    showControls = true
}) => {
    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => { document.removeEventListener('mousedown', handleClickOutside) }
    }, [])

    return (
        <header style={{ background: 'linear-gradient(135deg, var(--ui-color-primary) 0%, #7c3aed 100%)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid var(--ui-color-primary)', minHeight: 70, boxShadow: '0 4px 12px var(--ui-color-shadow)' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ui-color-text)', textTransform: 'uppercase', letterSpacing: 2, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {projectName}
            </div>
            {showControls && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <button style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.4)', color: 'var(--ui-color-text)', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }} onClick={onAddTask}>
                        + Add Note
                    </button>
                    <div style={{ position: 'relative' }} ref={menuRef}>
                        <button style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', color: 'var(--ui-color-text)', fontSize: 20, cursor: 'pointer', padding: '8px 12px', borderRadius: 6, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowMenu(v => !v)}>
                            ⋮
                        </button>
                        {showMenu && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'linear-gradient(135deg, var(--ui-surface-1) 0%, var(--ui-surface-1-focus) 100%)', border: '2px solid var(--ui-surface-1-border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 180, zIndex: 1000, overflow: 'hidden' }}>
                                <button onClick={onOpenStaffManager} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--ui-color-text)', padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}>🎼 Manage Staffs</button>
                                <div style={{ height: 1, background: 'var(--ui-surface-1-border)', margin: '4px 0' }} />
                                <button onClick={onSettings} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--ui-color-text)', padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}>Project Settings</button>
                                <button onClick={onExport} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--ui-color-text)', padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}>Export Project</button>
                                <button onClick={onImport} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--ui-color-text)', padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}>Import Project</button>
                                <div style={{ height: 1, background: 'var(--ui-surface-1-border)', margin: '4px 0' }} />
                                <button onClick={onAbout} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--ui-color-text)', padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}>About Cadence</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}
