/**
 * Shared mapping from task status to musical accidental glyphs used in UI.
 * Keeps canvas plugin and React UI consistent.
 */

export function statusToAccidental(status: string): string {
    switch (status) {
        case 'in_progress':
            return '♯'
        case 'completed':
            return '♮'
        case 'blocked':
            return '♭'
        case 'cancelled':
            return '𝄪'
        default:
            return ''
    }
}


