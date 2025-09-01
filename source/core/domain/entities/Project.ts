/**
 * Project Domain Entity
 * Represents a project containing tasks, dependencies, and staffs
 */

import { TimeRange } from '../value-objects/TimeRange'

export interface ProjectProperties {
    id: string
    name: string
    startDate: string
    endDate: string
    createdAt: string
    updatedAt: string
}

export class Project {
    private constructor(private props: ProjectProperties) { }

    static create(props: Omit<ProjectProperties, 'createdAt' | 'updatedAt'>): Project {
        const now = new Date().toISOString()
        return new Project({
            ...props,
            createdAt: now,
            updatedAt: now
        })
    }

    static fromPersistence(props: ProjectProperties): Project {
        return new Project(props)
    }

    // Getters
    get id(): string { return this.props.id }
    get name(): string { return this.props.name }
    get startDate(): string { return this.props.startDate }
    get endDate(): string { return this.props.endDate }
    get createdAt(): string { return this.props.createdAt }
    get updatedAt(): string { return this.props.updatedAt }

    // Business logic methods
    get timeRange(): TimeRange {
        return TimeRange.create(this.props.startDate, this.props.endDate)
    }

    getDurationInDays(): number {
        const start = new Date(this.props.startDate)
        const end = new Date(this.props.endDate)
        const diffTime = Math.abs(end.getTime() - start.getTime())
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    extendEndDate(newEndDate: string): Project {
        if (new Date(newEndDate) < new Date(this.props.startDate)) {
            throw new Error('End date cannot be before start date')
        }
        return new Project({
            ...this.props,
            endDate: newEndDate,
            updatedAt: new Date().toISOString()
        })
    }

    updateDateRange(startDate: string, endDate: string): Project {
        if (new Date(endDate) < new Date(startDate)) {
            throw new Error('End date cannot be before start date')
        }
        return new Project({
            ...this.props,
            startDate,
            endDate,
            updatedAt: new Date().toISOString()
        })
    }

    rename(name: string): Project {
        return new Project({
            ...this.props,
            name,
            updatedAt: new Date().toISOString()
        })
    }

    containsDate(date: string): boolean {
        const checkDate = new Date(date)
        const start = new Date(this.props.startDate)
        const end = new Date(this.props.endDate)
        return checkDate >= start && checkDate <= end
    }

    toJSON(): ProjectProperties {
        return { ...this.props }
    }
}
