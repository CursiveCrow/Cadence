/**
 * StaffSidebar Component
 * Displays staff labels and time signatures in the sidebar
 */

import React, { useRef, useState } from 'react'
import { Staff } from '../../core/domain/entities/Staff'
import { TimeSignature } from '../../core/domain/value-objects/TimeSignature'
import { CONSTANTS } from '../../config/constants'
import './StaffSidebar.css'

export interface StaffSidebarProps {
    staffs: Staff[]
    viewport: { x: number; y: number; zoom: number; verticalScale?: number }
    width?: number
    onAddStaff?: () => void
    onEditStaff?: (staff: Staff) => void
    onTimeSignatureChange?: (staffId: string, timeSignature: string | undefined) => void
    onVerticalZoomChange?: (newScale: number, anchorY: number) => void
}

export const StaffSidebar: React.FC<StaffSidebarProps> = ({
    staffs,
    viewport,
    width = 120,
    onAddStaff,
    onEditStaff,
    onTimeSignatureChange,
    onVerticalZoomChange
}) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
    const [timeSignatureInput, setTimeSignatureInput] = useState('')

    const dragRef = useRef({
        active: false,
        startY: 0,
        startScale: 1,
        anchorY: 0
    })

    const verticalScale = viewport.verticalScale || 1
    const scaledStaffSpacing = CONSTANTS.DEFAULT_STAFF_SPACING * verticalScale
    const scaledLineSpacing = CONSTANTS.DEFAULT_STAFF_LINE_SPACING * verticalScale
    const scaledTopMargin = CONSTANTS.DEFAULT_TOP_MARGIN * verticalScale

    // Handle middle-mouse drag for vertical zoom
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 1) return // Only middle mouse
        e.preventDefault()

        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        dragRef.current = {
            active: true,
            startY: e.clientY,
            startScale: verticalScale,
            anchorY: e.clientY - rect.top
        }

        containerRef.current?.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current.active || !onVerticalZoomChange) return

        const deltaY = e.clientY - dragRef.current.startY
        const scaleFactor = Math.pow(1.005, -deltaY)
        const newScale = Math.max(0.5, Math.min(2, dragRef.current.startScale * scaleFactor))

        onVerticalZoomChange(newScale, dragRef.current.anchorY)
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        dragRef.current.active = false
        containerRef.current?.releasePointerCapture(e.pointerId)
    }

    const handleTimeSignatureClick = (staff: Staff) => {
        setEditingStaffId(staff.id)
        setTimeSignatureInput(staff.timeSignature || '4/4')
    }

    const handleTimeSignatureSave = (staffId: string) => {
        if (onTimeSignatureChange) {
            try {
                // Validate time signature format
                const ts = TimeSignature.fromString(timeSignatureInput)
                onTimeSignatureChange(staffId, ts.toString())
            } catch {
                // Invalid format, keep existing
            }
        }
        setEditingStaffId(null)
    }

    const handleTimeSignatureCancel = () => {
        setEditingStaffId(null)
        setTimeSignatureInput('')
    }

    const renderStaffLines = (staff: Staff, yOffset: number) => {
        const lines = []
        for (let i = 0; i < staff.numberOfLines; i++) {
            const y = yOffset + i * scaledLineSpacing
            lines.push(
                <line
                    key={`${staff.id}-line-${i}`}
                    x1={0}
                    y1={y}
                    x2={width}
                    y2={y}
                    stroke="#c0c0c0"
                    strokeWidth="1"
                />
            )
        }
        return lines
    }

    return (
        <div
            ref={containerRef}
            className="staff-sidebar"
            style={{ width }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            <svg
                className="staff-sidebar-svg"
                width={width}
                height={`${scaledTopMargin + staffs.length * scaledStaffSpacing + 100}px`}
                style={{
                    transform: `translateY(${viewport.y}px)`
                }}
            >
                {staffs.map((staff, index) => {
                    const yOffset = scaledTopMargin + index * scaledStaffSpacing

                    return (
                        <g key={staff.id}>
                            {/* Staff lines */}
                            {renderStaffLines(staff, yOffset)}

                            {/* Staff label */}
                            <foreignObject
                                x={5}
                                y={yOffset - 20}
                                width={width - 10}
                                height={20}
                            >
                                <div
                                    className="staff-label"
                                    onClick={() => onEditStaff?.(staff)}
                                >
                                    {staff.name}
                                </div>
                            </foreignObject>

                            {/* Time signature */}
                            <foreignObject
                                x={width - 35}
                                y={yOffset + (staff.numberOfLines - 1) * scaledLineSpacing / 2 - 15}
                                width={30}
                                height={30}
                            >
                                {editingStaffId === staff.id ? (
                                    <input
                                        className="time-signature-input"
                                        value={timeSignatureInput}
                                        onChange={(e) => setTimeSignatureInput(e.target.value)}
                                        onBlur={() => handleTimeSignatureSave(staff.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleTimeSignatureSave(staff.id)
                                            if (e.key === 'Escape') handleTimeSignatureCancel()
                                        }}
                                        autoFocus
                                        placeholder="4/4"
                                    />
                                ) : (
                                    <div
                                        className="time-signature"
                                        onClick={() => handleTimeSignatureClick(staff)}
                                    >
                                        {staff.timeSignature ? (
                                            <div className="time-signature-display">
                                                <span className="time-signature-num">
                                                    {staff.timeSignature.split('/')[0]}
                                                </span>
                                                <span className="time-signature-den">
                                                    {staff.timeSignature.split('/')[1]}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="time-signature-empty">+</span>
                                        )}
                                    </div>
                                )}
                            </foreignObject>
                        </g>
                    )
                })}
            </svg>

            {/* Add staff button */}
            {onAddStaff && (
                <button
                    className="add-staff-button"
                    onClick={onAddStaff}
                    title="Add new staff"
                >
                    +
                </button>
            )}

            {/* Vertical scale indicator */}
            {verticalScale !== 1 && (
                <div className="vertical-scale-indicator">
                    {Math.round(verticalScale * 100)}%
                </div>
            )}
        </div>
    )
}
