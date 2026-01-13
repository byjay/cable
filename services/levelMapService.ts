import { Node, RouteResult } from '../types';

interface LevelNode {
  name: string;
  x: number;
  y: number;
  z: number;
  deck: string;
  structure?: string;
  component?: string;
  type?: string;
  level: number; // Calculated level based on z-coordinate
}

interface LevelMap {
  [level: number]: {
    nodes: LevelNode[];
    connections: Array<{
      from: string;
      to: string;
      distance: number;
      ratio: number; // Length ratio for proportional connections
    }>;
  };
}

interface NavigationMap {
  levels: LevelMap;
  interLevelConnections: Array<{
    fromLevel: number;
    toLevel: number;
    fromNode: string;
    toNode: string;
    distance: number;
    type: 'vertical' | 'horizontal';
  }>;
}

export class LevelMapService {
  private navigationMap: NavigationMap;
  private levelThresholds: { [level: number]: { min: number; max: number } };

  constructor(nodes: Node[]) {
    this.levelThresholds = this.calculateLevelThresholds(nodes);
    this.navigationMap = this.buildNavigationMap(nodes);
  }

  private calculateLevelThresholds(nodes: Node[]): { [level: number]: { min: number; max: number } } {
    const zCoords = nodes
      .filter(n => n.z !== undefined && n.z !== null)
      .map(n => n.z!)
      .sort((a, b) => a - b);

    if (zCoords.length === 0) {
      return { 0: { min: 0, max: 100 } };
    }

    const thresholds: { [level: number]: { min: number; max: number } } = {};
    const levelCount = Math.ceil(zCoords.length / 10); // Approximate 10 nodes per level
    
    for (let i = 0; i < levelCount; i++) {
      const startIdx = i * 10;
      const endIdx = Math.min((i + 1) * 10 - 1, zCoords.length - 1);
      
      thresholds[i] = {
        min: zCoords[startIdx] || 0,
        max: zCoords[endIdx] || zCoords[zCoords.length - 1]
      };
    }

    return thresholds;
  }

  private getLevel(z: number): number {
    for (const [level, threshold] of Object.entries(this.levelThresholds)) {
      if (z >= threshold.min && z <= threshold.max) {
        return parseInt(level);
      }
    }
    return 0; // Default level
  }

  private buildNavigationMap(nodes: Node[]): NavigationMap {
    const levelNodes: { [level: number]: LevelNode[] } = {};
    const levelMap: LevelMap = {};
    const interLevelConnections: NavigationMap['interLevelConnections'] = [];

    // Group nodes by level
    nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined && node.z !== undefined) {
        const level = this.getLevel(node.z);
        
        if (!levelNodes[level]) {
          levelNodes[level] = [];
        }
        
        if (!levelMap[level]) {
          levelMap[level] = {
            nodes: [],
            connections: []
          };
        }

        const levelNode: LevelNode = {
          name: node.name,
          x: node.x,
          y: node.y,
          z: node.z,
          deck: node.deck || '',
          structure: node.structure,
          component: node.component,
          type: node.type,
          level
        };

        levelNodes[level].push(levelNode);
        levelMap[level].nodes.push(levelNode);
      }
    });

    // Build intra-level connections
    Object.keys(levelMap).forEach(level => {
      const levelNum = parseInt(level);
      const nodesInLevel = levelMap[levelNum].nodes;
      
      nodesInLevel.forEach(node => {
        // Find connections based on node relations
        const originalNode = nodes.find(n => n.name === node.name);
        if (originalNode && originalNode.relation) {
          const neighbors = originalNode.relation.split(',').map(n => n.trim()).filter(n => n);
          
          neighbors.forEach(neighborName => {
            const neighborNode = nodesInLevel.find(n => n.name === neighborName);
            if (neighborNode) {
              const distance = this.calculateDistance(node, neighborNode);
              const totalLength = this.getTotalLevelLength(levelMap[levelNum]);
              const ratio = distance / totalLength;
              
              levelMap[levelNum].connections.push({
                from: node.name,
                to: neighborName,
                distance,
                ratio
              });
            }
          });
        }
      });
    });

    // Build inter-level connections
    Object.keys(levelNodes).forEach(level => {
      const levelNum = parseInt(level);
      const nodesInCurrentLevel = levelNodes[levelNum];
      
      // Check for vertical connections (same x,y, different z)
      Object.keys(levelNodes).forEach(otherLevel => {
        const otherLevelNum = parseInt(otherLevel);
        if (otherLevelNum !== levelNum) {
          const nodesInOtherLevel = levelNodes[otherLevelNum];
          
          nodesInCurrentLevel.forEach(node => {
            nodesInOtherLevel.forEach(otherNode => {
              if (this.isVerticalConnection(node, otherNode)) {
                const distance = Math.abs(node.z - otherNode.z);
                
                interLevelConnections.push({
                  fromLevel: levelNum,
                  toLevel: otherLevelNum,
                  fromNode: node.name,
                  toNode: otherNode.name,
                  distance,
                  type: 'vertical'
                });
              }
            });
          });
        }
      });
    });

    return {
      levels: levelMap,
      interLevelConnections
    };
  }

  private calculateDistance(node1: LevelNode, node2: LevelNode): number {
    const dx = node1.x - node2.x;
    const dy = node1.y - node2.y;
    const dz = node1.z - node2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private getTotalLevelLength(level: { nodes: LevelNode[], connections: any[] }): number {
    let totalLength = 0;
    const processedConnections = new Set<string>();
    
    level.connections.forEach(conn => {
      const key = `${conn.from}-${conn.to}`;
      const reverseKey = `${conn.to}-${conn.from}`;
      
      if (!processedConnections.has(key) && !processedConnections.has(reverseKey)) {
        totalLength += conn.distance;
        processedConnections.add(key);
      }
    });
    
    return totalLength;
  }

  private isVerticalConnection(node1: LevelNode, node2: LevelNode): boolean {
    // Consider vertical if x and y coordinates are very close (within 5 units)
    const dx = Math.abs(node1.x - node2.x);
    const dy = Math.abs(node1.y - node2.y);
    return dx < 5 && dy < 5 && Math.abs(node1.z - node2.z) > 10;
  }

  public getNavigationMap(): NavigationMap {
    return this.navigationMap;
  }

  public findRoute(from: string, to: string): RouteResult {
    // Check if nodes exist in the same level
    const fromNode = this.findNode(from);
    const toNode = this.findNode(to);

    if (!fromNode) {
      return { path: [], distance: -1, error: `FROM node not found: [${from}]` };
    }
    if (!toNode) {
      return { path: [], distance: -1, error: `TO node not found: [${to}]` };
    }

    // Same level routing
    if (fromNode.level === toNode.level) {
      return this.findIntraLevelRoute(fromNode.level, from, to);
    }

    // Inter-level routing
    return this.findInterLevelRoute(from, to);
  }

  private findNode(nodeName: string): LevelNode | null {
    for (const level of Object.values(this.navigationMap.levels)) {
      const node = level.nodes.find(n => n.name === nodeName);
      if (node) return node;
    }
    return null;
  }

  private findIntraLevelRoute(level: number, from: string, to: string): RouteResult {
    const levelData = this.navigationMap.levels[level];
    if (!levelData) {
      return { path: [], distance: -1, error: `Level ${level} not found` };
    }

    // Build graph for this level
    const graph: { [key: string]: { [neighbor: string]: number } } = {};
    levelData.connections.forEach(conn => {
      if (!graph[conn.from]) graph[conn.from] = {};
      graph[conn.from][conn.to] = conn.distance;
      
      if (!graph[conn.to]) graph[conn.to] = {};
      graph[conn.to][conn.from] = conn.distance;
    });

    // Use Dijkstra algorithm
    return this.dijkstra(graph, from, to);
  }

  private findInterLevelRoute(from: string, to: string): RouteResult {
    const fromNode = this.findNode(from);
    const toNode = this.findNode(to);

    if (!fromNode || !toNode) {
      return { path: [], distance: -1, error: 'Nodes not found' };
    }

    // Find path through level connections
    const levelPath = this.findLevelPath(fromNode.level, toNode.level);
    
    if (levelPath.length === 0) {
      return { path: [], distance: -1, error: 'No level path found' };
    }

    const fullPath: string[] = [from];
    let totalDistance = 0;

    // Route through each level transition
    for (let i = 0; i < levelPath.length - 1; i++) {
      const fromLevel = levelPath[i];
      const toLevel = levelPath[i + 1];
      
      // Find best connection between levels
      const bestConnection = this.findBestLevelConnection(fromLevel, toLevel, fullPath[fullPath.length - 1]);
      
      if (!bestConnection) {
        return { path: [], distance: -1, error: `No connection from level ${fromLevel} to ${toLevel}` };
      }

      // Route within current level to connection point
      const intraRoute = this.findIntraLevelRoute(fromLevel, fullPath[fullPath.length - 1], bestConnection.fromNode);
      if (intraRoute.distance < 0) {
        return { path: [], distance: -1, error: `Cannot reach ${bestConnection.fromNode} in level ${fromLevel}` };
      }

      fullPath.push(...intraRoute.path.slice(1));
      totalDistance += intraRoute.distance;
      totalDistance += bestConnection.distance;
      
      // Add inter-level connection
      fullPath.push(bestConnection.toNode);
    }

    // Final route to destination
    const finalRoute = this.findIntraLevelRoute(toNode.level, fullPath[fullPath.length - 1], to);
    if (finalRoute.distance < 0) {
      return { path: [], distance: -1, error: `Cannot reach ${to} in level ${toNode.level}` };
    }

    fullPath.push(...finalRoute.path.slice(1));
    totalDistance += finalRoute.distance;

    return { path: fullPath, distance: totalDistance };
  }

  private findLevelPath(fromLevel: number, toLevel: number): number[] {
    if (fromLevel === toLevel) return [fromLevel];

    const visited = new Set<number>();
    const queue: { level: number; path: number[] }[] = [{ level: fromLevel, path: [fromLevel] }];

    while (queue.length > 0) {
      const { level, path } = queue.shift()!;
      
      if (level === toLevel) {
        return path;
      }

      if (visited.has(level)) continue;
      visited.add(level);

      // Find all connections from this level
      const connections = this.navigationMap.interLevelConnections.filter(
        conn => conn.fromLevel === level || conn.toLevel === level
      );

      for (const conn of connections) {
        const nextLevel = conn.fromLevel === level ? conn.toLevel : conn.fromLevel;
        if (!visited.has(nextLevel)) {
          queue.push({ level: nextLevel, path: [...path, nextLevel] });
        }
      }
    }

    return [];
  }

  private findBestLevelConnection(fromLevel: number, toLevel: number, fromNode: string): any {
    const connections = this.navigationMap.interLevelConnections.filter(
      conn => (conn.fromLevel === fromLevel && conn.toLevel === toLevel) ||
             (conn.fromLevel === toLevel && conn.toLevel === fromLevel)
    );

    // Find connection closest to fromNode
    let bestConnection = null;
    let minDistance = Infinity;

    for (const conn of connections) {
      const actualFromNode = conn.fromLevel === fromLevel ? conn.fromNode : conn.toNode;
      const distance = this.calculateIntraLevelDistance(fromLevel, fromNode, actualFromNode);
      
      if (distance < minDistance) {
        minDistance = distance;
        bestConnection = conn;
      }
    }

    return bestConnection;
  }

  private calculateIntraLevelDistance(level: number, fromNode: string, toNode: string): number {
    const levelData = this.navigationMap.levels[level];
    if (!levelData) return Infinity;

    const from = levelData.nodes.find(n => n.name === fromNode);
    const to = levelData.nodes.find(n => n.name === toNode);
    
    if (!from || !to) return Infinity;
    return this.calculateDistance(from, to);
  }

  private dijkstra(graph: { [key: string]: { [neighbor: string]: number } }, start: string, end: string): RouteResult {
    const distances: { [key: string]: number } = {};
    const previous: { [key: string]: string | null } = {};
    const unvisited = new Set<string>();

    // Initialize
    for (const node in graph) {
      distances[node] = Infinity;
      previous[node] = null;
      unvisited.add(node);
    }
    distances[start] = 0;

    while (unvisited.size > 0) {
      let u: string | null = null;
      let minDist = Infinity;

      for (const node of unvisited) {
        if (distances[node] < minDist) {
          minDist = distances[node];
          u = node;
        }
      }

      if (u === null || distances[u] === Infinity) break;
      if (u === end) break;

      unvisited.delete(u);

      const neighbors = graph[u];
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

  public getLevelVisualizationData(): any {
    const visualizationData: any = {};
    
    Object.keys(this.navigationMap.levels).forEach(level => {
      const levelNum = parseInt(level);
      const levelData = this.navigationMap.levels[levelNum];
      
      visualizationData[levelNum] = {
        nodes: levelData.nodes.map(node => ({
          id: node.name,
          x: node.x,
          y: node.y,
          z: node.z,
          deck: node.deck,
          type: node.type,
          level: node.level
        })),
        connections: levelData.connections.map(conn => ({
          source: conn.from,
          target: conn.to,
          distance: conn.distance,
          ratio: conn.ratio,
          strokeWidth: Math.max(1, conn.ratio * 10) // Scale ratio for visualization
        }))
      };
    });

    // Add inter-level connections
    visualizationData.interLevel = this.navigationMap.interLevelConnections.map(conn => ({
      source: conn.fromNode,
      target: conn.toNode,
      fromLevel: conn.fromLevel,
      toLevel: conn.toLevel,
      distance: conn.distance,
      type: conn.type,
      color: conn.type === 'vertical' ? '#ff6b6b' : '#4ecdc4'
    }));

    return visualizationData;
  }
}
