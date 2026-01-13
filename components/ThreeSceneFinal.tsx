import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Node, DeckConfig } from '../types';
import { RoutingService } from '../services/routingService';

interface ThreeSceneProps {
  nodes: Node[];
  highlightPath?: string[];
  deckHeights: DeckConfig;
  routingService?: RoutingService;
  showLevelMap?: boolean;
}

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
  source: string;
  target: string;
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

const ThreeSceneEnhanced: React.FC<ThreeSceneProps> = ({ 
  nodes, 
  highlightPath, 
  deckHeights, 
  routingService,
  showLevelMap = false 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsRef = useRef<THREE.Object3D[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [levelData, setLevelData] = useState<{ [key: number]: LevelData }>({});
  const [interLevelConnections, setInterLevelConnections] = useState<LevelConnection[]>([]);

  // 고정밀도 좌표계산 및 레벨링 시스템
  const calculatePreciseLevels = (nodes: Node[]): { [key: number]: LevelData } => {
    // 실제 좌표가 있는 노드 필터링
    const nodesWithCoords = nodes.filter(n => 
      n.x !== undefined && n.y !== undefined && n.z !== undefined && 
      n.x !== 0 && n.y !== 0 && n.z !== 0
    );

    if (nodesWithCoords.length === 0) return {};

    // Z좌표 기반 동적 레벨링
    const zCoords = nodesWithCoords.map(n => n.z!).sort((a, b) => a - b);
    const levelCount = Math.ceil(zCoords.length / 15); // 15개 노드당 1레벨
    const levelThresholds: { [level: number]: { min: number; max: number } } = {};
    
    for (let i = 0; i < levelCount; i++) {
      const startIdx = i * 15;
      const endIdx = Math.min((i + 1) * 15 - 1, zCoords.length - 1);
      
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
    const levelData: { [key: number]: LevelData } = {};
    
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
              const distance = calculateDistance(node, neighborNode);
              const levelTotalDistance = calculateLevelTotalDistance(levelNodes);
              const ratio = distance / levelTotalDistance;
              
              connections.push({
                source: node.id,
                target: neighborName,
                distance,
                ratio,
                type: 'intra',
                level: levelNum
              });
            }
          });
        }
      });

      levelData[levelNum] = {
        nodes: levelNodes,
        connections,
        boundingBox,
        center
      };
    });

    return levelData;
  };

  // 3D 공간 기반 수직/수평 연결 감지
  const detect3DSpaceConnections = (levelData: { [key: number]: LevelData }): LevelConnection[] => {
    const interLevelConnections: LevelConnection[] = [];
    const levels = Object.keys(levelData).map(Number).sort((a, b) => a - b);

    for (let i = 0; i < levels.length; i++) {
      for (let j = i + 1; j < levels.length; j++) {
        const level1 = levelData[levels[i]];
        const level2 = levelData[levels[j]];
        
        if (!level1 || !level2) continue;

        // 수직 연결 감지 (X,Y 좌표가 가깝고 Z좌표 차이가 큼)
        level1.nodes.forEach(node1 => {
          level2.nodes.forEach(node2 => {
            const dx = Math.abs(node1.x - node2.x);
            const dy = Math.abs(node1.y - node2.y);
            const dz = Math.abs(node1.z - node2.z);
            
            // 수직 연결 조건: X,Y 차이 < 3단위, Z 차이 > 10단위
            if (dx < 3 && dy < 3 && dz > 10) {
              interLevelConnections.push({
                source: node1.id,
                target: node2.id,
                distance: dz,
                ratio: 0, // 레벨 간 연결은 비율 계산 불필요
                type: 'vertical',
                fromLevel: levels[i],
                toLevel: levels[j]
              });
            }
          });
        });
      }
    }

    return interLevelConnections;
  };

  // 거리 계산
  const calculateDistance = (node1: EnhancedNode, node2: EnhancedNode): number => {
    const dx = node1.x - node2.x;
    const dy = node1.y - node2.y;
    const dz = node1.z - node2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  // 레벨 총 거리 계산
  const calculateLevelTotalDistance = (nodes: EnhancedNode[]): number => {
    let totalDistance = 0;
    const processedPairs = new Set<string>();
    
    nodes.forEach(node => {
      nodes.forEach(otherNode => {
        if (node.id !== otherNode.id) {
          const pairKey = [node.id, otherNode.id].sort().join('-');
          if (!processedPairs.has(pairKey)) {
            totalDistance += calculateDistance(node, otherNode);
            processedPairs.add(pairKey);
          }
        }
      });
    });
    
    return totalDistance / 2; // 양방향 계산이므로 2로 나눔기
  };

  // 다중 레벨 Dijkstra 최적화
  const findMultiLevelRoute = (start: string, end: string): string[] => {
    if (!routingService) return [];

    // 레벨 데이터 확인
    const startNode = findNodeInAnyLevel(start);
    const endNode = findNodeInAnyLevel(end);
    
    if (!startNode || !endNode) return [];

    // 동일 레벨 내 경로 탐색
    if (startNode.level === endNode.level) {
      return findIntraLevelRoute(startNode.level, start, end);
    }

    // 다중 레벨 경로 탐색
    return findInterLevelRoute(start, end);
  };

  const findNodeInAnyLevel = (nodeName: string): EnhancedNode | null => {
    for (const level of Object.values(levelData as { [key: number]: LevelData })) {
      const node = level.nodes.find(n => n.id === nodeName);
      if (node) return node;
    }
    return null;
  };

  const findIntraLevelRoute = (level: number, start: string, end: string): string[] => {
    const levelInfo = levelData[level];
    if (!levelInfo) return [];

    // 그래프 구성
    const graph: { [key: string]: { [neighbor: string]: number } } = {};
    levelInfo.connections.forEach(conn => {
      if (!graph[conn.source]) graph[conn.source] = {};
      graph[conn.source][conn.target] = conn.distance;
      
      if (!graph[conn.target]) graph[conn.target] = {};
      graph[conn.target][conn.source] = conn.distance;
    });

    // Dijkstra 알고리즘
    return dijkstra(graph, start, end);
  };

  const findInterLevelRoute = (start: string, end: string): string[] => {
    const startNode = findNodeInAnyLevel(start);
    const endNode = findNodeInAnyLevel(end);

    if (!startNode || !endNode) return [];

    // 레벨 경로 찾기
    const levelPath = findLevelPath(startNode.level, endNode.level);
    
    if (levelPath.length === 0) return [];

    const fullPath = [start];
    let current = start;

    // 각 레벨 전환
    for (let i = 0; i < levelPath.length - 1; i++) {
      const fromLevel = levelPath[i];
      const toLevel = levelPath[i + 1];
      
      // 레벨 내 경로
      const intraRoute = findIntraLevelRoute(fromLevel, current, findBestConnectionPoint(fromLevel, toLevel, current));
      if (intraRoute.length > 0) {
        fullPath.push(...intraRoute.slice(1));
        current = intraRoute[intraRoute.length - 1];
      }
      
      // 레벨 간 연결
      const interConnection = findInterLevelConnection(fromLevel, toLevel, current);
      if (interConnection) {
        fullPath.push(interConnection.target);
        current = interConnection.target;
      }
    }

    // 최종 목적지까지 경로
    const finalRoute = findIntraLevelRoute(endNode.level, current, end);
    if (finalRoute.length > 0) {
      fullPath.push(...finalRoute.slice(1));
    }

    return fullPath;
  };

  const findLevelPath = (fromLevel: number, toLevel: number): number[] => {
    const visited = new Set<number>();
    const queue: { level: number; path: number[] }[] = [{ level: fromLevel, path: [fromLevel] }];

    while (queue.length > 0) {
      const { level, path } = queue.shift()!;
      
      if (level === toLevel) return path;
      if (visited.has(level)) continue;
      visited.add(level);

      // 연결된 레벨 찾기
      const connections = interLevelConnections.filter(
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
  };

  const findBestConnectionPoint = (fromLevel: number, toLevel: number, fromNode: string): string => {
    const connections = interLevelConnections.filter(
      conn => (conn.fromLevel === fromLevel && conn.toLevel === toLevel) ||
             (conn.fromLevel === toLevel && conn.toLevel === fromLevel)
    );

    let bestConnection = null;
    let minDistance = Infinity;

    for (const conn of connections) {
      const actualFromNode = conn.fromLevel === fromLevel ? conn.source : conn.target;
      const distance = calculateDistance(
        findNodeInAnyLevel(actualFromNode)!,
        findNodeInAnyLevel(fromNode)!
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        bestConnection = conn;
      }
    }

    return bestConnection ? bestConnection.target : '';
  };

  const findInterLevelConnection = (fromLevel: number, toLevel: number, fromNode: string): LevelConnection | null => {
    return interLevelConnections.find(conn => 
      (conn.fromLevel === fromLevel && conn.toLevel === toLevel && conn.source === fromNode) ||
      (conn.fromLevel === toLevel && conn.toLevel === fromLevel && conn.target === fromNode)
    ) || null;
  };

  const dijkstra = (graph: { [key: string]: { [neighbor: string]: number } }, start: string, end: string): string[] => {
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
    if (distances[end] === Infinity) return [];

    const path: string[] = [];
    let curr: string | null = end;
    while (curr) {
      path.unshift(curr);
      curr = previous[curr];
    }

    return path;
  };

  // 실시간 레벨 맵 및 경로 시각화
  const createVisualization = (scene: THREE.Scene) => {
    if (!showLevelMap) return;

    // 기존 시각화 객체 제거
    const existingObjects = scene.children.filter(child => child.userData.isVisualization);
    existingObjects.forEach(obj => scene.remove(obj));

    // 레벨별 시각화
    Object.keys(levelData).forEach(level => {
      const levelNum = parseInt(level);
      const levelInfo = levelData[levelNum];
      
      if (!levelInfo) return;

      // 레벨 평면
      const planeGeometry = new THREE.PlaneGeometry(200, 200);
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x444444),
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
      });
      
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.position.set(levelInfo.center.x * 0.001, levelInfo.center.z * 0.001, levelInfo.center.y * 0.001);
      plane.rotation.x = -Math.PI / 2;
      plane.userData.isVisualization = true;
      plane.userData.level = levelNum;
      scene.add(plane);

      // 레벨 내 연결선
      levelInfo.connections.forEach(conn => {
        const fromNode = levelInfo.nodes.find(n => n.id === conn.source);
        const toNode = levelInfo.nodes.find(n => n.id === conn.target);
        
        if (fromNode && toNode) {
          const points = [
            new THREE.Vector3(fromNode.x * 0.001, fromNode.z * 0.001, fromNode.y * 0.001),
            new THREE.Vector3(toNode.x * 0.001, toNode.z * 0.001, toNode.y * 0.001)
          ];
          
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(0x00ff00),
            linewidth: Math.max(1, conn.ratio * 5)
          });
          
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData.isVisualization = true;
          line.userData.type = 'intra';
          scene.add(line);
        }
      });
    });

    // 레벨 간 연결선
    interLevelConnections.forEach(conn => {
      const fromNode = findNodeInAnyLevel(conn.source);
      const toNode = findNodeInAnyLevel(conn.target);
      
      if (fromNode && toNode) {
        const points = [
          new THREE.Vector3(fromNode.x * 0.001, fromNode.z * 0.001, fromNode.y * 0.001),
          new THREE.Vector3(toNode.x * 0.001, toNode.z * 0.001, toNode.y * 0.001)
        ];
        
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: new THREE.Color(conn.type === 'vertical' ? 0xff6b6b : 0x4ecdc4),
          linewidth: 3
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.userData.isVisualization = true;
        line.userData.type = 'inter';
        scene.add(line);
      }
    });
  };

  useEffect(() => {
    // 레벨 데이터 계산
    const calculatedLevelData = calculatePreciseLevels(nodes);
    setLevelData(calculatedLevelData);
    
    // 수직/수평 연결 감지
    const detectedConnections = detect3DSpaceConnections(calculatedLevelData);
    setInterLevelConnections(detectedConnections);
  }, [nodes, routingService]);

  useEffect(() => {
    if (!mountRef.current) return;

    // 씬 장 설정
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // 카메라 설정
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(100, 100, 100);
    cameraRef.current = camera;

    // 렌더러 설정
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 컨트롤
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // 조명
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(50, 50, 25);
    scene.add(directionalLight);

    // 노드 생성
    Object.values(levelData as { [key: number]: LevelData }).forEach(levelInfo => {
      levelInfo.nodes.forEach(node => {
        // 노드 구체
        const geometry = new THREE.SphereGeometry(2, 16, 16);
        const material = new THREE.MeshPhongMaterial({
          color: highlightPath?.includes(node.id) ? 0x00ff00 : 0x0088ff
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(node.x * 0.001, node.z * 0.001, node.y * 0.001);
        sphere.userData = { node, id: node.id };
        scene.add(sphere);
        objectsRef.current.push(sphere);

        // 노드 라벨
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 64;
        context.fillStyle = 'white';
        context.font = '20px Arial';
        context.fillText(node.id, 10, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(node.x * 0.001, node.z * 0.001 + 5, node.y * 0.001);
        sprite.scale.set(10, 2.5, 1);
        scene.add(sprite);
        objectsRef.current.push(sprite);
      });
    });

    // 시각화 생성
    createVisualization(scene);

    // 애니메이션 루프
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 리사이즈 핸들러
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 클린업
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [nodes, highlightPath, deckHeights, levelData, interLevelConnections, showLevelMap]);

  // 시각화 업데이트
  useEffect(() => {
    if (sceneRef.current) {
      createVisualization(sceneRef.current);
    }
  }, [showLevelMap, currentLevel, levelData, interLevelConnections]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {showLevelMap && (
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '8px' }}>
          <div style={{ color: 'white', fontSize: '14px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>🗺️ 고정밀도 레벨 맵</div>
            <div>현재 레벨: {currentLevel}</div>
            <div>총 레벨 수: {Object.keys(levelData).length}</div>
            <div>레벨 간 연결: {interLevelConnections.length}</div>
            <button 
              onClick={() => setCurrentLevel(prev => (prev + 1) % Object.keys(levelData).length)}
              style={{ marginTop: '10px', padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              다음 레벨
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeSceneEnhanced;
