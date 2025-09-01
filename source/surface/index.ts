/**
 * Surface Layer Exports
 * Central export point for React UI components
 */

// Main Components
export { CadenceMain, type CadenceMainProps } from './components/CadenceMain'
export { TimelineView, type TimelineViewProps } from './components/TimelineView'
export { Sidebar, type SidebarProps } from './components/Sidebar'
export { TaskDetails, type TaskDetailsProps } from './components/TaskDetails'
export { StaffManager, type StaffManagerProps } from './components/StaffManager'

// Containers
export { TimelineContainer, type TimelineContainerProps } from './containers/TimelineContainer'

// Hooks
export { useTaskManagement, type UseTaskManagementResult } from './hooks/UseTaskManagement'
export { useRepositories, type Repositories } from './hooks/useRepositories'
export { useServices, type Services } from './hooks/useServices'
