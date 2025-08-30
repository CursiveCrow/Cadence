/**
 * Domain Types for Cadence Project Management System
 * Based on Design.md specification
 */
export var TaskStatus
;(function (TaskStatus) {
  TaskStatus['NOT_STARTED'] = 'not_started'
  TaskStatus['IN_PROGRESS'] = 'in_progress'
  TaskStatus['COMPLETED'] = 'completed'
  TaskStatus['BLOCKED'] = 'blocked'
  TaskStatus['CANCELLED'] = 'cancelled'
})(TaskStatus || (TaskStatus = {}))
export var DependencyType
;(function (DependencyType) {
  DependencyType['FINISH_TO_START'] = 'finish_to_start'
  DependencyType['START_TO_START'] = 'start_to_start'
  DependencyType['FINISH_TO_FINISH'] = 'finish_to_finish'
  DependencyType['START_TO_FINISH'] = 'start_to_finish'
})(DependencyType || (DependencyType = {}))
//# sourceMappingURL=types.js.map
