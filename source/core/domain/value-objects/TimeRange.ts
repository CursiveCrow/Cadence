/**
 * TimeRange Value Object
 * Represents an immutable time range with start and end dates
 */

export class TimeRange {
    private constructor(
        private readonly startDate: Date,
        private readonly endDate: Date
    ) {
        if (endDate < startDate) {
            throw new Error('End date cannot be before start date')
        }
    }

    static create(startDate: string, endDate: string): TimeRange {
        return new TimeRange(new Date(startDate), new Date(endDate))
    }

    static fromDates(startDate: Date, endDate: Date): TimeRange {
        return new TimeRange(startDate, endDate)
    }

    getStartDate(): Date {
        return new Date(this.startDate)
    }

    getEndDate(): Date {
        return new Date(this.endDate)
    }

    getStartDateString(): string {
        return this.startDate.toISOString().split('T')[0]
    }

    getEndDateString(): string {
        return this.endDate.toISOString().split('T')[0]
    }

    getDurationInDays(): number {
        const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime())
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    getDurationInHours(): number {
        const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime())
        return Math.ceil(diffTime / (1000 * 60 * 60))
    }

    contains(date: string | Date): boolean {
        const checkDate = typeof date === 'string' ? new Date(date) : date
        return checkDate >= this.startDate && checkDate <= this.endDate
    }

    overlaps(other: TimeRange): boolean {
        return this.startDate <= other.endDate && this.endDate >= other.startDate
    }

    equals(other: TimeRange): boolean {
        return this.startDate.getTime() === other.startDate.getTime() &&
            this.endDate.getTime() === other.endDate.getTime()
    }

    extend(days: number): TimeRange {
        const newEndDate = new Date(this.endDate)
        newEndDate.setDate(newEndDate.getDate() + days)
        return new TimeRange(this.startDate, newEndDate)
    }

    shift(days: number): TimeRange {
        const newStartDate = new Date(this.startDate)
        const newEndDate = new Date(this.endDate)
        newStartDate.setDate(newStartDate.getDate() + days)
        newEndDate.setDate(newEndDate.getDate() + days)
        return new TimeRange(newStartDate, newEndDate)
    }

    merge(other: TimeRange): TimeRange {
        const newStartDate = this.startDate < other.startDate ? this.startDate : other.startDate
        const newEndDate = this.endDate > other.endDate ? this.endDate : other.endDate
        return new TimeRange(newStartDate, newEndDate)
    }

    intersection(other: TimeRange): TimeRange | null {
        if (!this.overlaps(other)) {
            return null
        }
        const newStartDate = this.startDate > other.startDate ? this.startDate : other.startDate
        const newEndDate = this.endDate < other.endDate ? this.endDate : other.endDate
        return new TimeRange(newStartDate, newEndDate)
    }

    toString(): string {
        return `${this.getStartDateString()} - ${this.getEndDateString()}`
    }
}
