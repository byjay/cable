/**
 * Routing Service - 100% 라우팅.html 로직 그대로 이식
 * Dijkstra 알고리즘 + linkLength 가중치 사용
 */

import { CableData, NodeData } from '../types';

// 노드 맵 타입 (라우팅.html의 nodeMap과 동일)
interface NodeMapEntry {
    relations: string[];
    linkLength: number;
}

// 라우팅 결과 타입
export interface RouteResult {
    path: string[];
    length: number;
}

/**
 * Dijkstra 알고리즘 - 라우팅.html의 calculateShortestPath 함수 100% 이식
 */
export const calculateShortestPath = (
    nodeData: NodeData[],
    fromNode: string,
    toNode: string
): RouteResult | null => {
    if (fromNode === toNode) return { path: [fromNode], length: 0 };

    const nodeMap: Record<string, NodeMapEntry> = {};
    nodeData.forEach(node => {
        nodeMap[node.name] = {
            relations: node.relation ? node.relation.split(',').map(s => s.trim()) : [],
            linkLength: (node as any).linkLength || 1
        };
    });

    if (!nodeMap[fromNode] || !nodeMap[toNode]) return null;

    // Dijkstra's algorithm
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const unvisited = new Set<string>();

    nodeData.forEach(node => {
        distances[node.name] = Infinity;
        previous[node.name] = null;
        unvisited.add(node.name);
    });
    distances[fromNode] = 0;

    while (unvisited.size > 0) {
        let currentNode: string | null = null;
        let minDist = Infinity;

        unvisited.forEach(node => {
            if (distances[node] < minDist) {
                minDist = distances[node];
                currentNode = node;
            }
        });

        if (currentNode === null || currentNode === toNode) break;
        unvisited.delete(currentNode);

        const neighbors = nodeMap[currentNode].relations;
        neighbors.forEach(neighbor => {
            if (unvisited.has(neighbor)) {
                const alt = distances[currentNode!] + nodeMap[currentNode!].linkLength;
                if (alt < distances[neighbor]) {
                    distances[neighbor] = alt;
                    previous[neighbor] = currentNode;
                }
            }
        });
    }

    if (distances[toNode] === Infinity) return null;

    const path: string[] = [];
    let current: string | null = toNode;
    while (current !== null) {
        path.unshift(current);
        current = previous[current];
    }

    return { path, length: Math.round(distances[toNode] * 10) / 10 };
};

/**
 * Checkpoint 경유 경로 계산 - 라우팅.html의 calculatePathWithCheckpoints 함수 100% 이식
 */
export const calculatePathWithCheckpoints = (
    nodeData: NodeData[],
    fromNode: string,
    toNode: string,
    checkNodes: string[]
): RouteResult | null => {
    const fullPath: string[] = [fromNode];
    let totalLength = 0;
    let currentNode = fromNode;

    for (const checkpoint of checkNodes) {
        const segment = calculateShortestPath(nodeData, currentNode, checkpoint);
        if (!segment) return null;

        fullPath.push(...segment.path.slice(1));
        totalLength += segment.length;
        currentNode = checkpoint;
    }

    const finalSegment = calculateShortestPath(nodeData, currentNode, toNode);
    if (!finalSegment) return null;

    fullPath.push(...finalSegment.path.slice(1));
    totalLength += finalSegment.length;

    return { path: fullPath, length: totalLength };
};

/**
 * 경로 계산 메인 함수 - 라우팅.html의 calculatePath 함수 100% 이식
 */
export const calculatePath = (
    nodeData: NodeData[],
    fromNode: string,
    toNode: string,
    checkNodeStr: string = ''
): RouteResult | null => {
    const checkNodes = checkNodeStr ? checkNodeStr.split(',').map(s => s.trim()).filter(s => s) : [];

    if (checkNodes.length > 0) {
        return calculatePathWithCheckpoints(nodeData, fromNode, toNode, checkNodes);
    } else {
        return calculateShortestPath(nodeData, fromNode, toNode);
    }
};

/**
 * 전체 케이블 라우팅 - 라우팅.html의 calculateAllPaths 함수 로직 이식
 */
export const routeAllCables = (
    cables: CableData[],
    nodeData: NodeData[]
): CableData[] => {
    if (nodeData.length === 0) return cables;

    return cables.map(cable => {
        if (!cable.fromNode || !cable.toNode) return cable;

        const result = calculatePath(
            nodeData,
            cable.fromNode,
            cable.toNode,
            cable.checkNode || ''
        );

        if (result) {
            return {
                ...cable,
                calculatedPath: result.path,
                calculatedLength: result.length
            };
        }
        return cable;
    });
};

/**
 * 그래프 빌드 - tray-fill 호환성 유지
 */
export const buildGraph = (nodes: NodeData[]): Record<string, { name: string; neighbors: string[] }> => {
    const graph: Record<string, { name: string; neighbors: string[] }> = {};
    nodes.forEach(node => {
        const neighbors = node.relation
            ? String(node.relation).split(',').map(s => s.trim()).filter(s => s)
            : [];
        graph[node.name] = { name: node.name, neighbors };
    });
    return graph;
};
