import React, { useEffect, useRef, useState } from 'react';

const CableNetworkBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            if (canvasRef.current) {
                setDimensions({
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = dimensions.width;
        canvas.height = dimensions.height;

        // Configuration
        const GRID_SIZE = 60;
        const NODE_RADIUS = 3;
        const PACKET_COUNT = 30;
        const PACKET_SPEED = 2; // Pixels per frame

        // Colors
        const BG_COLOR = '#0f172a'; // Slate 900
        const GRID_COLOR = '#1e293b'; // Slate 800
        const NODE_COLOR = '#334155'; // Slate 700
        const PATH_COLOR = '#3b82f6'; // Blue 500
        const PACKET_COLOR = '#06b6d4'; // Cyan 500
        const PACKET_TAIL_COLOR = 'rgba(6, 182, 212, 0.2)';

        // State definition
        interface Point { x: number; y: number; }
        interface Packet {
            current: Point;
            target: Point;
            path: Point[];
            progress: number;
            speed: number;
            color: string;
            trail: Point[];
        }

        const nodes: Point[] = [];
        // Generate nodes on grid intersection
        const cols = Math.ceil(dimensions.width / GRID_SIZE);
        const rows = Math.ceil(dimensions.height / GRID_SIZE);

        for (let i = 0; i <= cols; i++) {
            for (let j = 0; j <= rows; j++) {
                if (Math.random() > 0.7) { // 30% chance to be a "Station"
                    nodes.push({
                        x: i * GRID_SIZE,
                        y: j * GRID_SIZE
                    });
                }
            }
        }

        // Initialize Packets
        const packets: Packet[] = [];

        const spawnPacket = (): Packet => {
            const startNode = nodes[Math.floor(Math.random() * nodes.length)];
            let endNode = nodes[Math.floor(Math.random() * nodes.length)];

            // Simple Manhattan Pathfinding Generation
            // Just move X then Y for "subway/pipe" look
            const path: Point[] = [];
            let current = { ...startNode };

            // Randomly decide to move X first or Y first
            if (Math.random() > 0.5) {
                path.push({ x: endNode.x, y: current.y }); // Move X
                path.push({ x: endNode.x, y: endNode.y }); // Move Y
            } else {
                path.push({ x: current.x, y: endNode.y }); // Move Y
                path.push({ x: endNode.x, y: endNode.y }); // Move X
            }

            return {
                current: { ...startNode },
                target: path[0],
                path: path,
                progress: 0,
                speed: PACKET_SPEED + Math.random(),
                color: Math.random() > 0.5 ? '#3b82f6' : '#22d3ee', // Blue or Cyan
                trail: []
            };
        };

        for (let i = 0; i < PACKET_COUNT; i++) {
            packets.push(spawnPacket());
        }

        let animationFrameId: number;

        const render = () => {
            // Clear Background
            ctx.fillStyle = BG_COLOR;
            ctx.fillRect(0, 0, dimensions.width, dimensions.height);

            // Draw Grid
            ctx.strokeStyle = GRID_COLOR;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i <= cols; i++) {
                ctx.moveTo(i * GRID_SIZE, 0);
                ctx.lineTo(i * GRID_SIZE, dimensions.height);
            }
            for (let j = 0; j <= rows; j++) {
                ctx.moveTo(0, j * GRID_SIZE);
                ctx.lineTo(dimensions.width, j * GRID_SIZE);
            }
            ctx.stroke();

            // Draw Nodes
            ctx.fillStyle = NODE_COLOR;
            for (const node of nodes) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }

            // Update and Draw Packets
            for (let i = 0; i < packets.length; i++) {
                const p = packets[i];

                // Move logic
                const dx = p.target.x - p.current.x;
                const dy = p.target.y - p.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < p.speed) {
                    p.current = p.target;
                    // Next waypoint
                    if (p.path.length > 0) {
                        p.target = p.path.shift()!;
                    } else {
                        // Re-spawn
                        packets[i] = spawnPacket();
                    }
                } else {
                    const angle = Math.atan2(dy, dx);
                    p.current.x += Math.cos(angle) * p.speed;
                    p.current.y += Math.sin(angle) * p.speed;
                }

                // Trail Logic
                p.trail.push({ ...p.current });
                if (p.trail.length > 20) p.trail.shift();

                // Draw Trail (Pipe flow effect)
                if (p.trail.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(p.trail[0].x, p.trail[0].y);
                    for (const point of p.trail) {
                        ctx.lineTo(point.x, point.y);
                    }
                    // Gradient Trail
                    const gradient = ctx.createLinearGradient(
                        p.trail[0].x, p.trail[0].y,
                        p.current.x, p.current.y
                    );
                    gradient.addColorStop(0, 'rgba(0,0,0,0)');
                    gradient.addColorStop(1, p.color);

                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.stroke();
                }

                // Draw Head
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(p.current.x, p.current.y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [dimensions]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.8 }}
        />
    );
};

export default CableNetworkBackground;
