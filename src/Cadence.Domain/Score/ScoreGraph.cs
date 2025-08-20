using Cadence.Domain.Common;

namespace Cadence.Domain.Score;

public enum ScoreNodeType { Note, Chord, Piece }
public enum ScoreEdgeType { Contains, Aggregates, Dependency }

public sealed record ScoreNode(Id Id, ScoreNodeType Type, string Label, double WeightBeats);
public sealed record ScoreEdge(Id FromId, Id ToId, ScoreEdgeType Type);

public sealed class ScoreGraph
{
    public IReadOnlyList<ScoreNode> Nodes { get; init; } = Array.Empty<ScoreNode>();
    public IReadOnlyList<ScoreEdge> Edges { get; init; } = Array.Empty<ScoreEdge>();
}

public sealed record ScoreLayoutNode(Id Id, int Layer, double X, double Y, double Width, double Height);
public sealed record ScoreLayoutEdge(Id FromId, Id ToId, IReadOnlyList<(double X, double Y)> Polyline);

public sealed class SheetLayout
{
    public IReadOnlyList<ScoreLayoutNode> Nodes { get; init; } = Array.Empty<ScoreLayoutNode>();
    public IReadOnlyList<ScoreLayoutEdge> Edges { get; init; } = Array.Empty<ScoreLayoutEdge>();
}

public sealed record ScoreOptions(bool OverlayDependencies, bool AlignByScheduleTime, bool AggregateChordProgress);
public sealed record ScoreLayoutOptions(double ColumnGap, double RowGap, bool EdgeBundling, bool OrthogonalEdges);

public interface IGraphBuilder
{
    ScoreGraph Build(Entities.Piece piece, Scheduling.ScheduleSnapshot? snapshot, ScoreOptions opts);
}

public interface ILayoutEngine
{
    SheetLayout Layout(ScoreGraph graph, ScoreLayoutOptions options);
}
