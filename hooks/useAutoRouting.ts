import { useState, useEffect, useCallback } from 'react';
import { Cable, Node, RouteResult } from '../types';
import { RoutingService } from '../services/routingService';
import { EnhancedRoutingService } from '../services/EnhancedRoutingService';

interface AutoRoutingProps {
    nodes: Node[];
    cables: Cable[];
    setCables: (cables: Cable[]) => void;
    saveData: (cables?: Cable[]) => void;
}

export const useAutoRouting = ({ nodes, cables, setCables, saveData }: AutoRoutingProps) => {
    const [routingService, setRoutingService] = useState<RoutingService | EnhancedRoutingService | null>(null);
    const [routePath, setRoutePath] = useState<string[]>([]);
    const [autoRouted, setAutoRouted] = useState(false);
    const [isRouting, setIsRouting] = useState(false);

    // Initialize Routing Service when nodes change
    useEffect(() => {
        if (nodes.length > 0) {
            const svc = new EnhancedRoutingService(nodes);
            setRoutingService(svc);
        }
    }, [nodes]);

    // Single Cable Routing
    const calculateRoute = useCallback((cable: Cable) => {
        if (!routingService) {
            alert("Routing Engine not ready. Please load Node data.");
            return;
        }

        const result = routingService.findRoute(cable.fromNode, cable.toNode, cable.checkNode);

        if (result.path.length > 0) {
            setRoutePath(result.path);
            const updatedCables = cables.map(c =>
                c.id === cable.id
                    ? {
                        ...c,
                        calculatedPath: result.path,
                        calculatedLength: result.distance,
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
                    ? { ...c, routeError: result.error || 'Unknown routing error' }
                    : c
            );
            setCables(updatedCables);
            saveData(updatedCables);
            alert(`Routing Failed: ${result.error || 'Unknown error'}`);
        }
    }, [routingService, cables, setCables, saveData]);

    // Batch Routing (All)
    const calculateAllRoutes = useCallback(async () => {
        if (!routingService) return;
        setIsRouting(true);

        return new Promise<void>((resolve) => {
            // Use setTimeout to allow UI to update to loading state
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
                            const result = routingService.findRoute(cable.fromNode, cable.toNode, cable.checkNode);
                            if (result.path.length > 0) {
                                calculatedCount++;
                                const fromRest = parseFloat(String(cable.fromRest || 0)) || 0;
                                const toRest = parseFloat(String(cable.toRest || 0)) || 0;
                                const totalLength = result.distance + fromRest + toRest;

                                currentCables[i] = {
                                    ...cable,
                                    calculatedPath: result.path,
                                    calculatedLength: totalLength,
                                    length: totalLength,
                                    path: result.path.join(','),
                                    routeError: undefined
                                };
                            } else {
                                currentCables[i] = {
                                    ...cable,
                                    routeError: result.error || 'Unknown routing error'
                                };
                            }
                        }
                    }

                    processed = end;
                    if (processed < total) {
                        // Schedule next chunk
                        setTimeout(processChunk, 10);
                    } else {
                        // Finished
                        setCables(currentCables);
                        saveData(currentCables);
                        setIsRouting(false);
                        alert(`Route Generation Complete. ${calculatedCount} routes updated.`);
                        resolve();
                    }
                };

                processChunk();
            }, 100);
        });
    }, [routingService, cables, setCables, saveData]);

    // Batch Routing (Selected)
    const calculateSelectedRoutes = useCallback(async (selectedCables: Cable[]) => {
        if (!routingService || selectedCables.length === 0) return;
        setIsRouting(true);

        return new Promise<void>((resolve) => {
            setTimeout(() => {
                let calculatedCount = 0;
                const selectedIds = new Set(selectedCables.map(c => c.id));
                const updatedCables = cables.map(cable => {
                    if (selectedIds.has(cable.id) && cable.fromNode && cable.toNode) {
                        const result = routingService.findRoute(cable.fromNode, cable.toNode, cable.checkNode);
                        if (result.path.length > 0) {
                            calculatedCount++;
                            const fromRest = parseFloat(String(cable.fromRest || 0)) || 0;
                            const toRest = parseFloat(String(cable.toRest || 0)) || 0;
                            const totalLength = result.distance + fromRest + toRest;

                            return {
                                ...cable,
                                calculatedPath: result.path,
                                calculatedLength: totalLength,
                                length: totalLength,
                                path: result.path.join(',')
                            };
                        }
                    }
                    return cable;
                });

                setCables(updatedCables);
                saveData(updatedCables); // Save changes
                setIsRouting(false);
                alert(`Selected Route Generation Complete. ${calculatedCount} routes updated.`);
                resolve();
            }, 100);
        });
    }, [routingService, cables, setCables, saveData]);

    // Startup Auto-Routing Trigger
    useEffect(() => {
        if (routingService && cables.length > 0 && nodes.length > 0 && !autoRouted) {
            const needsRouting = cables.some(c => !c.calculatedPath || c.calculatedPath.length === 0);
            if (needsRouting) {
                console.log('🚀 Auto-routing cables on startup...');
                setTimeout(() => {
                    calculateAllRoutes();
                    setAutoRouted(true);
                }, 1000);
            } else {
                setAutoRouted(true);
            }
        }
    }, [routingService, cables.length, nodes.length, autoRouted, calculateAllRoutes]);

    return {
        routingService,
        routePath, setRoutePath,
        isRouting,
        calculateRoute,
        calculateAllRoutes,
        calculateSelectedRoutes,
        isReady: !!routingService
    };
};
