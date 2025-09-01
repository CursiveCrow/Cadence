/**
 * Staff Domain Entity
 * Represents a staff (musical staff metaphor) for organizing tasks
 */

import { TimeSignature } from '../value-objects/TimeSignature'

export interface StaffProperties {
    id: string
    name: string
    numberOfLines: number
    lineSpacing: number
    position: number
    projectId: string
    createdAt: string
    updatedAt: string
    timeSignature?: string
}

export class Staff {
    private constructor(private props: StaffProperties) { }

    static create(props: Omit<StaffProperties, 'createdAt' | 'updatedAt'>): Staff {
        const now = new Date().toISOString()
        return new Staff({
            ...props,
            createdAt: now,
            updatedAt: now
        })
    }

    static fromPersistence(props: StaffProperties): Staff {
        return new Staff(props)
    }

    // Getters
    get id(): string { return this.props.id }
    get name(): string { return this.props.name }
    get numberOfLines(): number { return this.props.numberOfLines }
    get lineSpacing(): number { return this.props.lineSpacing }
    get position(): number { return this.props.position }
    get projectId(): string { return this.props.projectId }
    get createdAt(): string { return this.props.createdAt }
    get updatedAt(): string { return this.props.updatedAt }
    get timeSignature(): TimeSignature | undefined {
        return this.props.timeSignature ? TimeSignature.fromString(this.props.timeSignature) : undefined
    }

    // Business logic methods
    getTotalHeight(): number {
        return (this.props.numberOfLines - 1) * this.props.lineSpacing
    }

    getLineY(lineIndex: number): number {
        if (lineIndex < 0 || lineIndex >= this.props.numberOfLines) {
            throw new Error(`Line index ${lineIndex} out of bounds for staff with ${this.props.numberOfLines} lines`)
        }
        return lineIndex * this.props.lineSpacing
    }

    isValidLineIndex(lineIndex: number): boolean {
        return lineIndex >= 0 && lineIndex < this.props.numberOfLines
    }

    updateLayout(numberOfLines: number, lineSpacing: number): Staff {
        return new Staff({
            ...this.props,
            numberOfLines,
            lineSpacing,
            updatedAt: new Date().toISOString()
        })
    }

    updatePosition(position: number): Staff {
        return new Staff({
            ...this.props,
            position,
            updatedAt: new Date().toISOString()
        })
    }

    setTimeSignature(timeSignature: TimeSignature | undefined): Staff {
        return new Staff({
            ...this.props,
            timeSignature: timeSignature?.toString(),
            updatedAt: new Date().toISOString()
        })
    }

    rename(name: string): Staff {
        return new Staff({
            ...this.props,
            name,
            updatedAt: new Date().toISOString()
        })
    }

    toJSON(): StaffProperties {
        return { ...this.props }
    }
}
