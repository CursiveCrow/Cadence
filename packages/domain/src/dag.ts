/**
 * DAG (Directed Acyclic Graph) validation and operations
 * Ensures no circular dependencies and provides topological ordering
 */

import type { Note, Dependency, UUID, DAGValidationResult } from './types';

enum NodeColor {
  WHITE = 0, // Unvisited
  GRAY = 1,  // Visiting
  BLACK = 2  // Visited
}

export class DAG {
  private adjacencyList: Map<UUID, Set<UUID>>;
  private reverseAdjacencyList: Map<UUID, Set<UUID>>;
  private nodes: Set<UUID>;

  constructor(notes: Note[], dependencies: Dependency[]) {
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();
    this.nodes = new Set();

    // Initialize nodes
    notes.forEach(note => {
      this.nodes.add(note.id);
      this.adjacencyList.set(note.id, new Set());
      this.reverseAdjacencyList.set(note.id, new Set());
    });

    // Build adjacency lists
    dependencies.forEach(dep => {
      const srcList = this.adjacencyList.get(dep.srcNoteId);
      const dstList = this.reverseAdjacencyList.get(dep.dstNoteId);
      
      if (srcList) srcList.add(dep.dstNoteId);
      if (dstList) dstList.add(dep.srcNoteId);
    });
  }

  /**
   * Validate that the graph has no cycles
   */
  validate(): DAGValidationResult {
    const colors = new Map<UUID, NodeColor>();
    const cycles: UUID[][] = [];
    const stack: UUID[] = [];
    
    // Initialize all nodes as white
    this.nodes.forEach(node => colors.set(node, NodeColor.WHITE));

    const dfs = (nodeId: UUID): boolean => {
      colors.set(nodeId, NodeColor.GRAY);
      stack.push(nodeId);

      const neighbors = this.adjacencyList.get(nodeId) || new Set();
      
      for (const neighbor of neighbors) {
        const color = colors.get(neighbor);
        
        if (color === NodeColor.GRAY) {
          // Found a cycle
          const cycleStart = stack.indexOf(neighbor);
          const cycle = stack.slice(cycleStart);
          cycles.push([...cycle, neighbor]);
          return true;
        }
        
        if (color === NodeColor.WHITE) {
          if (dfs(neighbor)) {
            return true;
          }
        }
      }

      colors.set(nodeId, NodeColor.BLACK);
      stack.pop();
      return false;
    };

    // Check each component
    let hasCycle = false;
    for (const node of this.nodes) {
      if (colors.get(node) === NodeColor.WHITE) {
        if (dfs(node)) {
          hasCycle = true;
        }
      }
    }

    if (hasCycle) {
      return {
        valid: false,
        cycles
      };
    }

    // If no cycles, compute topological order
    const topologicalOrder = this.topologicalSort();
    
    return {
      valid: true,
      topologicalOrder
    };
  }

  /**
   * Perform topological sort using DFS
   */
  topologicalSort(): UUID[] {
    const visited = new Set<UUID>();
    const result: UUID[] = [];

    const dfs = (nodeId: UUID) => {
      visited.add(nodeId);
      
      const neighbors = this.adjacencyList.get(nodeId) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        }
      }
      
      result.push(nodeId);
    };

    // Visit all nodes
    for (const node of this.nodes) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return result.reverse();
  }

  /**
   * Check if adding an edge would create a cycle
   */
  wouldCreateCycle(src: UUID, dst: UUID): boolean {
    // Check if there's already a path from dst to src
    return this.hasPath(dst, src);
  }

  /**
   * Check if there's a path from source to destination
   */
  hasPath(src: UUID, dst: UUID): boolean {
    if (src === dst) return true;
    
    const visited = new Set<UUID>();
    const queue = [src];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current)) continue;
      visited.add(current);
      
      const neighbors = this.adjacencyList.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (neighbor === dst) return true;
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    
    return false;
  }

  /**
   * Get all predecessors of a node
   */
  getPredecessors(nodeId: UUID): UUID[] {
    return Array.from(this.reverseAdjacencyList.get(nodeId) || new Set());
  }

  /**
   * Get all successors of a node
   */
  getSuccessors(nodeId: UUID): UUID[] {
    return Array.from(this.adjacencyList.get(nodeId) || new Set());
  }

  /**
   * Get the transitive closure (all reachable nodes) from a given node
   */
  getTransitiveClosure(nodeId: UUID): Set<UUID> {
    const closure = new Set<UUID>();
    const visited = new Set<UUID>();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current)) continue;
      visited.add(current);
      
      if (current !== nodeId) {
        closure.add(current);
      }
      
      const neighbors = this.adjacencyList.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    
    return closure;
  }

  /**
   * Get the depth of each node (longest path from any root)
   */
  getNodeDepths(): Map<UUID, number> {
    const depths = new Map<UUID, number>();
    const indegrees = new Map<UUID, number>();
    
    // Initialize indegrees
    this.nodes.forEach(node => {
      const predecessors = this.reverseAdjacencyList.get(node) || new Set();
      indegrees.set(node, predecessors.size);
      depths.set(node, 0);
    });
    
    // Find roots (nodes with no predecessors)
    const queue: UUID[] = [];
    indegrees.forEach((degree, node) => {
      if (degree === 0) {
        queue.push(node);
      }
    });
    
    // BFS to calculate depths
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDepth = depths.get(current) || 0;
      
      const successors = this.adjacencyList.get(current) || new Set();
      for (const successor of successors) {
        depths.set(successor, Math.max(depths.get(successor) || 0, currentDepth + 1));
        
        const newIndegree = (indegrees.get(successor) || 0) - 1;
        indegrees.set(successor, newIndegree);
        
        if (newIndegree === 0) {
          queue.push(successor);
        }
      }
    }
    
    return depths;
  }
}
