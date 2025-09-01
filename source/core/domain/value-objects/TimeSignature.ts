/**
 * TimeSignature Value Object
 * Represents a musical time signature (e.g., 4/4, 3/4)
 */

export class TimeSignature {
    private constructor(
        private readonly numerator: number,
        private readonly denominator: number
    ) {
        if (numerator <= 0 || denominator <= 0) {
            throw new Error('Time signature values must be positive')
        }
        if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
            throw new Error('Time signature values must be integers')
        }
        // Denominator should be a power of 2 (common in music)
        if ((denominator & (denominator - 1)) !== 0) {
            throw new Error('Denominator must be a power of 2')
        }
    }

    static create(numerator: number, denominator: number): TimeSignature {
        return new TimeSignature(numerator, denominator)
    }

    static fromString(signature: string): TimeSignature {
        const parts = signature.split('/')
        if (parts.length !== 2) {
            throw new Error(`Invalid time signature format: ${signature}`)
        }
        const numerator = parseInt(parts[0], 10)
        const denominator = parseInt(parts[1], 10)
        if (isNaN(numerator) || isNaN(denominator)) {
            throw new Error(`Invalid time signature values: ${signature}`)
        }
        return new TimeSignature(numerator, denominator)
    }

    static common4_4(): TimeSignature {
        return new TimeSignature(4, 4)
    }

    static common3_4(): TimeSignature {
        return new TimeSignature(3, 4)
    }

    static common6_8(): TimeSignature {
        return new TimeSignature(6, 8)
    }

    getNumerator(): number {
        return this.numerator
    }

    getDenominator(): number {
        return this.denominator
    }

    getBeatsPerMeasure(): number {
        return this.numerator
    }

    getBeatValue(): number {
        return 4 / this.denominator // Quarter note = 1 beat
    }

    toString(): string {
        return `${this.numerator}/${this.denominator}`
    }

    equals(other: TimeSignature): boolean {
        return this.numerator === other.numerator && this.denominator === other.denominator
    }

    isCommonTime(): boolean {
        return this.numerator === 4 && this.denominator === 4
    }

    isCutTime(): boolean {
        return this.numerator === 2 && this.denominator === 2
    }

    isCompound(): boolean {
        return this.numerator > 3 && this.numerator % 3 === 0
    }

    isSimple(): boolean {
        return !this.isCompound()
    }
}
