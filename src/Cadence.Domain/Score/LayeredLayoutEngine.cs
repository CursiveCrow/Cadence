namespace Cadence.Domain.Score;

public sealed class LayeredLayoutEngine : ILayoutEngine
{
    public SheetLayout Layout(ScoreGraph graph, ScoreLayoutOptions options)
    {
        // Simple 3-lane layered layout: Notes (0), Chords (1), Piece (2)
        var nodes = new List<ScoreLayoutNode>();
        var yNote = 0.0; var yChord = 0.0; var yPiece = 0.0;
        double colGap = options.ColumnGap <= 0 ? 240 : options.ColumnGap;
        double rowGap = options.RowGap <= 0 ? 32 : options.RowGap;

        foreach (var n in graph.Nodes.Where(n => n.Type == ScoreNodeType.Note))
        {
            nodes.Add(new ScoreLayoutNode(n.Id, 0, 0, yNote, 200, 28));
            yNote += 28 + rowGap;
        }
        foreach (var c in graph.Nodes.Where(n => n.Type == ScoreNodeType.Chord))
        {
            nodes.Add(new ScoreLayoutNode(c.Id, 1, colGap, yChord, 220, 36));
            yChord += 36 + rowGap;
        }
        foreach (var p in graph.Nodes.Where(n => n.Type == ScoreNodeType.Piece))
        {
            nodes.Add(new ScoreLayoutNode(p.Id, 2, 2*colGap, yPiece, 240, 40));
            yPiece += 40 + rowGap;
        }

        // Straight-line edges (orthogonal not implemented in stub)
        var edges = new List<ScoreLayoutEdge>();
        foreach (var e in graph.Edges)
        {
            var from = nodes.FirstOrDefault(n => n.Id.Equals(e.FromId));
            var to   = nodes.FirstOrDefault(n => n.Id.Equals(e.ToId));
            if (from.Equals(default(ScoreLayoutNode)) || to.Equals(default(ScoreLayoutNode))) continue;
            edges.Add(new ScoreLayoutEdge(e.FromId, e.ToId, new [] { (from.X+from.Width, from.Y+from.Height/2), (to.X, to.Y+to.Height/2) } ));
        }

        return new SheetLayout { Nodes = nodes, Edges = edges };
    }
}
