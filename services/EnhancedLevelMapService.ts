import { Node, RouteResult } from '../types';

interface EnhancedNode {
  id: string;
  x: number;
  y: number;
  z: number;
  level: number;
  deck?: string;
  structure?: string;
  component?: string;
  type?: string;
}

interface LevelConnection {
  from: string;
  to: string;
  distance: number;
  ratio: number;
  type: 'intra' | 'vertical' | 'horizontal';
  level?: number;
  fromLevel?: number;
  toLevel?: number;
}

interface LevelData {
  nodes: EnhancedNode[];
  connections: LevelConnection[];
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  center: { x: number; y: number; z: number };
}

interface NavigationMap {
  levels: { [key: number]: LevelData };
  interLevelConnections: LevelConnection[];
}

export class EnhancedLevelMapService {
  private navigationMap: NavigationMap;
  private precisionThreshold: number = 3; // 수직 연결 감지 임계값
  private levelNodeCount: number = 15; // 레벨당 노드 수

  constructor(nodes: Node[]) {
    this.navigationMap = this.buildEnhancedNavigationMap(nodes);
  }

  // 고정밀도 좌표계산 및 레벨링 시스템
  private buildEnhancedNavigationMap(nodes: Node[]): NavigationMap {
    // 실제 좌표가 있는 노드 필터링
    const nodesWithCoords = nodes.filter(n => 
      n.x !== undefined && n.y !== undefined && n.z !== undefined && 
      n.x !== 0 && n.y !== 0 && n.z !== 0
    );

    if (nodesWithCoords.length === 0) {
      return { levels: {}, interLevelConnections: [] };
    }

    // Z좌표 기반 동적 레벨링
    const zCoords = nodesWithCoords.map(n => n.z!).sort((a, b) => a - b);
    const levelCount = Math.ceil(zCoords.length / this.levelNodeCount);
    const levelThresholds: { [level: number]: { min: number; max: number } } = {};
    
    for (let i = 0; i < levelCount; i++) {
      const startIdx = i * this.levelNodeCount;
      const endIdx = Math.min((i + 1) * this.levelNodeCount - 1, zCoords.length - 1);
      
      levelThresholds[i] = {
        min: zCoords[startIdx] || 0,
        max: zCoords[endIdx] || zCoords[zCoords.length - 1]
      };
    }

    const getLevel = (z: number): number => {
      for (const [level, threshold] of Object.entries(levelThresholds)) {
        if (z >= threshold.min && z <= threshold.max) {
          return parseInt(level);
        }
      }
      return 0;
    };

    // 레벨별 데이터 그룹화
    const levelGroups: { [key: number]: EnhancedNode[] } = {};
    
    nodesWithCoords.forEach(node => {
      const level = getLevel(node.z!);
      if (!levelGroups[level]) {
        levelGroups[level] = [];
      }
      
      levelGroups[level].push({
        id: node.name,
        x: node.x!,
        y: node.y!,
        z: node.z!,
        level,
        deck: node.deck,
        structure: node.structure,
        component: node.component,
        type: node.type
      });
    });

    // 각 레벨의 경계 상자 및 중앙점 계산
    const levels: { [key: number]: LevelData } = {};
    
    Object.keys(levelGroups).forEach(level => {
      const levelNum = parseInt(level);
      const levelNodes = levelGroups[levelNum];
      
      if (levelNodes.length === 0) return;

      // 경계 상자 계산
      const boundingBox = {
        min: { x: Math.min(...levelNodes.map(n => n.x)), y: Math.min(...levelNodes.map(n => n.y)), z: Math.min(...levelNodes.map(n => n.z)) },
        max: { x: Math.max(...levelNodes.map(n => n.x)), y: Math.max(...levelNodes.map(n => n.y)), z: Math.max(...levelNodes.map(n => n.z)) }
      };

      // 중앙점 계산
      const center = {
        x: (boundingBox.min.x + boundingBox.max.x) / 2,
        y: (boundingBox.min.y + boundingBox.max.y) / 2,
        z: (boundingBox.min.z + boundingBox.max.z) / 2
      };

      // 다차원 연결관계 분석
      const connections: LevelConnection[] = [];
      
      levelNodes.forEach(node => {
        const originalNode = nodes.find(n => n.name === node.id);
        if (originalNode?.relation) {
          const neighbors = originalNode.relation.split(',').map(n => n.trim()).filter(n => n);
          
          neighbors.forEach(neighborName => {
            const neighborNode = levelNodes.find(n => n.id === neighborName);
            if (neighborNode) {
              const distance = this.calculateDistance(node, neighborNode);
              const levelTotalDistance = this.calculateLevelTotalDistance(levelNodes);
              const ratio = distance / levelTotalDistance;
              
              connections.push({
                from: node.id,
                to: neighborName,
                distance,
                ratio,
                type: 'intra',
                level: levelNum
              });
            }
          });
        }
      });

      levels[levelNum] = {
        nodes: levelNodes,
        connections,
        boundingBox,
        center
      };
    });

    // 3D 공간 기반 수직/수평 연결 감지
    const interLevelConnections = this.detect3DSpaceConnections(levels);

    return {
      levels,
      interLevelConnections
    };
  }

  // 3D 공간 기반 수직/수평 연결 감지
  private detect3DSpaceConnections(levels: { [key: number]: LevelData }): LevelConnection[] {
    const interLevelConnections: LevelConnection[] = [];
    const levelKeys = Object.keys(levels).map(Number).sort((a, b) => a - b);

    for (let i = 0; i < levelKeys.length; i++) {
      for (let j = i + 1; j < levelKeys.length; j++) {
        const level1 = levels[levelKeys[i]];
        const level2 = levels[levelKeys[j]];
        
        if (!level1 || !level2) continue;

        // 수직 연결 감지 (X,Y 좌표가 가깝고 Z좌표 차이가 큼)
        level1.nodes.forEach(node1 => {
          level2.nodes.forEach(node2 => {
            const dx = Math.abs(node1.x - node2.x);
            const dy = Math.abs(node1.y - node2.y);
            const dz = Math.abs(node1.z - node2.z);
            
            // 수직 연결 조건: X,Y 차이 < precisionThreshold, Z 차이 > 10
            if (dx < this.precisionThreshold && dy < this.precisionThreshold && dz > 10) {
              interLevelConnections.push({
                from: node1.id,
                to: node2.id,
                distance: dz,
                ratio: 0, // 레벨 간 연결은 비율 계산 불필요
                type: 'vertical',
                fromLevel: levelKeys[i],
                toLevel: levelKeys[j]
              });
            }
          });
        });
      }
    }

    return interLevelConnections;
  }

  // 거리 계산
  private calculateDistance(node1: EnhancedNode, node2: EnhancedNode): number {
    const dx = node1.x - node2.x;
    const dy = node1.y - node2.y;
    const dz = node1.z - node2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // 레벨 총 거리 계산
  private calculateLevelTotalDistance(nodes: EnhancedNode[]): number {
    let totalDistance = 0;
    const processedPairs = new Set<string>();
    
    nodes.forEach(node => {
      nodes.forEach(otherNode => {
        if (node.id !== otherNode.id) {
          const pairKey = [node.id, otherNode.id].sort().join('-');
          if (!processedPairs.has(pairKey)) {
            totalDistance += this.calculateDistance(node, otherNode);
            processedPairs.add(pairKey);
          }
        }
      });
    });
    
    return totalDistance / 2; // 양방향 계산이므로 2로 나눔기
  }

  // 다중 레벨 Dijkstra 최적화
  public findRoute(start: string, end: string): RouteResult {
    const startNode = this.findNodeInAnyLevel(start);
    const endNode = this.findNodeInAnyLevel(end);

    if (!startNode) {
      return { path: [], distance: -1, error: `FROM node not found: [${start}]` };
    }
    if (!endNode) {
      return { path: [], distance: -1, error: `TO node not found: [${end}]` };
    }

    // 동일 레벨 내 경로 탐색
    if (startNode.level === endNode.level) {
      return this.findIntraLevelRoute(startNode.level, start, end);
    }

    // 다중 레벨 경로 탐색
    return this.findInterLevelRoute(start, end);
  }

  private findNodeInAnyLevel(nodeName: string): EnhancedNode | null {
    for (const level of Object.values(this.navigationMap.levels)) {
      const node = level.nodes.find(n => n.id === nodeName);
      if (node) return node;
    }
    return null;
  }

  private findIntraLevelRoute(level: number, start: string, end: string): RouteResult {
    const levelInfo = this.navigationMap.levels[level];
    if (!levelInfo) {
      return { path: [], distance: -1, error: `Level ${level} not found` };
    }

    // 그래프 구성
    const graph: { [key: string]: { [neighbor: string]: number } } = {};
    levelInfo.connections.forEach(conn => {
      if (!graph[conn.from]) graph[conn.from] = {};
      graph[conn.from][conn.to] = conn.distance;
      
      if (!graph[conn.to]) graph[conn.to] = {};
      graph[conn.to][conn.from] = conn.distance;
    });

    // Dijkstra 알고리즘
    return this.dijkstra(graph, start, end);
  }

  private findInterLevelRoute(start: string, end: string): RouteResult {
    const startNode = this.findNodeInAnyLevel(start);
    const endNode = this.findNodeInAnyLevel(end);

    if (!startNode || !endNode) {
      return { path: [], distance: -1, error: 'Nodes not found' };
    }

    // 레벨 경로 찾기
    const levelPath = this.findLevelPath(startNode.level, endNode.level);
    
    if (levelPath.length === 0) {
      return { path: [], distance: -1, error: 'No level path found' };
    }

    const fullPath: string[] = [start];
    let current = start;
    let totalDistance = 0;

    // 각 레벨 전환
    for (let i = 0; i < levelPath.length - 1; i++) {
      const fromLevel = levelPath[i];
      const toLevel = levelPath[i + 1];
      
      // 레벨 내 경로
      const intraRoute = this.findIntraLevelRoute(fromLevel, current, this.findBestConnectionPoint(fromLevel, toLevel, current));
      if (intraRoute.distance >= 0) {
        fullPath.push(...intraRoute.path.slice(1));
        totalDistance += intraRoute.distance;
        current = intraRoute.path[intraRoute.path.length - 1];
      } else {
        return { path: [], distance: -1, error: `Cannot reach level ${toLevel} from ${current}` };
      }
      
      // 레벨 간 연결
      const interConnection = this.findInterLevelConnection(fromLevel, toLevel, current);
      if (interConnection) {
        fullPath.push(interConnection.to);
        totalDistance += interConnection.distance;
        current = interConnection.to;
      } else {
        return { path: [], distance: -1, error: `No connection from level ${fromLevel} to ${toLevel}` };
      }
    }

    // 최종 목적지까지 경로
    const finalRoute = this.findIntraLevelRoute(endNode.level, current, end);
    if (finalRoute.distance >= 0) {
      fullPath.push(...finalRoute.path.slice(1));
      totalDistance += finalRoute.distance;
    } else {
      return { path: [], distance: -1, error: `Cannot reach ${end} in level ${endNode.level}` };
    }

    return { path: fullPath, distance: totalDistance };
  }

  private findLevelPath(fromLevel: number, toLevel: number): number[] {
    const visited = new Set<number>();
    const queue: { level: number; path: number[] }[] = [{ level: fromLevel, path: [fromLevel] }];

    while (queue.length > 0) {
      const { level, path } = queue.shift()!;
      
      if (level === toLevel) return path;
      if (visited.has(level)) continue;
      visited.add(level);

      // 연결된 레벨 찾기
      const connections = this.navigationMap.interLevelConnections.filter(
        conn => (conn.fromLevel === level || conn.toLevel === level)
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

  private findBestConnectionPoint(fromLevel: number, toLevel: number, fromNode: string): string {
    const connections = this.navigationMap.interLevelConnections.filter(
      conn => (conn.fromLevel === fromLevel && conn.toLevel === toLevel) ||
             (conn.fromLevel === toLevel && conn.toLevel === fromLevel)
    );

    let bestConnection = null;
    let minDistance = Infinity;

    for (const conn of connections) {
      const actualFromNode = conn.fromLevel === fromLevel ? conn.from : conn.to;
      const distance = this.calculateDistance(
        this.findNodeInAnyLevel(actualFromNode)!,
        this.findNodeInAnyLevel(fromNode)!
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        bestConnection = conn;
      }
    }

    return bestConnection ? bestConnection.to : '';
  }

  private findInterLevelConnection(fromLevel: number, toLevel: number, fromNode: string): LevelConnection | null {
    return this.navigationMap.interLevelConnections.find(conn => 
      (conn.fromLevel === fromLevel && conn.toLevel === toLevel && conn.from === fromNode) ||
      (conn.fromLevel === toLevel && conn.toLevel === fromLevel && conn.to === fromNode)
    ) || null;
  }

  private dijkstra(graph: { [key: string]: { [neighbor: string]: number } }, start: string, end: string): RouteResult {
    const distances: { [key: string]: number } = {};
    const previous: { [key: string]: string | null } = {};
    const unvisited = new Set<string>();

    // 초기화
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

    // 경로 재구성
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

  // 실시간 레벨 맵 데이터 제공
  public getVisualizationData(): any {
    const visualizationData: any = {};
    
    Object.keys(this.navigationMap.levels).forEach(level => {
      const levelNum = parseInt(level);
      const levelInfo = this.navigationMap.levels[levelNum];
      
      visualizationData[levelNum] = {
        nodes: levelInfo.nodes.map(node => ({
          id: node.id,
          x: node.x,
          y: node.y,
          z: node.z,
          level: node.level,
          deck: node.deck,
          type: node.type
        })),
        connections: levelInfo.connections.map(conn => ({
          source: conn.from,
          target: conn.to,
          distance: conn.distance,
          ratio: conn.ratio,
          type: conn.type,
          strokeWidth: Math.max(1, conn.ratio * 10)
        })),
        center: levelInfo.center,
        boundingBox: levelInfo.boundingBox
      };
    });

    // 레벨 간 연결 추가
    visualizationData.interLevel = this.navigationMap.interLevelConnections.map(conn => ({
      source: conn.from,
      target: conn.to,
      fromLevel: conn.fromLevel,
      toLevel: conn.toLevel,
      distance: conn.distance,
      type: conn.type,
      color: conn.type === 'vertical' ? '#ff6b6b' : '#4ecdc4'
    }));

    return visualizationData;
  }

  // 네비게이션 맵 제공
  public getNavigationMap(): NavigationMap {
    return this.navigationMap;
  }

  // 레벨 정보 제공
  public getLevelInfo(level: number): LevelData | null {
    return this.navigationMap.levels[level] || null;
  }

  // 모든 레벨 정보 제공
  public getAllLevels(): { [key: number]: LevelData } {
    return this.navigationMap.levels;
  }

  // 레벨 간 연결 정보 제공
  public getInterLevelConnections(): LevelConnection[] {
    return this.navigationMap.interLevelConnections;
  }
}
