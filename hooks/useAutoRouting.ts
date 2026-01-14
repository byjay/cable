/**
 * Auto Routing Hook - 라우팅.html 로직 기반
 * Uses Dijkstra algorithm with linkLength weights
 */

import { useState, useEffect, useCallback } from 'react';
import { Cable, Node, NodeData } from '../types';
import { calculatePath, routeAllCables, RouteResult } from '../services/routing';

interface AutoRoutingProps {
    nodes: Node[];
    cables: Cable[];
    setCables: (cables: Cable[]) => void;
    saveData: (cables?: Cable[]) => void;
}

export const useAutoRouting = ({ nodes, cables, setCables, saveData }: AutoRoutingProps) => {
    const [routePath, setRoutePath] = useState<string[]>([]);
    const [autoRouted, setAutoRouted] = useState(false);
    const [isRouting, setIsRouting] = useState(false);
    const [routingProgress, setRoutingProgress] = useState(0);

    // Convert nodes to NodeData format for routing
    const nodeData: NodeData[] = nodes.map(n => ({
        name: n.name,
        relation: n.relation,
        linkLength: n.linkLength
    } as NodeData));

    // Single Cable Routing - 라우팅.html calculatePath 사용
    const calculateRoute = useCallback((cable: Cable) => {
        if (nodeData.length === 0) {
            alert("라우팅 엔진이 준비되지 않았습니다. 노드 데이터를 로드해주세요.");
            return;
        }

        const result = calculatePath(nodeData, cable.fromNode, cable.toNode, cable.checkNode || '');

        if (result && result.path.length > 0) {
            setRoutePath(result.path);

            const updatedCables = cables.map(c =>
                c.id === cable.id
                    ? {
                        ...c,
                        calculatedPath: result.path,
                        calculatedLength: result.length,
                        length: result.length,
                        path: result.path.join(','),
                        routeError: undefined
                    }
                    : c
            );
            setCables(updatedCables);
            saveData(updatedCables);
        } else {
            const updatedCables = cables.map(c =>
                c.id === cable.id
                    ? { ...c, routeError: '경로를 찾을 수 없습니다' }
                    : c
            );
            setCables(updatedCables);
            saveData(updatedCables);
            alert(`라우팅 실패: 경로를 찾을 수 없습니다`);
        }
    }, [nodeData, cables, setCables, saveData]);

    // Batch Routing (All) - 라우팅.html calculateAllPaths 로직
    const calculateAllRoutes = useCallback(async () => {
        if (nodeData.length === 0) return;
        setIsRouting(true);
        setRoutingProgress(0);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                const chunkSize = 100;
                let processed = 0;
                let calculatedCount = 0;
                const total = cables.length;
                let currentCables = [...cables];

                const processChunk = () => {
                    const end = Math.min(processed + chunkSize, total);
                    for (let i = processed; i < end; i++) {
                        const cable = currentCables[i];
                        if (cable.fromNode && cable.toNode) {
                            const result = calculatePath(nodeData, cable.fromNode, cable.toNode, cable.checkNode || '');
                            if (result && result.path.length > 0) {
                                calculatedCount++;
                                currentCables[i] = {
                                    ...cable,
                                    calculatedPath: result.path,
                                    calculatedLength: result.length,
                                    length: result.length,
                                    path: result.path.join(','),
                                    routeError: undefined
                                };
                            } else {
                                currentCables[i] = {
                                    ...cable,
                                    routeError: '경로 없음'
                                };
                            }
                        }
                    }

                    processed = end;
                    setRoutingProgress(Math.round((processed / total) * 100));

                    if (processed < total) {
                        setTimeout(processChunk, 10);
                    } else {
                        setCables(currentCables);
                        saveData(currentCables);
                        setIsRouting(false);
                        alert(`라우팅 완료: ${calculatedCount}개 경로 산출됨`);
                        resolve();
                    }
                };

                processChunk();
            }, 100);
        });
    }, [nodeData, cables, setCables, saveData]);

    // Batch Routing (Selected)
    const calculateSelectedRoutes = useCallback(async (selectedCables: Cable[]) => {
        if (nodeData.length === 0 || selectedCables.length === 0) return;
        setIsRouting(true);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                let calculatedCount = 0;
                const selectedIds = new Set(selectedCables.map(c => c.id));
                const updatedCables = cables.map(cable => {
                    if (selectedIds.has(cable.id) && cable.fromNode && cable.toNode) {
                        const result = calculatePath(nodeData, cable.fromNode, cable.toNode, cable.checkNode || '');
                        if (result && result.path.length > 0) {
                            calculatedCount++;
                            return {
                                ...cable,
                                calculatedPath: result.path,
                                calculatedLength: result.length,
                                length: result.length,
                                path: result.path.join(',')
                            };
                        }
                    }
                    return cable;
                });

                setCables(updatedCables);
                saveData(updatedCables);
                setIsRouting(false);
                alert(`선택 라우팅 완료: ${calculatedCount}개 경로 산출됨`);
                resolve();
            }, 100);
        });
    }, [nodeData, cables, setCables, saveData]);

    // Auto-Routing Trigger DISABLED - Manual load via button required
    // User requested: No automatic data loading at startup
    // Data loading is triggered when user selects a ship and clicks "Load Data" button
    /*
    useEffect(() => {
        if (nodeData.length > 0 && cables.length > 0 && !autoRouted) {
            const needsRouting = cables.some(c => !c.calculatedPath || c.calculatedPath.length === 0);
            if (needsRouting) {
                console.log('🚀 자동 라우팅 시작...');
                setTimeout(() => {
                    calculateAllRoutes();
                    setAutoRouted(true);
                }, 1000);
            } else {
                setAutoRouted(true);
            }
        }
    }, [nodeData.length, cables.length, autoRouted, calculateAllRoutes]);
    */


    return {
        routingService: null, // Compatibility
        routePath, setRoutePath,
        isRouting,
        routingProgress,
        calculateRoute,
        calculateAllRoutes,
        calculateSelectedRoutes,
        isReady: nodeData.length > 0
    };
};
