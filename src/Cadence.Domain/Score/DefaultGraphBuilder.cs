using Cadence.Domain.Entities;

namespace Cadence.Domain.Score;

public sealed class DefaultGraphBuilder : IGraphBuilder
{
    public ScoreGraph Build(Piece piece, Scheduling.ScheduleSnapshot? snapshot, ScoreOptions opts)
    {
        var nodes = new List<ScoreNode>();
        var edges = new List<ScoreEdge>();

        foreach (var n in piece.Notes)
            nodes.Add(new SheetNode(n.Id, ScoreNodeType.Note, n.Title, n.DurationBeats));

        foreach (var c in piece.Chords)
        {
            var weight = piece.Notes.Where(n => n.ChordId == c.Id).Sum(n => n.DurationBeats);
            nodes.Add(new SheetNode(c.Id, ScoreNodeType.Chord, c.Name, weight));
        }

        nodes.Add(new SheetNode(piece.Id, ScoreNodeType.Piece, piece.Title, piece.Notes.Sum(n => n.DurationBeats)));

        foreach (var n in piece.Notes)
        {
            var to = n.ChordId ?? piece.Id;
            edges.Add(new SheetEdge(n.Id, to, ScoreEdgeType.Contains));
        }
        foreach (var c in piece.Chords)
            edges.Add(new SheetEdge(c.Id, piece.Id, ScoreEdgeType.Aggregates));

        if (opts.OverlayDependencies)
        {
            foreach (var d in piece.Dependencies)
                edges.Add(new SheetEdge(d.PredecessorNoteId, d.SuccessorNoteId, ScoreEdgeType.Dependency));
        }

        return new ScoreGraph { Nodes = nodes, Edges = edges };
    }
}
