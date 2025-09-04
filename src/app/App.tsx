import React, { useEffect, useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@app/store/store'
import TimelineCanvas from '@app/components/TimelineCanvas'
import { useDemoProject } from '@app/hooks/useDemoProject'
import { DateHeader } from '@app/components/DateHeader'
import { Sidebar } from '@app/components/Sidebar'
import { StaffManager } from '@app/components/StaffManager'
import { TaskDetails } from '@app/components/TaskDetails'
import { setSelection, setSelectionWithAnchor, setViewport } from '@app/store/ui'
import { addTask, updateTask } from '@app/store/tasks'
import { addDependency } from '@app/store/dependencies'
import { TIMELINE_CONFIG } from '@renderer/config'
import { PROJECT_START_DATE } from '../config'
import { useResizableSidebar } from '@app/hooks/useResizableSidebar'
import type { Task } from '@types'

const App: React.FC = () => {
  const dispatch = useDispatch()
  const viewport = useSelector((s: RootState) => s.ui.viewport)
  const verticalScale = useSelector((s: RootState) => (s as any).ui.verticalScale as number)
  const selection = useSelector((s: RootState) => s.ui.selection)
  const staffs = useSelector((s: RootState) => s.staffs.list)
  const tasks = useSelector((s: RootState) => s.tasks.list)
  const dependencies = useSelector((s: RootState) => s.dependencies.list)
  const { sidebarWidth, resizerRef, beginResize, resetSidebarWidth } = useResizableSidebar()
  const [showStaffManager, setShowStaffManager] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light' | 'high-contrast'>('dark')

  // Apply theme to :root via data-theme. Dark is the default base; remove attribute for it.
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme])
  const popupPosition = useMemo(() => {
    if (selection.length === 0) return null
    const selected = tasks.find(t => t.id === selection[0])
    if (!selected) return null
    const day = Math.floor((new Date(selected.startDate).getTime() - new Date('2024-01-01').getTime()) / (24 * 3600 * 1000))
    const x = TIMELINE_CONFIG.LEFT_MARGIN + (day - viewport.x) * TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.1, viewport.zoom)
    const staffIndex = Math.max(0, staffs.findIndex(s => s.id === selected.staffId))
    const y = TIMELINE_CONFIG.TOP_MARGIN + staffIndex * TIMELINE_CONFIG.STAFF_SPACING + selected.staffLine * (TIMELINE_CONFIG.STAFF_LINE_SPACING / 2)
    return { x: x + 80, y }
  }, [selection, tasks, viewport.x, viewport.zoom, staffs])

  useDemoProject()

  return (
    <div className="app-root">
      <div className="header ui-border-b ui-px-3 ui-py-2">
        <div className="ui-flex ui-items-center ui-justify-between ui-gap-3" style={{ width: '100%' }}>
          <div className="ui-flex ui-items-center ui-gap-3" style={{ minWidth: 0 }}>
            <span className="ui-badge">Cadence</span>
            <div className="ui-text-muted" style={{ opacity: 0.9, whiteSpace: 'nowrap' }}>Simplified Architecture</div>
          </div>
          <div className="ui-flex ui-items-center ui-gap-3">
            <select className="ui-input ui-text-sm" value={theme} onChange={(e) => setTheme(e.target.value as any)} title="Theme">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="high-contrast">High Contrast</option>
            </select>
            <button
              className="ui-btn ui-btn-primary ui-rounded-md ui-text-sm ui-focus-ring"
              disabled={selection.length !== 2}
              onClick={() => {
                if (selection.length === 2) {
                  dispatch(addDependency({ id: `dep-${Date.now()}`, srcTaskId: selection[0], dstTaskId: selection[1], type: 'finish_to_start', projectId: 'demo', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any))
                }
              }}
            >
              Link Selected
            </button>
            <button className="ui-btn ui-rounded-md ui-text-sm ui-focus-ring" onClick={() => setShowStaffManager(true)}>Manage Staffs</button>
          </div>
        </div>
      </div>

      <div className="content" onKeyDown={(e) => {
        if (e.key === 'Delete' && selection.length > 0) {
          for (const id of selection) {
            dispatch({ type: 'tasks/deleteTask', payload: id })
          }
        }
      }} tabIndex={0} style={{ position: 'relative' }}>
        <aside className="sidebar" style={{ width: Math.round(sidebarWidth), height: '100%', boxSizing: 'border-box' as any }}>
          <Sidebar
            staffs={staffs}
            viewport={viewport}
            onAddNote={() => {
              const randomStaff = staffs[Math.floor(Math.random() * staffs.length)] || staffs[0]
              const now = new Date().toISOString()
              const newTask: Task = { id: `task-${Date.now()}`, title: 'New Note', startDate: '2024-01-08', durationDays: 2, status: 'not_started' as any, staffId: randomStaff?.id || 'treble', staffLine: 4, projectId: 'demo', createdAt: now, updatedAt: now }
              dispatch(addTask(newTask))
            }}
            onOpenStaffManager={() => setShowStaffManager(true)}
            onChangeTimeSignature={(id, value) => dispatch({ type: 'staffs/updateStaff', payload: { id, updates: { timeSignature: value } } })}
          />
        </aside>
        <div
          className="vertical-resizer"
          ref={resizerRef as any}
          onMouseDown={beginResize}
          onDoubleClick={resetSidebarWidth}
          style={{ position: 'absolute', left: Math.round(sidebarWidth), top: 0, bottom: 0 }}
        />
        <main className="main">
          {/* Date header sits within the main area so it does not overlap the sidebar */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: 2 }}>
            <DateHeader
              viewport={viewport}
              projectStart={PROJECT_START_DATE}
              leftMargin={TIMELINE_CONFIG.LEFT_MARGIN}
              dayWidth={TIMELINE_CONFIG.DAY_WIDTH}
              onZoomChange={(z, anchorLocalX) => {
                const ppd0 = TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.0001, viewport.zoom)
                const ppd1 = TIMELINE_CONFIG.DAY_WIDTH * Math.max(0.1, z)
                // anchorLocalX is relative to the header within main; subtract internal left margin only
                const anchorPxFromGrid = Math.max(0, anchorLocalX - (TIMELINE_CONFIG.LEFT_MARGIN))
                const worldAtAnchor = viewport.x + anchorPxFromGrid / ppd0
                const newX = Math.max(0, Math.round(worldAtAnchor - anchorPxFromGrid / ppd1))
                dispatch(setViewport({ x: newX, y: viewport.y, zoom: z }))
              }}
            />
          </div>
          <TimelineCanvas
            viewport={viewport}
            staffs={staffs}
            tasks={tasks}
            dependencies={dependencies}
            selection={selection}
            onViewportChange={(v) => dispatch(setViewport(v))}
            onSelect={(ids, anchor) => anchor ? dispatch(setSelectionWithAnchor({ ids, anchor })) : dispatch(setSelection(ids))}
            verticalScale={verticalScale}
            onVerticalScaleChange={(s) => dispatch({ type: 'ui/setVerticalScale', payload: s })}
          />
        </main>
      </div>
      <StaffManager
        isOpen={showStaffManager}
        staffs={staffs}
        onClose={() => setShowStaffManager(false)}
        onAdd={(name, lines) => {
          const now = new Date().toISOString()
          dispatch({ type: 'staffs/addStaff', payload: { id: `staff-${Date.now()}`, name, numberOfLines: lines, lineSpacing: 12, position: staffs.length, projectId: 'demo', createdAt: now, updatedAt: now } })
        }}
        onUpdate={(id, updates) => dispatch({ type: 'staffs/updateStaff', payload: { id, updates } })}
        onDelete={(id) => dispatch({ type: 'staffs/deleteStaff', payload: id })}
        onMoveUp={(id, index) => index > 0 && dispatch({ type: 'staffs/reorderStaffs', payload: { staffId: id, newPosition: index - 1 } })}
        onMoveDown={(id, index) => index < staffs.length - 1 && dispatch({ type: 'staffs/reorderStaffs', payload: { staffId: id, newPosition: index + 1 } })}
      />
      {selection.length > 0 && popupPosition && (() => {
        const t = tasks.find(x => x.id === selection[0])
        return t ? (
          <TaskDetails
            task={t}
            staffs={staffs}
            selectionCount={selection.length}
            position={popupPosition}
            onClose={() => dispatch(setSelection([]))}
            onUpdateTask={(u) => dispatch(updateTask({ id: t.id, updates: u }))}
          />
        ) : null
      })()}
    </div>
  )
}

export default App
