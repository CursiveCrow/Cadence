/**
 * TaskCard component for displaying task information
 */

// React import not needed with JSX runtime
import { Task, TaskStatus } from '@cadence/core'
import './styles/tokens.css'
import './styles/ui.css'

export interface TaskCardProps {
  task: Task
  onSelect?: (taskId: string) => void
  onEdit?: (taskId: string) => void
  selected?: boolean
  className?: string
}

export function TaskCard({
  task,
  onSelect,
  onEdit,
  selected = false,
  className = '',
}: TaskCardProps) {
  const statusClasses: Record<TaskStatus, string> = {
    [TaskStatus.NOT_STARTED]: 'ui-status-pill ui-status-not-started',
    [TaskStatus.IN_PROGRESS]: 'ui-status-pill ui-status-in-progress',
    [TaskStatus.COMPLETED]: 'ui-status-pill ui-status-completed',
    [TaskStatus.BLOCKED]: 'ui-status-pill ui-status-blocked',
    [TaskStatus.CANCELLED]: 'ui-status-pill ui-status-cancelled',
  }

  const baseClasses = 'ui-border ui-rounded-lg ui-p-3'
  const selectedClasses = selected ? ' ui-shadow' : ''
  const classes = [baseClasses, selectedClasses, className].join(' ')

  const handleClick = () => {
    if (onSelect) {
      onSelect(task.id)
    }
  }

  const handleDoubleClick = () => {
    if (onEdit) {
      onEdit(task.id)
    }
  }

  return (
    <div className={classes} onClick={handleClick} onDoubleClick={handleDoubleClick}>
      <div className="ui-flex ui-justify-between ui-items-center">
        <div className="ui-w-full">
          <h3 className="ui-font-700 ui-text-md ui-mb-2 ui-text">{task.title}</h3>
          <div className="ui-text-sm ui-text-muted ui-mb-2">
            <div>Start: {new Date(task.startDate).toLocaleDateString()}</div>
            <div>Duration: {task.durationDays} days</div>
            {task.assignee && <div>Assignee: {task.assignee}</div>}
          </div>
        </div>
        <div style={{ marginLeft: 16 }}>
          <span className={statusClasses[task.status as TaskStatus]}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
      </div>
      <div className="ui-text-xs ui-text-muted" />
    </div>
  )
}
