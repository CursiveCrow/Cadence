import type { Note, Dependency } from './types';

// Assigns a lane (row) to each note. Notes in a dependency chain
// share the same lane when possible. Fan-out dependents occupy
// adjacent lanes.
export function assignLanes(
  notes: Record<string, Note>,
  deps: Dependency[],
): Record<string, number> {
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();

  deps.forEach((dep) => {
    if (!incoming.has(dep.dstId)) incoming.set(dep.dstId, []);
    incoming.get(dep.dstId)!.push(dep.srcId);

    if (!outgoing.has(dep.srcId)) outgoing.set(dep.srcId, []);
    outgoing.get(dep.srcId)!.push(dep.dstId);
  });

  const lanes: Record<string, number> = {};
  const visited = new Set<string>();

  function dfs(id: string, lane: number) {
    lanes[id] = lane;
    visited.add(id);

    const children = (outgoing.get(id) ?? []).sort(
      (a, b) => notes[a].startBeat - notes[b].startBeat,
    );

    children.forEach((child, idx) => {
      if (!visited.has(child)) {
        dfs(child, lane + idx);
      }
    });
  }

  const allIds = Object.keys(notes);
  const roots = allIds.filter((id) => !incoming.has(id));
  roots
    .sort((a, b) => notes[a].startBeat - notes[b].startBeat)
    .forEach((id, idx) => dfs(id, idx));

  allIds.forEach((id) => {
    if (!(id in lanes)) {
      dfs(id, Object.keys(lanes).length);
    }
  });

  return lanes;
}
