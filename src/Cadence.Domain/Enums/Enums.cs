namespace Cadence.Domain.Enums;

public enum NoteStatus
{
    Planned,
    InProgress,
    Blocked,
    Done
}

public enum ScheduleMode
{
    Forward, // ASAP
    Backward // ALAP
}

public enum AvailabilityType
{
    Workday,
    Holiday
}