using Cadence.Domain.Entities;

namespace Cadence.Domain.Sheet;

public sealed class DefaultGraphBuilder : IGraphBuilder
{
    public SheetGraph Build(Piece piece, Scheduling.ScheduleSnapshot? snapshot, SheetOptions opts)
    {
        var nodes = new List<SheetNode>();
        var edges = new List<SheetEdge>();

        foreach (var n in piece.Notes)
            nodes.Add(new SheetNode(n.Id, SheetNodeType.Note, n.Title, n.DurationBeats));

        foreach (var c in piece.Chords)
        {
            var weight = piece.Notes.Where(n => n.ChordId == c.Id).Sum(n => n.DurationBeats);
            nodes.Add(new SheetNode(c.Id, SheetNodeType.Chord, c.Name, weight));
        }

        nodes.Add(new SheetNode(piece.Id, SheetNodeType.Piece, piece.Title, piece.Notes.Sum(n => n.DurationBeats)));

        foreach (var n in piece.Notes)
        {
            var to = n.ChordId ?? piece.Id;
            edges.Add(new SheetEdge(n.Id, to, SheetEdgeType.Contains));
        }
        foreach (var c in piece.Chords)
            edges.Add(new SheetEdge(c.Id, piece.Id, SheetEdgeType.Aggregates));

        if (opts.OverlayDependencies)
        {
            foreach (var d in piece.Dependencies)
                edges.Add(new SheetEdge(d.PredecessorNoteId, d.SuccessorNoteId, SheetEdgeType.Dependency));
        }

        return new SheetGraph { Nodes = nodes, Edges = edges };
    }
}
