import React, { useRef, useEffect, useState } from 'react'
import '../styles/tokens.css'
import '../styles/ui.css'

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
        <header className="ui-header ui-flex ui-justify-between ui-items-center ui-py-3 ui-px-3">
            <div className="ui-text ui-uppercase ui-font-700" style={{ fontSize: 24, letterSpacing: 2, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {projectName}
            </div>
            {showControls && (
                <div className="ui-flex ui-gap-4 ui-items-center">
                    <button className="ui-btn ui-btn-strong ui-uppercase" style={{ padding: '10px 20px', letterSpacing: 0.5 }} onClick={onAddTask}>
                        + Add Note
                    </button>
                    <div className="ui-relative" ref={menuRef}>
                        <button className="ui-btn ui-rounded-md ui-btn" style={{ fontSize: 20, width: 40, height: 40, padding: '8px 12px' }} onClick={() => setShowMenu(v => !v)}>
                            ⋮
                        </button>
                        {showMenu && (
                            <div className="ui-absolute ui-surface-1 ui-shadow ui-rounded-lg" style={{ top: 'calc(100% + 8px)', right: 0, minWidth: 180, zIndex: 1000, overflow: 'hidden', borderWidth: 2 }}>
                                <button onClick={onOpenStaffManager} className="ui-text" style={{ width: '100%', background: 'none', border: 'none', padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}>🎼 Manage Staffs</button>
                                <div style={{ height: 1, background: 'var(--ui-surface-1-border)', margin: '4px 0' }} />
                                <button onClick={onSettings} className="ui-text" style={{ width: '100%', background: 'none', border: 'none', padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}>Project Settings</button>
                                <button onClick={onExport} className="ui-text" style={{ width: '100%', background: 'none', border: 'none', padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}>Export Project</button>
                                <button onClick={onImport} className="ui-text" style={{ width: '100%', background: 'none', border: 'none', padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}>Import Project</button>
                                <div style={{ height: 1, background: 'var(--ui-surface-1-border)', margin: '4px 0' }} />
                                <button onClick={onAbout} className="ui-text" style={{ width: '100%', background: 'none', border: 'none', padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}>About Cadence</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}
