import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Node, DeckConfig, Cable } from '../types';

interface ThreeSceneProps {
  nodes: Node[];
  cables?: Cable[];
  highlightPath?: string[];
  deckHeights: DeckConfig;
  selectedCableId?: string | null;
  onClose?: () => void;
}

const ThreeScene: React.FC<ThreeSceneProps> = ({ nodes, highlightPath, deckHeights, selectedCableId, onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsRef = useRef<THREE.Object3D[]>([]);

  const [debugInfo, setDebugInfo] = useState<string>('');

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
    setDebugInfo('');

    if (nodes.length === 0) {
      setDebugInfo('No Nodes Loaded');
      return;
    }

    // Scale factor for real-world coordinates (ship coordinates are in mm, usually large)
    const SCALE = 0.01;
    const GRID_SPACING = 40;
    const LEVEL_HEIGHT = 60;

    // Check if we have real coordinates
    const hasRealCoords = nodes.some(n => (n.x !== undefined && n.x !== 0) || (n.y !== undefined && n.y !== 0));

    // Find bounds for centering
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    if (hasRealCoords) {
      nodes.forEach(n => {
        if (n.x !== undefined) { minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); }
        if (n.y !== undefined) { minZ = Math.min(minZ, n.y); maxZ = Math.max(maxZ, n.y); } // Excel Y is typically 2D Y, mapped to 3D Z
      });
      if (minX === Infinity) { minX = 0; maxX = 0; }
      if (minZ === Infinity) { minZ = 0; maxZ = 0; }
    }

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Backup Grid Calculation
    const nodesByDeck: { [key: string]: Node[] } = {};
    nodes.forEach(n => {
      const d = n.deck || (n.name && n.name.length > 2 ? n.name.substring(0, 2) : 'UNK');
      if (!nodesByDeck[d]) nodesByDeck[d] = [];
      nodesByDeck[d].push(n);
    });

    nodes.forEach(node => {
      // 1. Determine Y (Vertical Level) based on Deck
      const deck = node.deck || (node.name && node.name.length > 2 ? node.name.substring(0, 2) : 'UNK');

      // Use provided deckConfig or fallback to index-based height
      // We look up the deck value from prop `deckHeights`. If mapping exists, use it.
      // It's usually "TO": 4, "SF": 3... so we multiply by LEVEL_HEIGHT
      let levelIndex = 0;
      if (deckHeights[deck] !== undefined) {
        levelIndex = deckHeights[deck];
      } else {
        // Fallback: alphabetical or hash? alphabetical is safer for layout
        const keys = Object.keys(nodesByDeck).sort();
        levelIndex = keys.indexOf(deck);
      }

      const y = levelIndex * LEVEL_HEIGHT;

      // 2. Determine X/Z (Horizontal Plane)
      let x = 0;
      let z = 0;

      if (hasRealCoords && node.x !== undefined && node.y !== undefined) {
        x = (node.x - centerX) * SCALE;
        z = (node.y - centerZ) * SCALE; // Map 2D Y to 3D Z
      } else {
        // Grid Layout Fallback
        const deckNodes = nodesByDeck[deck];
        const idx = deckNodes.indexOf(node);
        const cols = Math.ceil(Math.sqrt(deckNodes.length));

        const row = Math.floor(idx / cols);
        const col = idx % cols;

        // Add jitter
        const jitterX = (hashString(node.name) % 100) / 10;
        const jitterZ = (hashString(node.name + "z") % 100) / 10;

        x = (col * GRID_SPACING) - ((cols * GRID_SPACING) / 2) + jitterX;
        z = (row * GRID_SPACING) - ((cols * GRID_SPACING) / 2) + jitterZ;
      }

      processedNodes.current.set(node.name, { x, y, z });
    });

    if (hasRealCoords) {
      setDebugInfo('Real Coordinates Mapped');
    } else {
      setDebugInfo(`Grid Layout: ${Object.keys(nodesByDeck).length} Decks`);
    }
  };

  const createOrthoPath = (points: THREE.Vector3[]) => {
    const orthoPoints: THREE.Vector3[] = [];
    if (points.length < 2) return points;

    orthoPoints.push(points[0]);

    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];

      // Logic: Move X -> Z -> Y (Manhattan 3D)
      // 1. Move X first (Horizontal)
      if (Math.abs(curr.x - next.x) > 0.1) {
        orthoPoints.push(new THREE.Vector3(next.x, curr.y, curr.z));
      }
      // 2. Move Z next (Horizontal)
      if (Math.abs(curr.z - next.z) > 0.1) {
        orthoPoints.push(new THREE.Vector3(next.x, curr.y, next.z));
      }
      // 3. Move Y last (Vertical Drop/Rise)
      // This creates the "shaft" effect
      if (Math.abs(curr.y - next.y) > 0.1) {
        orthoPoints.push(new THREE.Vector3(next.x, next.y, next.z)); // Arrive at next
      }
    }
    return orthoPoints;
  };

  useEffect(() => {
    generateNodePositions();

    if (!mountRef.current) return;

    // Init Scene
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
    camera.position.set(200, 300, 200);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 500, 100);
    scene.add(dirLight);

    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);

    // Initial Draw
    drawGraph();

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckHeights]);

  // Handle Updates
  useEffect(() => {
    drawGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, highlightPath, deckHeights]);

  const drawGraph = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old objects
    objectsRef.current.forEach(obj => scene.remove(obj));
    objectsRef.current = [];

    if (nodes.length === 0) return;

    // Re-calculate positions
    generateNodePositions();

    // Materials
    const nodeGeo = new THREE.BoxGeometry(3, 3, 3);
    const routeNodeGeo = new THREE.BoxGeometry(5, 5, 5);
    const endNodeGeo = new THREE.SphereGeometry(6, 16, 16);

    const matDefault = new THREE.MeshStandardMaterial({ color: 0x334155, opacity: 0.4, transparent: true });
    const matRoute = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.6 });
    const matFrom = new THREE.MeshStandardMaterial({ color: 0x22c55e }); // Green
    const matTo = new THREE.MeshStandardMaterial({ color: 0xef4444 }); // Red

    const hasRoute = highlightPath && highlightPath.length > 0;
    const pathSet = new Set(highlightPath || []);

    const fromNode = highlightPath?.[0];
    const toNode = highlightPath?.[highlightPath?.length - 1];

    // Helper for Text
    const createLabel = (text: string, color: string) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 256; canvas.height = 64;
      ctx.fillStyle = color;
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(text, 128, 45);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
      sprite.scale.set(30, 7.5, 1);
      return sprite;
    };

    // Draw Nodes
    nodes.forEach(node => {
      const pos = processedNodes.current.get(node.name);
      if (!pos) return;

      const isRoute = pathSet.has(node.name);
      const isStart = node.name === fromNode;
      const isEnd = node.name === toNode;

      // Filter: If viewing a route, hide non-relevant nodes to reduce clutter? 
      // User request: "Visualizing 3D...". Usually showing context is good but dimmed.

      if (hasRoute && !isRoute) {
        // Dimmed / Small
        const mesh = new THREE.Mesh(nodeGeo, matDefault);
        mesh.position.set(pos.x, pos.y, pos.z);
        scene.add(mesh);
        objectsRef.current.push(mesh);
      } else {
        // Highlighted
        let mesh;
        if (isStart) mesh = new THREE.Mesh(endNodeGeo, matFrom);
        else if (isEnd) mesh = new THREE.Mesh(endNodeGeo, matTo);
        else mesh = new THREE.Mesh(routeNodeGeo, matRoute); // Route nodes should be yellow boxes

        mesh.position.set(pos.x, pos.y, pos.z);
        scene.add(mesh);
        objectsRef.current.push(mesh);

        // Label for Route Nodes
        if (isRoute || nodes.length < 50) {
          const label = createLabel(node.name, isStart ? '#4ade80' : isEnd ? '#f87171' : '#fcd34d');
          label.position.set(pos.x, pos.y + 8, pos.z);
          scene.add(label);
          objectsRef.current.push(label);
        }
      }
    });

    // Draw Route Tube (Ortho)
    if (hasRoute && highlightPath && highlightPath.length > 1) {
      const rawPoints: THREE.Vector3[] = [];
      highlightPath.forEach(name => {
        const p = processedNodes.current.get(name);
        if (p) rawPoints.push(new THREE.Vector3(p.x, p.y, p.z));
      });

      // Generate Ortho Points
      const orthoPoints = createOrthoPath(rawPoints);

      if (orthoPoints.length > 1) {
        // Use TubeGeometry based on a CurvePath constructed from lines
        // CatmullRom is for curves. For sharp corners, we just want lines. 
        // But TubeGeometry requires a Curve. 
        // We can use THREE.CurvePath or just draw Cylinder segments.
        // Easiest "Neon Path" look: CatmullRom with tension=0 (linear) OR thick LineSegments.
        // Actually, TubeGeometry with `new THREE.CatmullRomCurve3(orthoPoints, false, 'catmullrom', 0.05)` might work but corners round.
        // Better: Draw Cylinders for segments and Spheres for joints.

        const material = new THREE.MeshStandardMaterial({
          color: 0x00f3ff,
          emissive: 0x00f3ff,
          emissiveIntensity: 0.8,
          roughness: 0.2,
          metalness: 0.8
        });

        const RADIUS = 1.5;

        for (let i = 0; i < orthoPoints.length - 1; i++) {
          const p1 = orthoPoints[i];
          const p2 = orthoPoints[i + 1];

          const dist = p1.distanceTo(p2);
          if (dist < 0.1) continue; // Skip tiny segments

          const geometry = new THREE.CylinderGeometry(RADIUS, RADIUS, dist, 8);
          const cylinder = new THREE.Mesh(geometry, material);

          // Align cylinder
          const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
          const center = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
          cylinder.position.copy(center);
          cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction); // Default cylinder is Y-aligned

          scene.add(cylinder);
          objectsRef.current.push(cylinder);

          // Joint Sphere
          const joint = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 8, 8), material);
          joint.position.copy(p1);
          scene.add(joint);
          objectsRef.current.push(joint);
        }
        // Final joint
        const lastJoint = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 8, 8), material);
        lastJoint.position.copy(orthoPoints[orthoPoints.length - 1]);
        scene.add(lastJoint);
        objectsRef.current.push(lastJoint);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-black/80 rounded-lg overflow-hidden border border-gray-700">
      <div ref={mountRef} className="w-full h-full" />

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 bg-gray-900/80 p-2 rounded border border-gray-600 text-xs text-gray-300">
        <div className="font-bold text-white mb-1">3D Visualization</div>
        <div>Nodes: {nodes.length}</div>
        <div>Mode: {highlightPath ? `Route View (${highlightPath.length} nodes)` : 'System View'}</div>
        {debugInfo && <div className="text-yellow-400 mt-1">{debugInfo}</div>}
        {selectedCableId && <div className="text-cyan-400 mt-1">Cable: {selectedCableId}</div>}
      </div>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm font-bold shadow-lg"
      >
        CLOSE
      </button>

      <div className="absolute bottom-4 left-4 text-[10px] text-gray-500">
        Controls: Left Click Rotate • Right Click Pan • Scroll Zoom
      </div>
    </div>
  );
};

export default ThreeScene;