using Cadence.Domain.Common;

namespace Cadence.Domain.Sheet;

public enum SheetNodeType { Note, Chord, Piece }
public enum SheetEdgeType { Contains, Aggregates, Dependency }

public sealed record SheetNode(Id Id, SheetNodeType Type, string Label, double WeightBeats);
public sealed record SheetEdge(Id FromId, Id ToId, SheetEdgeType Type);

public sealed class SheetGraph
{
    public IReadOnlyList<SheetNode> Nodes { get; init; } = Array.Empty<SheetNode>();
    public IReadOnlyList<SheetEdge> Edges { get; init; } = Array.Empty<SheetEdge>();
}

public sealed record SheetLayoutNode(Id Id, int Layer, double X, double Y, double Width, double Height);
public sealed record SheetLayoutEdge(Id FromId, Id ToId, IReadOnlyList<(double X, double Y)> Polyline);

public sealed class SheetLayout
{
    public IReadOnlyList<SheetLayoutNode> Nodes { get; init; } = Array.Empty<SheetLayoutNode>();
    public IReadOnlyList<SheetLayoutEdge> Edges { get; init; } = Array.Empty<SheetLayoutEdge>();
}

public sealed record SheetOptions(bool OverlayDependencies, bool AlignByScheduleTime, bool AggregateChordProgress);
public sealed record SheetLayoutOptions(double ColumnGap, double RowGap, bool EdgeBundling, bool OrthogonalEdges);

public interface IGraphBuilder
{
    SheetGraph Build(Entities.Piece piece, Scheduling.ScheduleSnapshot? snapshot, SheetOptions opts);
}

public interface ILayoutEngine
{
    SheetLayout Layout(SheetGraph graph, SheetLayoutOptions options);
}
