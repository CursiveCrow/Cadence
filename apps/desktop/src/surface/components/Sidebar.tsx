import React from 'react'
import { Staff } from '@cadence/core'
import { StaffSidebar as UIStaffSidebar, computeDateHeaderHeight } from '@cadence/ui'
import { useResizableSidebar } from '../hooks/useResizableSidebar'

interface SidebarProps {
  staffs: Staff[]
  viewport: { x: number; y: number; zoom: number }
  verticalScale: number
  onAddNote: () => void
  onOpenMenu: () => void
  onVerticalZoomChange: (newZoom: number, anchorLocalY: number, startZoom: number) => void
  onChangeTimeSignature: (staffId: string, timeSignature: string) => void
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const { sidebarWidth, resizerRef, beginResize, resetSidebarWidth } = useResizableSidebar()
  return (
    <>
      <div className="staff-sidebar" style={{ width: `${sidebarWidth}px` }}>
        <UIStaffSidebar
          staffs={props.staffs}
          viewport={props.viewport}
          width={sidebarWidth}
          topMargin={Math.round(100 * props.verticalScale)}
          staffSpacing={Math.max(20, Math.round(120 * props.verticalScale))}
          staffLineSpacing={Math.max(8, Math.round(18 * props.verticalScale))}
          headerHeight={computeDateHeaderHeight(props.viewport.zoom || 1)}
          verticalScale={props.verticalScale}
          onAddNote={props.onAddNote}
          onOpenMenu={props.onOpenMenu}
          onVerticalZoomChange={props.onVerticalZoomChange}
          onChangeTimeSignature={props.onChangeTimeSignature}
        />
      </div>
      <div className="vertical-resizer" ref={resizerRef} onMouseDown={beginResize} onDoubleClick={resetSidebarWidth} />
    </>
  )
}

