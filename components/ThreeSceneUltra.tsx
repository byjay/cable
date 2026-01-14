import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Node, DeckConfig, Cable } from '../types';
import { Layers, Box, Activity, MousePointer2 } from 'lucide-react';

interface ThreeSceneUltraProps {
    nodes: Node[];
    cables?: Cable[];
    highlightPath?: string[];
    deckHeights: DeckConfig;
    selectedCableId?: string | null;
    onClose?: () => void;
}

const ThreeSceneUltra: React.FC<ThreeSceneUltraProps> = ({ nodes, cables = [], highlightPath, deckHeights, selectedCableId, onClose }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const objectsRef = useRef<THREE.Object3D[]>([]);

    // State for UI Overlay
    const [debugInfo, setDebugInfo] = useState<string>('');
    const [showLevels, setShowLevels] = useState(true);
    const [autoRotate, setAutoRotate] = useState(false);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    // Mapped Positions
    const processedNodes = useRef<Map<string, { x: number, y: number, z: number, level: number }>>(new Map());

    // --- 1. Position Calculation Logic (Robust Hybrid) ---
    const calculatePositions = () => {
        processedNodes.current.clear();
        if (nodes.length === 0) return;

        // Configuration
        const SCALE = 0.05; // Scale down large ship coords
        const GRID_SPACING = 30; // Spacing for grid fallback
        const LEVEL_HEIGHT = 80; // Computed Z-height per deck

        // Check for Real Coordinates
        const hasRealCoords = nodes.some(n => (n.x && n.x !== 0) || (n.y && n.y !== 0));

        // Group by Deck for Grid Fallback & Leveling
        const nodesByDeck: { [key: string]: Node[] } = {};
        const deckKeys = new Set<string>();

        nodes.forEach(n => {
            const d = n.deck || (n.name.length > 2 ? n.name.substring(0, 2) : 'UNK');
            if (!nodesByDeck[d]) nodesByDeck[d] = [];
            nodesByDeck[d].push(n);
            deckKeys.add(d);
        });

        // Determine Vertical Levels (Y-axis in 3D)
        // Use deckHeights prop mapping if available, otherwise sort decks alphabetically
        const sortedDecks = Object.keys(deckHeights).length > 0
            ? Object.keys(deckHeights).sort((a, b) => (deckHeights[b] || 0) - (deckHeights[a] || 0)) // Higher value = Higher deck
            : Array.from(deckKeys).sort();

        // Find Bounds for centering
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        if (hasRealCoords) {
            nodes.forEach(n => {
                if (n.x) { minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); }
                if (n.y) { minZ = Math.min(minZ, n.y); maxZ = Math.max(maxZ, n.y); } // Excel Y -> 3D Z
            });
        }
        const centerX = hasRealCoords ? (minX + maxX) / 2 : 0;
        const centerZ = hasRealCoords ? (minZ + maxZ) / 2 : 0;


        nodes.forEach(node => {
            const deck = node.deck || (node.name.length > 2 ? node.name.substring(0, 2) : 'UNK');

            // 1. Calculate Y (Height)
            let levelIndex = deckHeights[deck];
            if (levelIndex === undefined) {
                levelIndex = sortedDecks.indexOf(deck);
            }
            const y = levelIndex * LEVEL_HEIGHT;

            // 2. Calculate X, Z (Plane)
            let x = 0, z = 0;

            if (hasRealCoords && node.x && node.y) {
                // Real Coords Mode
                x = (node.x - centerX) * SCALE;
                z = (node.y - centerZ) * SCALE;
            } else {
                // Grid Fallback Mode
                const deckNodes = nodesByDeck[deck] || [];
                const idx = deckNodes.indexOf(node);
                const cols = Math.ceil(Math.sqrt(deckNodes.length));
                const row = Math.floor(idx / cols);
                const col = idx % cols;

                // Hash-based jitter for organic look
                const hash = node.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                const jitterX = (hash % 10) - 5;
                const jitterZ = ((hash * 13) % 10) - 5;

                x = (col * GRID_SPACING) - ((cols * GRID_SPACING) / 2) + jitterX;
                z = (row * GRID_SPACING) - ((deckNodes.length / cols * GRID_SPACING) / 2) + jitterZ;
            }

            processedNodes.current.set(node.name, { x, y, z, level: levelIndex });
        });

        setDebugInfo(hasRealCoords ? "Real Coordinate Mode" : "Grid Layout Mode");
    };

    // --- 2. Scene Object Creation ---
    const drawScene = () => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current;

        // Clear old
        objectsRef.current.forEach(o => scene.remove(o));
        objectsRef.current = [];

        calculatePositions();

        const nodeGeo = new THREE.BoxGeometry(4, 4, 4);
        const sphereGeo = new THREE.SphereGeometry(3, 16, 16);

        const matDefault = new THREE.MeshLambertMaterial({ color: 0x475569 });
        const matSelected = new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.5 });
        const matStart = new THREE.MeshPhongMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.3 });
        const matEnd = new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.3 });

        const pathSet = new Set(highlightPath || []);

        // Draw Nodes
        nodes.forEach(node => {
            const pos = processedNodes.current.get(node.name);
            if (!pos) return;

            const isRoute = pathSet.has(node.name);
            const isStart = highlightPath?.[0] === node.name;
            const isEnd = highlightPath?.[highlightPath.length - 1] === node.name;

            // LOD: Hide non-route nodes if highlighting path, unless small total count
            if (nodes.length > 200 && highlightPath && highlightPath.length > 0 && !isRoute) {
                return; // Skip drawing irrelevant nodes to focus on route
            }

            let mesh;
            if (isStart) mesh = new THREE.Mesh(sphereGeo, matStart);
            else if (isEnd) mesh = new THREE.Mesh(sphereGeo, matEnd);
            else if (isRoute) mesh = new THREE.Mesh(nodeGeo, matSelected);
            else mesh = new THREE.Mesh(nodeGeo, matDefault); // Standard Node

            mesh.position.set(pos.x, pos.y, pos.z);
            mesh.userData = { id: node.name, type: 'node' };

            scene.add(mesh);
            objectsRef.current.push(mesh);

            // Text Label for Important Nodes
            if (isStart || isEnd || (isRoute && highlightPath!.length < 20)) {
                const sprite = createTextSprite(node.name, isStart ? '#86efac' : isEnd ? '#fca5a5' : '#fde047');
                sprite.position.set(pos.x, pos.y + 6, pos.z);
                scene.add(sprite);
                objectsRef.current.push(sprite);
            }
        });

        // Draw Levels (Decks)
        if (showLevels) {
            const levels = new Set<number>();
            processedNodes.current.forEach(p => levels.add(p.level));

            levels.forEach(lvl => {
                const nodesOnLevel = Array.from(processedNodes.current.values()).filter((p: { level: number }) => p.level === lvl) as { x: number, y: number, z: number, level: number }[];
                if (nodesOnLevel.length === 0) return;

                // Calculate bounds
                const minX = Math.min(...nodesOnLevel.map(n => n.x)) - 20;
                const maxX = Math.max(...nodesOnLevel.map(n => n.x)) + 20;
                const minZ = Math.min(...nodesOnLevel.map(n => n.z)) - 20;
                const maxZ = Math.max(...nodesOnLevel.map(n => n.z)) + 20;
                const y = nodesOnLevel[0].y;

                const width = Math.abs(maxX - minX);
                const depth = Math.abs(maxZ - minZ);
                const centerX = (minX + maxX) / 2;
                const centerZ = (minZ + maxZ) / 2;

                const planeGeo = new THREE.PlaneGeometry(width, depth);
                const planeMat = new THREE.MeshBasicMaterial({
                    color: 0x94a3b8,
                    transparent: true,
                    opacity: 0.1,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                const plane = new THREE.Mesh(planeGeo, planeMat);
                plane.rotation.x = -Math.PI / 2;
                plane.position.set(centerX, y - 5, centerZ); // Slightly below nodes

                scene.add(plane);
                objectsRef.current.push(plane);

                // Grid Helper on Plane
                // const grid = new THREE.GridHelper(Math.max(width, depth), 10, 0x475569, 0x1e293b);
                // grid.position.set(centerX, y - 4.9, centerZ);
                // scene.add(grid);
                // objectsRef.current.push(grid);
            });
        }

        // Draw Route (Neon Tube)
        if (highlightPath && highlightPath.length > 1) {
            drawSmoothRoute(highlightPath);
        }
    };

    const drawSmoothRoute = (path: string[]) => {
        const points: THREE.Vector3[] = [];
        path.forEach(id => {
            const p = processedNodes.current.get(id);
            if (p) points.push(new THREE.Vector3(p.x, p.y, p.z));
        });

        if (points.length < 2) return;

        // Create Smooth Curve (CatmullRom)
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, points.length * 10, 1, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: 0x06b6d4, // Cyan
            emissive: 0x06b6d4,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.8
        });

        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        sceneRef.current?.add(tube);
        objectsRef.current.push(tube);

        // Animation Sphere
        const ballGeo = new THREE.SphereGeometry(1.5, 8, 8);
        const ballMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const ball = new THREE.Mesh(ballGeo, ballMat);
        sceneRef.current?.add(ball);
        objectsRef.current.push(ball);

        // Animate Ball along curve
        let t = 0;
        const animateBall = () => {
            if (!ball.parent) return; // Stopped
            t += 0.005;
            if (t > 1) t = 0;
            const pos = curve.getPointAt(t);
            ball.position.copy(pos);
            requestAnimationFrame(animateBall);
        }
        animateBall();
    };

    const createTextSprite = (message: string, color: string) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 64;
        context.font = 'Bold 24px Arial';
        context.textAlign = 'center';
        context.fillStyle = color;
        context.fillText(message, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
        sprite.scale.set(16, 4, 1);
        return sprite;
    };


    // --- 3. React Effect Hooks ---

    useEffect(() => {
        if (!mountRef.current) return;

        // Init Setup
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0b1121'); // Dark Slate/Blue
        scene.fog = new THREE.FogExp2('#0b1121', 0.002);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 5000);
        camera.position.set(200, 200, 300);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 1.0;
        controlsRef.current = controls;

        // Lighting
        const amb = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(amb);
        const dir = new THREE.DirectionalLight(0xffffff, 1);
        dir.position.set(100, 200, 100);
        scene.add(dir);
        const point = new THREE.PointLight(0x3b82f6, 1, 1000);
        point.position.set(0, 100, 0);
        scene.add(point);

        // Handle Resize
        const onResize = () => {
            camera.aspect = mountRef.current!.clientWidth / mountRef.current!.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mountRef.current!.clientWidth, mountRef.current!.clientHeight);
        };
        window.addEventListener('resize', onResize);

        // Raycaster for Hover
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onMouseMove = (event: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(objectsRef.current, false);

            const nodeHit = intersects.find(i => i.object.userData?.type === 'node');
            if (nodeHit) {
                setHoveredNode(nodeHit.object.userData.id);
                document.body.style.cursor = 'pointer';
            } else {
                setHoveredNode(null);
                document.body.style.cursor = 'default';
            }
        };
        renderer.domElement.addEventListener('mousemove', onMouseMove);

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            window.removeEventListener('resize', onResize);
            renderer.domElement.removeEventListener('mousemove', onMouseMove);
            if (mountRef.current) mountRef.current.innerHTML = '';
            renderer.dispose();
        };
    }, []);

    // Redraw when Props Change
    useEffect(() => {
        drawScene();
    }, [nodes, highlightPath, showLevels, deckHeights]);

    // Update AutoRotate
    useEffect(() => {
        if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
    }, [autoRotate]);

    return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden shadow-2xl rounded-xl border border-slate-700">
            <div ref={mountRef} className="w-full h-full cursor-move" />

            {/* HUD Overlay */}
            <div className="absolute top-4 left-4 p-4 bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700/50 text-slate-200 w-64 shadow-xl">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
                    <Activity className="text-blue-400" size={18} />
                    <span className="font-bold text-sm tracking-widest">3D VIEW SYSTEM</span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Nodes:</span>
                        <span className="text-slate-300">{nodes.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Route:</span>
                        <span className={highlightPath ? "text-green-400" : "text-slate-500"}>
                            {highlightPath ? `${highlightPath.length} Nodes` : 'Inactive'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Mode:</span>
                        <span className="text-yellow-500">{debugInfo}</span>
                    </div>
                    {hoveredNode && (
                        <div className="mt-2 p-2 bg-blue-500/20 border border-blue-500/50 rounded animate-pulse text-center text-blue-300 font-bold">
                            {hoveredNode}
                        </div>
                    )}
                </div>

                <div className="mt-4 space-y-2">
                    <button
                        onClick={() => setShowLevels(!showLevels)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs transition-colors ${showLevels ? 'bg-blue-600/20 text-blue-400 border border-blue-600/50' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><Layers size={14} /> Show Decks</span>
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                    </button>

                    <button
                        onClick={() => setAutoRotate(!autoRotate)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs transition-colors ${autoRotate ? 'bg-green-600/20 text-green-400 border border-green-600/50' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><Box size={14} /> Auto Rotate</span>
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute top-4 right-4 flex gap-2">
                <button
                    onClick={onClose}
                    className="bg-red-500/80 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded shadow-lg backdrop-blur"
                >
                    CLOSE SCENE
                </button>
            </div>

            <div className="absolute bottom-4 left-4 text-[10px] text-slate-500 font-mono flex gap-4">
                <span className="flex items-center gap-1"><MousePointer2 size={10} /> Left Click: Rotate</span>
                <span>Right Click: Pan</span>
                <span>Scroll: Zoom</span>
            </div>
        </div>
    );
};

export default ThreeSceneUltra;
