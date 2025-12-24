import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Node, DeckConfig } from '../types';

interface ThreeSceneProps {
  nodes: Node[];
  highlightPath?: string[];
  deckHeights: DeckConfig;
}

const ThreeScene: React.FC<ThreeSceneProps> = ({ nodes, highlightPath, deckHeights }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsRef = useRef<THREE.Object3D[]>([]);

  // Calculate positions
  const processedNodes = useRef<Map<string, { x: number, y: number, z: number }>>(new Map());

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

      nodes.forEach(node => {
        if (node.x !== undefined && node.y !== undefined && node.z !== undefined) {
          // Center and scale coordinates
          // In ship coordinates: X = along ship, Y = across ship, Z = height
          // In Three.js: X = right, Y = up, Z = toward camera
          processedNodes.current.set(node.name, {
            x: (node.x - centerX) * SCALE,
            y: (node.z - centerZ) * SCALE, // Z becomes Y (height) in Three.js
            z: (node.y - centerY) * SCALE  // Y becomes Z in Three.js
          });
        }
      });
    } else {
      console.log('📐 Using GRID layout (no real coordinates)');

      // Fallback: Group nodes by deck for grid layout
      const nodesByDeck: { [key: string]: Node[] } = {};
      nodes.forEach(n => {
        const d = n.deck || 'UNKNOWN';
        if (!nodesByDeck[d]) nodesByDeck[d] = [];
        nodesByDeck[d].push(n);
      });

      Object.entries(nodesByDeck).forEach(([deckName, deckNodes]) => {
        const height = (deckHeights[deckName] || 0) * 20;
        const cols = Math.ceil(Math.sqrt(deckNodes.length));
        const spacing = 30;

        deckNodes.forEach((node, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const jitterX = (hashString(node.name) % 100) / 10;
          const jitterZ = (hashString(node.name + "z") % 100) / 10;
          const x = (col * spacing) - ((cols * spacing) / 2) + jitterX;
          const z = (row * spacing) - ((cols * spacing) / 2) + jitterZ;

          processedNodes.current.set(node.name, { x, y: height, z });
        });
      });
    }
  };

  useEffect(() => {
    generateNodePositions();

    if (!mountRef.current) return;

    // Init Scene
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a'); // seastar-900
    scene.fog = new THREE.FogExp2('#0f172a', 0.005); // Less fog for better visibility
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(100, 100, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 200, 50);
    scene.add(dirLight);

    // Deck Planes (Visual Reference)
    Object.entries(deckHeights).forEach(([name, level]) => {
      const y = (level as number) * 20;
      const grid = new THREE.GridHelper(400, 20, 0x334155, 0x1e293b);
      grid.position.y = y;
      scene.add(grid);

      // Deck Label
      // (TextSprite logic omitted for brevity, simpler approach below)
    });

    // Initial Draw
    drawGraph();

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckHeights]); // Re-init if deck heights change structurally

  // Handle Updates
  useEffect(() => {
    drawGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, highlightPath, deckHeights]);

  // Helper to generate right-angle points between two nodes
  const getOrthogonalPoints = (p1: { x: number, y: number, z: number }, p2: { x: number, y: number, z: number }) => {
    const points: THREE.Vector3[] = [];
    points.push(new THREE.Vector3(p1.x, p1.y, p1.z));

    // Ship Routing Logic:
    // 1. If different decks (different Y), move vertically first (Riser)
    // 2. Then move X
    // 3. Then move Z

    // Vertical Transition
    if (Math.abs(p1.y - p2.y) > 0.1) {
      // Move out a bit first? No, simple vertical riser at source or dest
      // Let's go up/down at p1's X,Z to p2's height
      points.push(new THREE.Vector3(p1.x, p2.y, p1.z));
    }

    // Horizontal X Transition
    points.push(new THREE.Vector3(p2.x, p2.y, p1.z));

    // Horizontal Z Transition (Destination)
    points.push(new THREE.Vector3(p2.x, p2.y, p2.z));

    return points;
  }

  const drawGraph = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old objects (Meshes and Lines)
    objectsRef.current.forEach(obj => scene.remove(obj));
    objectsRef.current = [];

    // Re-calculate positions in case nodes changed
    generateNodePositions();

    const nodeGeometry = new THREE.BoxGeometry(2, 2, 2); // Boxes look more like equipment/panels
    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.3,
      metalness: 0.8
    });

    const highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xf472b6, // Pink
      emissive: 0xf472b6,
      emissiveIntensity: 0.5
    });

    // Draw Nodes
    nodes.forEach(node => {
      const pos = processedNodes.current.get(node.name);
      if (!pos) return;

      const isHighlighted = highlightPath?.includes(node.name);
      const mesh = new THREE.Mesh(nodeGeometry, isHighlighted ? highlightMaterial : nodeMaterial);
      mesh.position.set(pos.x, pos.y, pos.z);

      scene.add(mesh);
      objectsRef.current.push(mesh);
    });

    // Draw Connections (Edges)
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x475569, opacity: 0.4, transparent: true });
    const routeLineMaterial = new THREE.LineBasicMaterial({ color: 0x00f3ff, linewidth: 3 });

    const renderedEdges = new Set<string>();

    nodes.forEach(node => {
      if (!node.relation) return;
      const neighbors = node.relation.split(',').map(s => s.trim()).filter(Boolean);
      const pos1 = processedNodes.current.get(node.name);

      neighbors.forEach(neighbor => {
        const pos2 = processedNodes.current.get(neighbor);
        if (pos1 && pos2) {
          const edgeKey = [node.name, neighbor].sort().join('-');
          if (renderedEdges.has(edgeKey)) return;
          renderedEdges.add(edgeKey);

          // Orthogonal Path
          const points = getOrthogonalPoints(pos1, pos2);
          const geometry = new THREE.BufferGeometry().setFromPoints(points);

          // Check if this edge is part of the highlighted path
          let isRouteEdge = false;
          if (highlightPath && highlightPath.length > 1) {
            for (let i = 0; i < highlightPath.length - 1; i++) {
              if ((highlightPath[i] === node.name && highlightPath[i + 1] === neighbor) ||
                (highlightPath[i] === neighbor && highlightPath[i + 1] === node.name)) {
                isRouteEdge = true;
                break;
              }
            }
          }

          const line = new THREE.Line(geometry, isRouteEdge ? routeLineMaterial : lineMaterial);
          scene.add(line);
          objectsRef.current.push(line);
        }
      });
    });
  };

  return <div ref={mountRef} className="w-full h-full rounded-lg overflow-hidden shadow-2xl bg-black/40" />;
};

export default ThreeScene;