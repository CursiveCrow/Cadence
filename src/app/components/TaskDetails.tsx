import React from 'react'
import type { Task, Staff, TaskStatus } from '@types'

interface TaskDetailsProps {
  task: Task
  staffs: Staff[]
  selectionCount: number
  position: { x: number; y: number }
  onClose: () => void
  onUpdateTask: (updates: Partial<Task>) => void
}

export const TaskDetails: React.FC<TaskDetailsProps> = ({ task, staffs, selectionCount, position, onClose, onUpdateTask }) => {
  const field = (label: string, input: React.ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 8, alignItems: 'center' }}>
      <div className="ui-text-sm ui-text-muted">{label}</div>
      <div>{input}</div>
    </div>
  )
  const statusChip = (
    <span className={`ui-chip ${task.status}`}>
      <span className="ui-chip-dot" style={{ background: 'currentColor', opacity: 0.9 }} />
      {task.status.replace('_', ' ')}
    </span>
  )
  return (
    <div style={{ position: 'absolute', left: Math.round(position.x), top: Math.round(position.y), zIndex: 1000 }}>
      <div className="ui-surface-1 ui-shadow ui-rounded-lg ui-p-3" style={{ width: 340 }}>
        <div className="ui-flex ui-items-center ui-justify-between ui-mb-2">
          <div className="ui-flex ui-items-center ui-gap-2">
            <strong className="ui-text">Task</strong>
            {statusChip}
          </div>
          <button className="ui-btn ui-rounded-md ui-text-sm" onClick={onClose}>Close</button>
        </div>
        {field('Title', <input className="ui-input" value={task.title} onChange={(e) => onUpdateTask({ title: e.target.value })} />)}
        {field('Status', (
          <select className="ui-input" value={task.status} onChange={(e) => onUpdateTask({ status: e.target.value as TaskStatus })}>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
            <option value="cancelled">Cancelled</option>
          </select>
        ))}
        {field('Start', <input className="ui-input" type="date" value={task.startDate} onChange={(e) => onUpdateTask({ startDate: e.target.value })} />)}
        {field('Duration', <input className="ui-input" type="number" min={1} value={task.durationDays} onChange={(e) => onUpdateTask({ durationDays: Math.max(1, parseInt(e.target.value, 10) || task.durationDays) })} />)}
        {field('Staff', (
          <select className="ui-input" value={task.staffId} onChange={(e) => onUpdateTask({ staffId: e.target.value })}>
            {staffs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        ))}
        {field('Line', <input className="ui-input" type="number" min={0} value={task.staffLine} onChange={(e) => onUpdateTask({ staffLine: Math.max(0, parseInt(e.target.value, 10) || task.staffLine) })} />)}
        <div className="ui-text-xs ui-text-muted" style={{ marginTop: 6 }}>Selected: {selectionCount}</div>
      </div>
    </div>
  )
}

