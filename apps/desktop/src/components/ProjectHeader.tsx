import React, { useState, useRef, useEffect } from 'react'
import { StaffManager } from './StaffManager'
import './ProjectHeader.css'

interface ProjectHeaderProps {
  projectName: string
  onAddTask: () => void
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  projectName,
  onAddTask
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [showStaffManager, setShowStaffManager] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleAddTask = () => {
    console.log('Add Note button clicked!')
    onAddTask()
  }

  const handleMenuClick = () => {
    setShowMenu(!showMenu)
  }

  const handleMenuAction = (action: string) => {
    console.log(`Menu action: ${action}`)
    setShowMenu(false)
    
    // Handle different menu actions
    switch (action) {
      case 'staffs':
        setShowStaffManager(true)
        break
      case 'settings':
        alert('Project Settings - Coming Soon!')
        break
      case 'export':
        alert('Export Project - Coming Soon!')
        break
      case 'import':
        alert('Import Project - Coming Soon!')
        break
      case 'about':
        alert('Cadence v1.0.0\nA high-performance project management system\nBuilt with Electron, React, and TypeScript')
        break
      default:
        break
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <>
      <header className="project-header">
        <div className="project-title">
          {projectName}
        </div>
        <div className="project-controls">
          <button className="add-task-btn" onClick={handleAddTask}>
            + Add Note
          </button>
          <div className="menu-container" ref={menuRef}>
            <button className="menu-btn" onClick={handleMenuClick}>
              ⋮
            </button>
            {showMenu && (
              <div className="menu-dropdown">
                <button onClick={() => handleMenuAction('staffs')}>
                  🎼 Manage Staffs
                </button>
                <div className="menu-divider"></div>
                <button onClick={() => handleMenuAction('settings')}>
                  Project Settings
                </button>
                <button onClick={() => handleMenuAction('export')}>
                  Export Project
                </button>
                <button onClick={() => handleMenuAction('import')}>
                  Import Project
                </button>
                <div className="menu-divider"></div>
                <button onClick={() => handleMenuAction('about')}>
                  About Cadence
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <StaffManager 
        isOpen={showStaffManager} 
        onClose={() => setShowStaffManager(false)} 
      />
    </>
  )
}
