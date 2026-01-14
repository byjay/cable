/**
 * Simplified Routing Service based on tray-fill/routing.ts
 * Uses BFS (Breadth-First Search) with Checkpoint support
 */

import { CableData, NodeData, Cable, Node } from '../types';

interface GraphNode {
  name: string;
  neighbors: string[];
}

// Build graph from node relation strings
export const buildGraph = (nodes: (NodeData | Node)[]): Record<string, GraphNode> => {
  const graph: Record<string, GraphNode> = {};
  nodes.forEach(node => {
    const relation = (node as any).relation || '';
    const neighbors = relation
      ? String(relation).split(',').map((s: string) => s.trim()).filter((s: string) => s)
      : [];
    graph[node.name] = { name: node.name, neighbors };
  });
  return graph;
};

// BFS shortest path (simpler than Dijkstra, same result for unweighted graphs)
export const calculateShortestPath = (
  graph: Record<string, GraphNode>,
  start: string,
  end: string
): string[] | null => {
  if (start === end) return [start];
  if (!graph[start] || !graph[end]) return null;

  const queue: string[] = [start];
  const visited = new Set<string>();
  const parent: Record<string, string> = {};

  visited.add(start);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === end) {
      const path: string[] = [];
      let curr: string | undefined = end;
      while (curr) {
        path.unshift(curr);
        curr = parent[curr];
      }
      return path;
    }

    const neighbors = graph[current]?.neighbors || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent[neighbor] = current;
        queue.push(neighbor);
      }
    }
  }
  return null;
};

// Route all cables with checkpoint (CHECK_NODE) support
export const routeCables = (cables: (CableData | Cable)[], nodes: (NodeData | Node)[]): (CableData | Cable)[] => {
  if (nodes.length === 0) return cables;

  const graph = buildGraph(nodes);

  return cables.map(cable => {
    const fromNode = (cable as any).fromNode;
    const toNode = (cable as any).toNode;
    const checkNode = (cable as any).checkNode;

    if (!fromNode || !toNode) return cable;

    let path: string[] | null = null;

    // Check Node Logic (Checkpoint)
    if (checkNode) {
      const checks = checkNode.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      if (checks.length > 0) {
        const fullPath: string[] = [];
        let currentStart = fromNode;
        let valid = true;

        // From Start -> Check1 -> Check2 ... -> End
        for (const check of checks) {
          const seg = calculateShortestPath(graph, currentStart, check);
          if (seg) {
            if (fullPath.length > 0) fullPath.pop(); // Remove duplicate junction
            fullPath.push(...seg);
            currentStart = check;
          } else {
            valid = false;
            break;
          }
        }

        if (valid) {
          const finalSeg = calculateShortestPath(graph, currentStart, toNode);
          if (finalSeg) {
            if (fullPath.length > 0) fullPath.pop();
            fullPath.push(...finalSeg);
            path = fullPath;
          }
        }
      } else {
        path = calculateShortestPath(graph, fromNode, toNode);
      }
    } else {
      path = calculateShortestPath(graph, fromNode, toNode);
    }

    return {
      ...cable,
      calculatedPath: path || undefined
    };
  });
};

// Simple routing service class for compatibility
export class RoutingService {
  private graph: Record<string, GraphNode> = {};

  constructor(nodes: (NodeData | Node)[]) {
    this.graph = buildGraph(nodes);
  }

  findRoute(start: string, end: string, checkNodeStr?: string): { path: string[], distance: number, error?: string } {
    if (!this.graph[start]) return { path: [], distance: -1, error: `FROM node not found: [${start}]` };
    if (!this.graph[end]) return { path: [], distance: -1, error: `TO node not found: [${end}]` };

    let path: string[] | null = null;

    if (checkNodeStr) {
      const checks = checkNodeStr.split(',').map(s => s.trim()).filter(s => s);
      if (checks.length > 0) {
        const fullPath: string[] = [];
        let currentStart = start;
        let valid = true;

        for (const check of checks) {
          const seg = calculateShortestPath(this.graph, currentStart, check);
          if (seg) {
            if (fullPath.length > 0) fullPath.pop();
            fullPath.push(...seg);
            currentStart = check;
          } else {
            valid = false;
            break;
          }
        }

        if (valid) {
          const finalSeg = calculateShortestPath(this.graph, currentStart, end);
          if (finalSeg) {
            if (fullPath.length > 0) fullPath.pop();
            fullPath.push(...finalSeg);
            path = fullPath;
          }
        }
      }
    } else {
      path = calculateShortestPath(this.graph, start, end);
    }

    if (path) {
      return { path, distance: path.length - 1 };
    }
    return { path: [], distance: -1, error: 'Path not found' };
  }
}