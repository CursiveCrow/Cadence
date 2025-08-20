namespace Cadence.Domain.Sheet;

public sealed class LayeredLayoutEngine : ILayoutEngine
{
    public SheetLayout Layout(SheetGraph graph, SheetLayoutOptions options)
    {
        // Simple 3-lane layered layout: Notes (0), Chords (1), Piece (2)
        var nodes = new List<SheetLayoutNode>();
        var yNote = 0.0; var yChord = 0.0; var yPiece = 0.0;
        double colGap = options.ColumnGap <= 0 ? 240 : options.ColumnGap;
        double rowGap = options.RowGap <= 0 ? 32 : options.RowGap;

        foreach (var n in graph.Nodes.Where(n => n.Type == SheetNodeType.Note))
        {
            nodes.Add(new SheetLayoutNode(n.Id, 0, 0, yNote, 200, 28));
            yNote += 28 + rowGap;
        }
        foreach (var c in graph.Nodes.Where(n => n.Type == SheetNodeType.Chord))
        {
            nodes.Add(new SheetLayoutNode(c.Id, 1, colGap, yChord, 220, 36));
            yChord += 36 + rowGap;
        }
        foreach (var p in graph.Nodes.Where(n => n.Type == SheetNodeType.Piece))
        {
            nodes.Add(new SheetLayoutNode(p.Id, 2, 2*colGap, yPiece, 240, 40));
            yPiece += 40 + rowGap;
        }

        // Straight-line edges (orthogonal not implemented in stub)
        var edges = new List<SheetLayoutEdge>();
        foreach (var e in graph.Edges)
        {
            var from = nodes.FirstOrDefault(n => n.Id.Equals(e.FromId));
            var to   = nodes.FirstOrDefault(n => n.Id.Equals(e.ToId));
            if (from.Equals(default(SheetLayoutNode)) || to.Equals(default(SheetLayoutNode))) continue;
            edges.Add(new SheetLayoutEdge(e.FromId, e.ToId, new [] { (from.X+from.Width, from.Y+from.Height/2), (to.X, to.Y+to.Height/2) } ));
        }

        return new SheetLayout { Nodes = nodes, Edges = edges };
    }
}
