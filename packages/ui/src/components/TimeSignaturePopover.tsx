import React, { useState, useEffect } from 'react'
import '../styles/ui.css'
import './TimeSignaturePopover.css'

export interface TimeSignaturePopoverProps {
    anchorElement: HTMLElement | null
    initialValue: string
    onClose: () => void
    onSave: (newValue: string) => void
}

export const TimeSignaturePopover: React.FC<TimeSignaturePopoverProps> = ({ anchorElement, initialValue, onClose, onSave }) => {
    const [value, setValue] = useState(initialValue)
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

    useEffect(() => {
        if (anchorElement) {
            const rect = anchorElement.getBoundingClientRect()
            setPosition({
                top: rect.top,
                left: rect.right + 8,
            })
        }
    }, [anchorElement])

    const handleSave = () => {
        onSave(value)
        onClose()
    }

    if (!position) return null

    return (
        <div className="ui-overlay-backdrop-transparent" onClick={onClose}>
            <div
                className="ui-surface-1 ui-shadow ui-rounded-md ts-popover"
                style={{ top: position.top, left: position.left }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="ui-p-3">
                    <label htmlFor="time-signature-input" className="ui-text-sm ui-font-600">Time Signature</label>
                    <input
                        id="time-signature-input"
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="ui-input"
                        autoFocus
                    />
                    <div className="ui-flex ui-justify-end ui-gap-2" style={{ marginTop: '12px' }}>
                        <button onClick={onClose} className="ui-btn ui-rounded-md">Cancel</button>
                        <button onClick={handleSave} className="ui-btn ui-btn-primary ui-rounded-md">Save</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

