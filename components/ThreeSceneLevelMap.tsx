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
  const [levelData, setLevelData] = useState<any>(null);

  // Calculate positions
  const processedNodes = useRef<Map<string, { x: number, y: number, z: number, level: number }>>(new Map());

  // Deterministic random position based on string
  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }

  const generateNodePositions = () => {
    processedNodes.current.clear();

    // Scale factor for real-world coordinates (ship coordinates are in mm, scale down)
    const SCALE = 0.001;

    // Check if we have real coordinates
    const hasRealCoords = nodes.some(n => (n.x && n.x !== 0) || (n.y && n.y !== 0) || (n.z && n.z !== 0));

    if (hasRealCoords) {
      console.log('🌐 Using REAL coordinates from POINT column');

      // Find bounds for auto-centering
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      nodes.forEach(n => {
        if (n.x) { minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); }
        if (n.y) { minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y); }
        if (n.z) { minZ = Math.min(minZ, n.z); maxZ = Math.max(maxZ, n.z); }
      });

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;

      // Calculate level thresholds
      const zCoords = nodes
        .filter(n => n.z !== undefined && n.z !== null)
        .map(n => n.z!)
        .sort((a, b) => a - b);

      const levelCount = Math.ceil(zCoords.length / 10);
      const levelThresholds: { [level: number]: { min: number; max: number } } = {};
      
      for (let i = 0; i < levelCount; i++) {
        const startIdx = i * 10;
        const endIdx = Math.min((i + 1) * 10 - 1, zCoords.length - 1);
        
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

      nodes.forEach(node => {
        if (node.x !== undefined && node.y !== undefined && node.z !== undefined) {
          const level = getLevel(node.z);
          // Center and scale coordinates
          processedNodes.current.set(node.name, {
            x: (node.x - centerX) * SCALE,
            y: (node.z - centerZ) * SCALE, // Z becomes Y (height) in Three.js
            z: (node.y - centerY) * SCALE,  // Y becomes Z in Three.js
            level
          });
        }
      });
    } else {
      console.log('📐 Using GRID layout (no real coordinates)');

      // Fallback: Group nodes by deck for grid layout
      const nodesByDeck: { [key: string]: Node[] } = {};
      nodes.forEach(n => {
        // Safe deck name extraction
        const d = n.deck || (n.name && n.name.length > 2 ? n.name.substring(0, 2) : 'UNK');
        if (!nodesByDeck[d]) nodesByDeck[d] = [];
        nodesByDeck[d].push(n);
      });

      // Sort decks to have logical stacking?
      const sortedDecks = Object.keys(nodesByDeck).sort();

      sortedDecks.forEach((deckName, deckIdx) => {
        const deckNodes = nodesByDeck[deckName];

        // Vertical spacing between decks
        const baseHeight = deckIdx * 50;

        // Grid Calculation
        const cols = Math.ceil(Math.sqrt(deckNodes.length));
        const spacing = 40; // Increased spacing for better visibility

        deckNodes.forEach((node, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;

          // Deterministic jitter to look more 'organic' but stable
          const jitterX = ((hashString(node.name) % 100) - 50) / 100;
          const jitterZ = ((hashString(node.name + 'z') % 100) - 50) / 100;

          processedNodes.current.set(node.name, {
            x: (col - cols / 2) * spacing + jitterX * 10,
            y: baseHeight,
            z: (row - cols / 2) * spacing + jitterZ * 10,
            level: deckIdx
          });
        });
      });
    }
  };

  const createLevelVisualization = (scene: THREE.Scene) => {
    if (!routingService || !showLevelMap) return;

    // Clear existing level visualization
    const existingLevelObjects = scene.children.filter(child => child.userData.isLevelVisualization);
    existingLevelObjects.forEach(obj => scene.remove(obj));

    const levelMapData = routingService.getLevelMapData();
    
    // Create level separators
    Object.keys(levelMapData).forEach(level => {
      const levelNum = parseInt(level);
      if (isNaN(levelNum)) return; // Skip 'interLevel'

      const levelInfo = levelMapData[levelNum];
      
      // Create level plane
      const planeGeometry = new THREE.PlaneGeometry(100, 100);
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x444444),
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
      });
      
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = levelNum * 50; // Adjust based on your level spacing
      plane.userData.isLevelVisualization = true;
      scene.add(plane);

      // Create level connections
      levelInfo.connections.forEach((conn: any) => {
        const fromNode = processedNodes.current.get(conn.source);
        const toNode = processedNodes.current.get(conn.target);
        
        if (fromNode && toNode && fromNode.level === levelNum && toNode.level === levelNum) {
          const points = [
            new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z),
            new THREE.Vector3(toNode.x, toNode.y, toNode.z)
          ];
          
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(0x00ff00),
            linewidth: conn.strokeWidth || 1
          });
          
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData.isLevelVisualization = true;
          scene.add(line);
        }
      });
    });

    // Create inter-level connections
    if (levelMapData.interLevel) {
      levelMapData.interLevel.forEach((conn: any) => {
        const fromNode = processedNodes.current.get(conn.source);
        const toNode = processedNodes.current.get(conn.target);
        
        if (fromNode && toNode) {
          const points = [
            new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z),
            new THREE.Vector3(toNode.x, toNode.y, toNode.z)
          ];
          
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(conn.color || 0xff0000),
            linewidth: 2
          });
          
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData.isLevelVisualization = true;
          scene.add(line);
        }
      });
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(50, 50, 50);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Generate node positions
    generateNodePositions();

    // Create nodes
    nodes.forEach(node => {
      const pos = processedNodes.current.get(node.name);
      if (!pos) return;

      // Node sphere
      const geometry = new THREE.SphereGeometry(1, 16, 16);
      const material = new THREE.MeshPhongMaterial({
        color: highlightPath?.includes(node.name) ? 0x00ff00 : 0x0088ff
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(pos.x, pos.y, pos.z);
      sphere.userData = { node, name: node.name };
      scene.add(sphere);
      objectsRef.current.push(sphere);

      // Node label
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;
      context.fillStyle = 'white';
      context.font = '24px Arial';
      context.fillText(node.name, 10, 40);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(pos.x, pos.y + 3, pos.z);
      sprite.scale.set(8, 2, 1);
      scene.add(sprite);
      objectsRef.current.push(sprite);
    });

    // Create level visualization
    createLevelVisualization(scene);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [nodes, highlightPath, deckHeights, routingService, showLevelMap]);

  // Update level visualization when showLevelMap changes
  useEffect(() => {
    if (sceneRef.current) {
      createLevelVisualization(sceneRef.current);
    }
  }, [showLevelMap, currentLevel]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {showLevelMap && (
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px' }}>
          <div style={{ color: 'white', fontSize: '12px' }}>
            <div>Level Map Mode</div>
            <div>Current Level: {currentLevel}</div>
            <button 
              onClick={() => setCurrentLevel(prev => prev + 1)}
              style={{ marginTop: '5px', padding: '5px 10px' }}
            >
              Next Level
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeSceneEnhanced;
