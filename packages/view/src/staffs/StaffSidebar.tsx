import React from 'react'
import type { Staff } from '@cadence/core'
import { StaffSidebar as UIStaffSidebar, computeDateHeaderHeight } from '@cadence/ui'

export interface StaffSidebarProps {
    staffs: Staff[]
    viewport: { x: number; y: number; zoom: number }
    verticalScale: number
    width: number
    onAddNote: () => void
    onOpenMenu: () => void
    onVerticalZoomChange: (newZoom: number, anchorLocalY: number, startZoom: number) => void
    onChangeTimeSignature: (staffId: string, timeSignature: string) => void
}

export const StaffSidebar: React.FC<StaffSidebarProps> = ({
    staffs,
    viewport,
    verticalScale,
    width,
    onAddNote,
    onOpenMenu,
    onVerticalZoomChange,
    onChangeTimeSignature,
}) => {
    return (
        <UIStaffSidebar
            staffs={staffs}
            viewport={viewport}
            width={width}
            topMargin={Math.round(100 * verticalScale)}
            staffSpacing={Math.max(20, Math.round(120 * verticalScale))}
            staffLineSpacing={Math.max(8, Math.round(18 * verticalScale))}
            headerHeight={computeDateHeaderHeight(viewport.zoom || 1)}
            verticalScale={verticalScale}
            onAddNote={onAddNote}
            onOpenMenu={onOpenMenu}
            onVerticalZoomChange={onVerticalZoomChange}
            onChangeTimeSignature={onChangeTimeSignature}
        />
    )
}


