import { Node, RouteResult } from '../types';
import { LevelMapService } from './levelMapService';

interface Graph {
  [key: string]: { [neighbor: string]: number };
}

export class RoutingService {
  private graph: Graph = {};
  private levelMapService: LevelMapService;

  constructor(nodes: Node[]) {
    this.buildGraph(nodes);
    this.levelMapService = new LevelMapService(nodes);
  }

  private buildGraph(nodes: Node[]) {
    this.graph = {};
    nodes.forEach(node => {
      if (!this.graph[node.name]) {
        this.graph[node.name] = {};
      }
      if (node.relation) {
        // Handle relations separated by commas
        const neighbors = node.relation.split(',').map(n => n.trim()).filter(n => n);
        neighbors.forEach(neighbor => {
          // Add edge - Default to distance 20m if not specified
          const dist = node.linkLength && node.linkLength > 0 ? node.linkLength : 20;
          this.graph[node.name][neighbor] = dist;

          // Bidirectional safety
          if (!this.graph[neighbor]) {
            this.graph[neighbor] = {};
          }
          this.graph[neighbor][node.name] = dist;
        });
      }
    });
  }

  // Enhanced routing with level-aware navigation
  public findRoute(start: string, end: string, checkNodeStr?: string): RouteResult {
    const waypoints = checkNodeStr ? checkNodeStr.split(',').map(s => s.trim()).filter(s => s) : [];

    if (waypoints.length > 0) {
      return this.calculatePathWithWaypoints(start, end, waypoints);
    }
    
    // Try level-aware routing first
    const levelRoute = this.levelMapService.findRoute(start, end);
    if (levelRoute.distance >= 0 && levelRoute.path.length > 0) {
      return levelRoute;
    }
    
    // Fallback to original Dijkstra routing
    return this.dijkstra(start, end);
  }

  // Get level map visualization data
  public getLevelMapData(): any {
    return this.levelMapService.getLevelVisualizationData();
  }

  // Get navigation map for debugging
  public getNavigationMap(): any {
    return this.levelMapService.getNavigationMap();
  }

  private calculatePathWithWaypoints(start: string, end: string, waypoints: string[]): RouteResult {
    const fullPath: string[] = [start];
    let totalDistance = 0;
    let current = start;

    // Visit each waypoint
    for (const waypoint of waypoints) {
      const segment = this.dijkstra(current, waypoint);

      if (segment.distance < 0) {
        return {
          path: [],
          distance: -1,
          error: `Cannot reach waypoint ${waypoint} from ${current}`
        };
      }

      // Add segment to path (exclude first node to avoid duplication)
      fullPath.push(...segment.path.slice(1));
      totalDistance += segment.distance;
      current = waypoint;
    }

    // Final leg from last waypoint to end
    const finalSegment = this.dijkstra(current, end);
    if (finalSegment.distance < 0) {
      return {
        path: [],
        distance: -1,
        error: `Cannot reach destination ${end} from last waypoint ${current}`
      };
    }

    fullPath.push(...finalSegment.path.slice(1));
    totalDistance += finalSegment.distance;

    return { path: fullPath, distance: totalDistance };
  }

  private dijkstra(start: string, end: string): RouteResult {
    // Basic checks with detailed error messages
    const startExists = !!this.graph[start];
    const endExists = !!this.graph[end];

    if (!startExists && !endExists) {
      return { path: [], distance: -1, error: `Both nodes missing: FROM[${start}] TO[${end}]` };
    }
    if (!startExists) {
      return { path: [], distance: -1, error: `FROM node not found: [${start}]` };
    }
    if (!endExists) {
      return { path: [], distance: -1, error: `TO node not found: [${end}]` };
    }
    if (start === end) {
      return { path: [start], distance: 0 };
    }

    const distances: { [key: string]: number } = {};
    const previous: { [key: string]: string | null } = {};
    const unvisited = new Set<string>();

    // Initialize
    for (const node in this.graph) {
      distances[node] = Infinity;
      previous[node] = null;
      unvisited.add(node);
    }
    distances[start] = 0;

    while (unvisited.size > 0) {
      // Get node with min distance
      let u: string | null = null;
      let minDesc = Infinity;

      for (const node of unvisited) {
        if (distances[node] < minDesc) {
          minDesc = distances[node];
          u = node;
        }
      }

      if (u === null || distances[u] === Infinity) break; // unreachable remaining
      if (u === end) break; // found target

      unvisited.delete(u);

      const neighbors = this.graph[u];
      for (const v in neighbors) {
        if (unvisited.has(v)) {
          const alt = distances[u] + neighbors[v];
          if (alt < distances[v]) {
            distances[v] = alt;
            previous[v] = u;
          }
        }
      }
    }

    // Reconstruct path
    if (distances[end] === Infinity) {
      return { path: [], distance: -1, error: "Target unreachable" };
    }

    const path: string[] = [];
    let curr: string | null = end;
    while (curr) {
      path.unshift(curr);
      curr = previous[curr];
    }

    return { path, distance: distances[end] };
  }
}