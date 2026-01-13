import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Node, DeckConfig } from '../types';
import { EnhancedRoutingService } from '../services/EnhancedRoutingService';

interface ThreeSceneWithDiagonalRouteProps {
  nodes: Node[];
  cables: any[];
  deckHeights: DeckConfig;
  routingService: EnhancedRoutingService;
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

interface CableRoute {
  cable: any;
  path: string[];
  distance: number;
  color: string;
  visible: boolean;
}

const ThreeSceneWithDiagonalRoute: React.FC<ThreeSceneWithDiagonalRouteProps> = ({ 
  nodes, 
  cables,
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
  const textSpritesRef = useRef<THREE.Sprite[]>([]);
  const routeLinesRef = useRef<THREE.Line[]>([]);
  
  const [selectedCable, setSelectedCable] = useState<string>('');
  const [cableRoutes, setCableRoutes] = useState<CableRoute[]>([]);
  const [currentRouteIndex, setCurrentRouteIndex] = useState<number>(0);
  const [levelData, setLevelData] = useState<{ [key: number]: any }>({});
  const [interLevelConnections, setInterLevelConnections] = useState<any[]>([]);
  const [showDiagonalLines, setShowDiagonalLines] = useState<boolean>(true);

  // 3D 텍스트 생성 함수
  const createTextSprite = (text: string, color: string = '#ffffff', size: number = 32): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    
    // 배경
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // 텍스트
    context.fillStyle = color;
    context.font = `bold ${size}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(8, 2, 1);
    
    return sprite;
  };

  // 하이라이트 효과 생성
  const createHighlightEffect = (node: THREE.Mesh, color: string = '#ffff00'): void => {
    // 하이라이트 링 생성
    const highlightGeometry = new THREE.SphereGeometry(node.geometry.parameters.radius! * 1.3, 16, 16);
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.3
    });
    const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlightMesh.position.copy(node.position);
    highlightMesh.userData.isHighlight = true;
    sceneRef.current?.add(highlightMesh);
    
    // 하이라이트 텍스트
    const highlightText = createTextSprite(node.userData.id, color, 24);
    highlightText.position.set(
      node.position.x, 
      node.position.y + 8, 
      node.position.z
    );
    highlightText.userData.isHighlightText = true;
    sceneRef.current?.add(highlightText);
  };

  // 하이라이트 효과 제거
  const removeHighlightEffects = (): void => {
    if (!sceneRef.current) return;
    
    const highlights = sceneRef.current.children.filter(child => 
      child.userData.isHighlight || child.userData.isHighlightText
    );
    highlights.forEach(highlight => sceneRef.current.remove(highlight));
  };

  // 대각선을 피하는 곡선 생성
  const createSmoothCurve = (points: THREE.Vector3[]): THREE.Vector3[] => {
    if (points.length < 2) return points;
    
    const smoothPoints: THREE.Vector3[] = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      
      // 두 점 사이의 중간점 계산
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const midZ = (start.z + end.z) / 2;
      
      // 높이를 약간 조정하여 곡선 효과 추가
      const heightOffset = Math.abs(end.y - start.y) * 0.3;
      
      smoothPoints.push(start);
      
      // 중간점에 높이 조절된 점 추가
      smoothPoints.push(new THREE.Vector3(midX, midY + heightOffset, midZ));
      
      if (i === points.length - 2) {
        smoothPoints.push(end);
      }
    }
    
    return smoothPoints;
  };

  // 케이블 루트 시각화
  const visualizeCableRoute = (route: CableRoute): void => {
    if (!sceneRef.current) return;
    
    // 기존 루트 제거
    const existingRoutes = sceneRef.current.children.filter(child => 
      child.userData.isCableRoute
    );
    existingRoutes.forEach(route => sceneRef.current.remove(route));
    
    if (!route.path || route.path.length < 2) return;
    
    const points: THREE.Vector3[] = [];
    const routeColor = new THREE.Color(route.color);
    
    // 경로 포인트 생성
    route.path.forEach(nodeId => {
      const node = findNodeInAnyLevel(nodeId);
      if (node) {
        points.push(new THREE.Vector3(
          node.x * 0.001, 
          node.z * 0.001, 
          node.y * 0.001
        ));
      }
    });
    
    // 곡선 생성 (대각선 방지)
    const smoothPoints = showDiagonalLines ? createSmoothCurve(points) : points;
    
    // 경로 선 생성
    if (smoothPoints.length >= 2) {
      // 곡선을 위한 CatmullRomCurve 생성
      const curve = new THREE.CatmullRomCurve3(smoothPoints);
      const curvePoints = curve.getPoints(smoothPoints.length * 4); // 더 많은 점으로 부드러운 곡선
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: routeColor,
        linewidth: 3
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData.isCableRoute = true;
      line.userData.cableId = route.cable.id;
      sceneRef.current.add(line);
      routeLinesRef.current.push(line);
      
      // 경로 포인트에 구체 추가
      points.forEach((point, index) => {
        const sphereGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const sphereMaterial = new THREE.MeshBasicMaterial({
          color: routeColor,
          transparent: true,
          opacity: 0.8
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.copy(point);
        sphere.userData.isCableRoute = true;
        sphere.userData.cableId = route.cable.id;
        sphere.userData.pointIndex = index;
        sceneRef.current.add(sphere);
      });
    }
  };

  // 모든 라우팅 시각화
  const visualizeAllRoutes = (): void => {
    if (!sceneRef.current) return;
    
    // 기존 루트 제거
    const existingRoutes = sceneRef.current.children.filter(child => 
      child.userData.isCableRoute
    );
    existingRoutes.forEach(route => sceneRef.current.remove(route));
    routeLinesRef.current = [];
    
    // 모든 케이블 루트 시각화
    cableRoutes.forEach(route => {
      if (route.visible) {
        visualizeCableRoute(route);
      }
    });
  };

  // 노드 찾기
  const findNodeInAnyLevel = (nodeId: string): EnhancedNode | null => {
    for (const level of Object.values(levelData)) {
      if (level && level.nodes) {
        const node = level.nodes.find((n: any) => n.id === nodeId);
        if (node) return node;
      }
    }
    return null;
  };

  // 케이블 루트 계산
  const calculateCableRoutes = (): void => {
    const routes: CableRoute[] = [];
    
    cables.forEach((cable, index) => {
      if (cable.fromNode && cable.toNode) {
        const route = routingService.findRoute(cable.fromNode, cable.toNode);
        
        if (route.distance >= 0) {
          // 케이블별 색상 생성
          const hue = (index * 137.5) % 360; // 황금 각도
          const color = `hsl(${hue}, 70%, 50%)`;
          
          routes.push({
            cable,
            path: route.path,
            distance: route.distance,
            color,
            visible: true
          });
        }
      }
    });
    
    setCableRoutes(routes);
  };

  // 노드 지나가는 애니메이션
  const animateNodeTraversal = (path: string[]): void => {
    if (!sceneRef.current || path.length < 2) return;
    
    let currentIndex = 0;
    
    const animate = () => {
      if (currentIndex >= path.length) {
        currentIndex = 0; // 반복
      }
      
      // 이전 하이라이트 제거
      removeHighlightEffects();
      
      // 현재 노드 하이라이트
      const currentNodeId = path[currentIndex];
      const node = findNodeInAnyLevel(currentNodeId);
      
      if (node) {
        const nodeMesh = objectsRef.current.find(obj => 
          obj.userData.id === currentNodeId && obj instanceof THREE.Mesh
        );
        
        if (nodeMesh) {
          createHighlightEffect(nodeMesh, '#00ff00');
        }
      }
      
      currentIndex++;
      
      // 다음 프레임 예약
      setTimeout(animate, 1000);
    };
    
    animate();
  };

  useEffect(() => {
    // 레벨 데이터 가져오기
    const data = routingService.getLevelMapData();
    const interConnections = routingService.getInterLevelConnections();
    setLevelData(data);
    setInterLevelConnections(interConnections);
    
    // 케이블 루트 계산
    calculateCableRoutes();
  }, [nodes, cables, routingService]);

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

    // 레벨별 평면 생성
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
      plane.userData.isLevelPlane = true;
      plane.userData.level = levelNum;
      scene.add(plane);

      // 레벨 내 연결선
      levelInfo.connections.forEach((conn: any) => {
        const fromNode = levelInfo.nodes.find((n: any) => n.id === conn.source);
        const toNode = levelInfo.nodes.find((n: any) => n.id === conn.target);
        
        if (fromNode && toNode) {
          const points = [
            new THREE.Vector3(fromNode.x * 0.001, fromNode.z * 0.001, fromNode.y * 0.001),
            new THREE.Vector3(toNode.x * 0.001, toNode.z * 0.001, toNode.y * 0.001)
          ];
          
          // 곡선 생성
          const smoothPoints = createSmoothCurve(points);
          const curve = new THREE.CatmullRomCurve3(smoothPoints);
          const curvePoints = curve.getPoints(smoothPoints.length * 4);
          
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(0x666666),
            linewidth: 1
          });
          
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData.isConnection = true;
          scene.add(line);
        }
      });
    });

    // 레벨 간 연결선
    interLevelConnections.forEach((conn: any) => {
      const fromNode = findNodeInAnyLevel(conn.from);
      const toNode = findNodeInAnyLevel(conn.to);
      
      if (fromNode && toNode) {
        const points = [
          new THREE.Vector3(fromNode.x * 0.001, fromNode.z * 0.001, fromNode.y * 0.001),
          new THREE.Vector3(toNode.x * 0.001, toNode.z * 0.001, toNode.y * 0.001)
        ];
        
        // 곡선 생성
        const smoothPoints = createSmoothCurve(points);
        const curve = new THREE.CatmullRomCurve3(smoothPoints);
        const curvePoints = curve.getPoints(smoothPoints.length * 4);
        
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: new THREE.Color(conn.type === 'vertical' ? '#ff6b6b' : '#4ecdc4'),
          linewidth: 2
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.userData.isInterConnection = true;
        scene.add(line);
      }
    });

    // 노드 생성
    Object.values(levelData).forEach(levelInfo => {
      levelInfo.nodes.forEach((node: any) => {
        // 노드 구체
        const geometry = new THREE.SphereGeometry(2, 16, 16);
        const material = new THREE.MeshPhongMaterial({
          color: 0x0088ff
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(node.x * 0.001, node.z * 0.001, node.y * 0.001);
        sphere.userData = { node, id: node.id };
        scene.add(sphere);
        objectsRef.current.push(sphere);

        // 노드 라벨
        const textSprite = createTextSprite(node.id, '#ffffff', 20);
        textSprite.position.set(node.x * 0.001, node.z * 0.001 + 5, node.y * 0.001);
        scene.add(textSprite);
        textSpritesRef.current.push(textSprite);
      });
    });

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
  }, [levelData, interLevelConnections]);

  // 케이블 루트 시각화 업데이트
  useEffect(() => {
    if (selectedCable && cableRoutes.length > 0) {
      const route = cableRoutes.find(r => r.cable.id === selectedCable);
      if (route) {
        visualizeCableRoute(route);
        animateNodeTraversal(route.path);
      }
    }
  }, [selectedCable, cableRoutes]);

  // 모든 라우팅 시각화 업데이트
  useEffect(() => {
    if (!selectedCable && cableRoutes.length > 0) {
      visualizeAllRoutes();
    }
  }, [cableRoutes, showDiagonalLines]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* 케이블 선택 컨트롤 */}
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        background: 'rgba(0,0,0,0.8)', 
        padding: '15px', 
        borderRadius: '8px',
        minWidth: '300px'
      }}>
        <div style={{ color: 'white', fontSize: '14px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>🔌 케이블 루트 시각화</div>
          
          <div style={{ marginBottom: '10px' }}>
            <select 
              value={selectedCable}
              onChange={(e) => setSelectedCable(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '5px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                backgroundColor: '#333',
                color: 'white'
              }}
            >
              <option value="">전체 라우팅</option>
              {cables.map((cable, index) => (
                <option key={cable.id || index} value={cable.id || index}>
                  {cable.name || `Cable ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={showDiagonalLines}
                onChange={(e) => setShowDiagonalLines(e.target.checked)}
                style={{ margin: 0 }}
              />
              <span style={{ fontSize: '12px' }}>대각선 방지 (곡선)</span>
            </label>
          </div>
          
          {selectedCable && (
            <div style={{ fontSize: '12px', color: '#ccc' }}>
              <div>경로: {cableRoutes.find(r => r.cable.id === selectedCable)?.path.join(' → ') || 'N/A'}</div>
              <div>거리: {cableRoutes.find(r => r.cable.id === selectedCable)?.distance.toFixed(1) || 'N/A'}m</div>
            </div>
          )}
          
          {!selectedCable && (
            <div style={{ fontSize: '12px', color: '#ccc' }}>
              <div>전체 라우팅: {cableRoutes.length}개 케이블</div>
              <div>대각선 방지: {showDiagonalLines ? '활성화' : '비활성화'}</div>
            </div>
          )}
          
          <div style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
            💡 노드를 지나갈 때 하이라이트 효과 발생
          </div>
        </div>
      </div>
      
      {/* 레벨 정보 */}
      {showLevelMap && (
        <div style={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          background: 'rgba(0,0,0,0.8)', 
          padding: '15px', 
          borderRadius: '8px'
        }}>
          <div style={{ color: 'white', fontSize: '14px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>🗺️ 3D 레벨 맵</div>
            <div>총 레벨 수: {Object.keys(levelData).length}</div>
            <div>레벨 간 연결: {interLevelConnections.length}</div>
            <div>활성 케이블: {cableRoutes.filter(r => r.visible).length}</div>
            <div>곡선 모드: {showDiagonalLines ? '활성화' : '비활성화'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeSceneWithDiagonalRoute;
