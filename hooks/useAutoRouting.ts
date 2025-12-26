import { useState, useEffect, useCallback } from 'react';
import { Cable, Node, RouteResult } from '../types';
import { RoutingService } from '../services/routingService';

interface AutoRoutingProps {
    nodes: Node[];
    cables: Cable[];
    setCables: (cables: Cable[]) => void;
    saveData: () => void;
}

export const useAutoRouting = ({ nodes, cables, setCables, saveData }: AutoRoutingProps) => {
    const [routingService, setRoutingService] = useState<RoutingService | null>(null);
    const [routePath, setRoutePath] = useState<string[]>([]);
    const [autoRouted, setAutoRouted] = useState(false);
    const [isRouting, setIsRouting] = useState(false);

    // Initialize Routing Service when nodes change
    useEffect(() => {
        if (nodes.length > 0) {
            const svc = new RoutingService(nodes);
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
        } else {
            const updatedCables = cables.map(c =>
                c.id === cable.id
                    ? { ...c, routeError: result.error || 'Unknown routing error' }
                    : c
            );
            setCables(updatedCables);
            alert(`Routing Failed: ${result.error || 'Unknown error'}`);
        }
    }, [routingService, cables, setCables]);

    // Batch Routing (All)
    const calculateAllRoutes = useCallback(() => {
        if (!routingService) return;
        setIsRouting(true);

        setTimeout(() => {
            let calculatedCount = 0;
            const updatedCables = cables.map(cable => {
                // Skip if already routed (optional strategy, but for "Re-calc all" we might want to redo)
                // Here we redo everything to be safe
                if (cable.fromNode && cable.toNode) {
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
                            path: result.path.join(','),
                            routeError: undefined
                        };
                    } else {
                        return {
                            ...cable,
                            routeError: result.error || 'Unknown routing error'
                        };
                    }
                }
                return cable;
            });

            setCables(updatedCables);
            saveData(); // Auto-save
            setIsRouting(false);
            alert(`Route Generation Complete. ${calculatedCount} routes updated.`);
        }, 100);
    }, [routingService, cables, setCables, saveData]);

    // Batch Routing (Selected)
    const calculateSelectedRoutes = useCallback((selectedCables: Cable[]) => {
        if (!routingService || selectedCables.length === 0) return;
        setIsRouting(true);

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
            setIsRouting(false);
            alert(`Selected Route Generation Complete. ${calculatedCount} routes updated.`);
        }, 100);
    }, [routingService, cables, setCables]);

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
        calculateSelectedRoutes
    };
};
