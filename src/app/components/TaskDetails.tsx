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
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, alignItems: 'center' }}>
      <div style={{ fontSize: 12, color: '#8a93a8' }}>{label}</div>
      <div>{input}</div>
    </div>
  )
  return (
    <div style={{ position: 'absolute', left: Math.round(position.x), top: Math.round(position.y), background: '#12151c', border: '1px solid #2b3242', borderRadius: 8, padding: 12, width: 320, zIndex: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ color: '#e6e6e6' }}>Task</strong>
        <button onClick={onClose}>Close</button>
      </div>
      {field('Title', <input value={task.title} onChange={(e) => onUpdateTask({ title: e.target.value })} />)}
      {field('Status', (
        <select value={task.status} onChange={(e) => onUpdateTask({ status: e.target.value as TaskStatus })}>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
          <option value="cancelled">Cancelled</option>
        </select>
      ))}
      {field('Start', <input type="date" value={task.startDate} onChange={(e) => onUpdateTask({ startDate: e.target.value })} />)}
      {field('Duration', <input type="number" min={1} value={task.durationDays} onChange={(e) => onUpdateTask({ durationDays: Math.max(1, parseInt(e.target.value, 10) || task.durationDays) })} />)}
      {field('Staff', (
        <select value={task.staffId} onChange={(e) => onUpdateTask({ staffId: e.target.value })}>
          {staffs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      ))}
      {field('Line', <input type="number" min={0} value={task.staffLine} onChange={(e) => onUpdateTask({ staffLine: Math.max(0, parseInt(e.target.value, 10) || task.staffLine) })} />)}
      <div style={{ fontSize: 11, color: '#8a93a8', marginTop: 6 }}>Selected: {selectionCount}</div>
    </div>
  )
}

