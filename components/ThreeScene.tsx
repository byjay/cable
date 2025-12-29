import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
          const jitterX = (hashString(node.name) % 100) / 10;
          const jitterZ = (hashString(node.name + "z") % 100) / 10;

          const x = (col * spacing) - ((cols * spacing) / 2) + jitterX;
          const z = (row * spacing) - ((cols * spacing) / 2) + jitterZ;
          const y = baseHeight;

          processedNodes.current.set(node.name, { x, y, z });
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

    // Deck Planes (Visual Reference) - REMOVED for cleaner view
    // Only show a simple ground plane
    const groundPlane = new THREE.GridHelper(500, 50, 0x334155, 0x1e293b);
    groundPlane.position.y = 0;
    scene.add(groundPlane);

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

    // Geometries for different node types
    const smallNodeGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3); // Regular nodes
    const routeNodeGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2); // Route nodes (bigger!)
    const endNodeGeometry = new THREE.SphereGeometry(1.5, 16, 16); // FROM/TO nodes (spheres)

    // Materials
    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan for regular nodes
      roughness: 0.3,
      metalness: 0.8,
      transparent: true,
      opacity: 0.6
    });

    const routeMaterial = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Yellow for route middle nodes
      emissive: 0xfbbf24,
      emissiveIntensity: 0.3
    });

    const fromMaterial = new THREE.MeshStandardMaterial({
      color: 0x22c55e, // Green for FROM node
      emissive: 0x22c55e,
      emissiveIntensity: 0.5
    });

    const toMaterial = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Red for TO node  
      emissive: 0xef4444,
      emissiveIntensity: 0.5
    });

    // Helper: Create text sprite
    const createTextSprite = (text: string, color: string = '#ffffff') => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;

      context.fillStyle = 'rgba(0,0,0,0.7)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(0, 0, canvas.width, canvas.height);

      context.font = 'bold 28px Arial';
      context.fillStyle = color;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(8, 2, 1);
      return sprite;
    };

    // Determine if this is a route visualization mode
    const hasRoute = highlightPath && highlightPath.length > 1;
    const fromNode = hasRoute ? highlightPath[0] : null;
    const toNode = hasRoute ? highlightPath[highlightPath.length - 1] : null;

    // Draw ALL nodes (smaller) or only route nodes if route is selected
    nodes.forEach(node => {
      const pos = processedNodes.current.get(node.name);
      if (!pos) return;

      const isInRoute = highlightPath?.includes(node.name);
      const isFrom = node.name === fromNode;
      const isTo = node.name === toNode;

      // If route is active, only show route nodes prominently
      if (hasRoute) {
        if (isInRoute) {
          // Route nodes: bigger with labels
          let mesh: THREE.Mesh;
          if (isFrom || isTo) {
            mesh = new THREE.Mesh(endNodeGeometry, isFrom ? fromMaterial : toMaterial);
          } else {
            mesh = new THREE.Mesh(routeNodeGeometry, routeMaterial);
          }
          mesh.position.set(pos.x, pos.y, pos.z);
          scene.add(mesh);
          objectsRef.current.push(mesh);

          // Add text label above node
          const label = createTextSprite(node.name, isFrom ? '#22c55e' : isTo ? '#ef4444' : '#fbbf24');
          label.position.set(pos.x, pos.y + 3, pos.z);
          scene.add(label);
          objectsRef.current.push(label);
        }
        // Skip non-route nodes when route is active for cleaner view
      } else {
        // No route selected: show all nodes small
        const mesh = new THREE.Mesh(smallNodeGeometry, nodeMaterial);
        mesh.position.set(pos.x, pos.y, pos.z);
        scene.add(mesh);
        objectsRef.current.push(mesh);
      }
    });

    // Draw DIRECT route line connecting path nodes in order
    if (hasRoute && highlightPath.length > 1) {
      const routePoints: THREE.Vector3[] = [];
      highlightPath.forEach(nodeName => {
        const pos = processedNodes.current.get(nodeName);
        if (pos) {
          routePoints.push(new THREE.Vector3(pos.x, pos.y, pos.z));
        }
      });

      if (routePoints.length > 1) {
        // Create tube geometry for visible route
        const curve = new THREE.CatmullRomCurve3(routePoints);
        const tubeGeometry = new THREE.TubeGeometry(curve, routePoints.length * 10, 0.3, 8, false);
        const tubeMaterial = new THREE.MeshStandardMaterial({
          color: 0x00f3ff,
          emissive: 0x00f3ff,
          emissiveIntensity: 0.5
        });
        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        scene.add(tube);
        objectsRef.current.push(tube);
      }
    }

    // Draw Connections - ONLY for highlighted path (remove cluttering relation lines)
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
          // Only draw edges that are part of the highlighted route path
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

          // Only render if it's a route edge (removes cluttering lines)
          if (isRouteEdge) {
            const line = new THREE.Line(geometry, routeLineMaterial);
            scene.add(line);
            objectsRef.current.push(line);
          }
        }
      });
    });
  };

  return <div ref={mountRef} className="w-full h-full rounded-lg overflow-hidden shadow-2xl bg-black/40" />;
};

export default ThreeScene;