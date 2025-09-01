import React, { useRef, useEffect, useState } from 'react'
import '../styles/tokens.css'
import '../styles/ui.css'

export interface ProjectHeaderProps {
  projectName: string
  onOpenStaffManager: () => void
  onSettings?: () => void
  onExport?: () => void
  onImport?: () => void
  onAbout?: () => void
  showControls?: boolean
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ projectName, onOpenStaffManager, onSettings, onExport, onImport, onAbout, showControls = true }) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false) }; document.addEventListener('mousedown', handleClickOutside); return () => { document.removeEventListener('mousedown', handleClickOutside) } }, [])
  return (
    <header className="ui-header ui-flex ui-justify-between ui-items-center ui-py-3 ui-px-3">
      <div className="ui-text ui-font-700" style={{ fontSize: 22, letterSpacing: 0.5, textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>{projectName}</div>
      {showControls && (
        <div className="ui-flex ui-gap-4 ui-items-center">
          <div className="ui-relative" ref={menuRef}>
            <button className="ui-btn ui-rounded-md ui-focus-ring menu-btn" style={{ fontSize: 18, width: 40, height: 40 }} onClick={() => setShowMenu(v => !v)} aria-label="Project menu">⋮</button>
            {showMenu && (
              <div className="ui-absolute ui-surface-1 ui-shadow ui-rounded-lg" style={{ top: 'calc(100% + 8px)', right: 0, minWidth: 180, zIndex: 1000, overflow: 'hidden', borderWidth: 2 }}>
                <button onClick={onOpenStaffManager} className="ui-text" style={{ width: '100%', background: 'none', border: 'none', padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}>Manage Staffs</button>
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

