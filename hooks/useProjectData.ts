import { useState, useEffect, useCallback } from 'react';
import { Cable, Node, GenericRow, DeckConfig } from '../types';
import { initialCables, initialNodes, initialCableTypes } from '../services/mockData';
import { ExcelService } from '../services/excelService';
import { RoutingService } from '../services/routingService';

// Default Config
const DEFAULT_DECK_CONFIG: DeckConfig = {
    "A DECK": 28000,
    "B DECK": 25000,
    "C DECK": 22000,
    "D DECK": 19000,
    "UPPER DECK": 16000,
    "MAIN DECK": 13000,
    "TANK TOP": 2000
};

// Known Ships
const AVAILABLE_SHIPS = [
    { id: "S1001_35K_FD", name: "35K D/F PRODUCT/OM CARRIER" },
    { id: "H2505_VLCC", name: "VLCC CRUDE OIL CARRIER" },
    { id: "K3030_LNG", name: "174K LNG CARRIER" }
];

export const useProjectData = () => {
    // Core Data State
    const [shipId, setShipId] = useState<string>("S1001_35K_FD");
    const [cables, setCables] = useState<Cable[]>([]);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [cableTypes, setCableTypes] = useState<GenericRow[]>(initialCableTypes);
    const [deckHeights, setDeckHeights] = useState<DeckConfig>(DEFAULT_DECK_CONFIG);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [dataSource, setDataSource] = useState<'cache' | 'excel' | 'localStorage' | 'mock'>('mock');

    // Load Data with Priority: 1. LocalStorage -> 2. JSON Cache -> 3. Excel -> 4. Mock
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            console.log(`🔄 Loading data for ${shipId}...`);

            try {
                // PRIORITY 1: Check LocalStorage (user's saved session data)
                const savedData = localStorage.getItem(`SEASTAR_DATA_${shipId}`);
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    // Only use if it has significant data (not mock)
                    if (parsed.cables && parsed.cables.length > 100) {
                        setCables(parsed.cables);
                        setNodes(parsed.nodes || []);
                        setCableTypes(parsed.cableTypes || initialCableTypes);
                        setDeckHeights(parsed.deckHeights || DEFAULT_DECK_CONFIG);
                        setDataSource('localStorage');
                        console.log(`✅ Loaded ${parsed.cables.length} cables from LocalStorage`);
                        setIsLoading(false);
                        return;
                    }
                }

                // PRIORITY 2: Try loading pre-computed JSON cache (fastest, already routed)
                const cacheUrl = `/data/${shipId}/cache.json`;
                console.log(`🔍 Checking for JSON cache at ${cacheUrl}...`);
                const cacheResponse = await fetch(cacheUrl);
                if (cacheResponse.ok) {
                    const cacheData = await cacheResponse.json();
                    if (cacheData.cables && cacheData.cables.length > 0) {
                        setCables(cacheData.cables);
                        setNodes(cacheData.nodes || []);
                        setCableTypes(cacheData.cableTypes || initialCableTypes);
                        setDeckHeights(cacheData.deckHeights || DEFAULT_DECK_CONFIG);
                        setDataSource('cache');
                        console.log(`✅ Loaded ${cacheData.cables.length} cables from JSON cache (pre-routed)`);
                        // Also save to localStorage for faster next load
                        localStorage.setItem(`SEASTAR_DATA_${shipId}`, JSON.stringify(cacheData));
                        setIsLoading(false);
                        return;
                    }
                }
                console.log(`⚠️ No valid JSON cache found, falling back to Excel...`);

                // PRIORITY 3: Load from Excel files and compute routes
                const loadedNodes = await loadNodesFromExcel(shipId);
                const loadedCables = await loadCablesFromExcel(shipId);

                if (loadedNodes.length > 0 && loadedCables.length > 0) {
                    setNodes(loadedNodes);
                    console.log(`📊 Loaded ${loadedCables.length} cables, ${loadedNodes.length} nodes from Excel`);

                    // Compute all routes
                    console.log(`🚀 Computing routes for ${loadedCables.length} cables...`);
                    const routedCables = computeAllRoutes(loadedCables, loadedNodes);
                    setCables(routedCables);
                    setDataSource('excel');

                    // Save to localStorage for next time
                    const dataToSave = {
                        cables: routedCables,
                        nodes: loadedNodes,
                        cableTypes: initialCableTypes,
                        deckHeights: DEFAULT_DECK_CONFIG,
                        generatedAt: new Date().toISOString()
                    };
                    localStorage.setItem(`SEASTAR_DATA_${shipId}`, JSON.stringify(dataToSave));
                    console.log(`💾 Saved computed routes to LocalStorage`);

                    // Log cache generation hint
                    console.log(`💡 TIP: To create a static JSON cache, download the LocalStorage data and save as /data/${shipId}/cache.json`);
                } else {
                    // PRIORITY 4: Fallback to mock data
                    console.warn(`⚠️ Could not load Excel data, using mock data`);
                    setCables(initialCables);
                    setNodes(initialNodes);
                    setDataSource('mock');
                }
            } catch (error) {
                console.error("❌ Data Load Error:", error);
                setCables(initialCables);
                setNodes(initialNodes);
                setDataSource('mock');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [shipId]);

    // Helper: Load nodes from Excel
    const loadNodesFromExcel = async (id: string): Promise<Node[]> => {
        try {
            let response = await fetch(`/data/${id}/nodes.xlsx`);
            if (!response.ok) response = await fetch(`data/${id}/nodes.xlsx`);
            if (response.ok) {
                const blob = await response.blob();
                const raw = await ExcelService.importFromExcel(new File([blob], 'nodes.xlsx'));
                return ExcelService.mapRawToNode(raw);
            }
        } catch (e) {
            console.error("Failed to load nodes:", e);
        }
        return [];
    };

    // Helper: Load cables from Excel
    const loadCablesFromExcel = async (id: string): Promise<Cable[]> => {
        try {
            let response = await fetch(`/data/${id}/cables.xlsx`);
            if (!response.ok) response = await fetch(`data/${id}/cables.xlsx`);
            if (response.ok) {
                const blob = await response.blob();
                const raw = await ExcelService.importFromExcel(new File([blob], 'cables.xlsx'));
                return ExcelService.mapRawToCable(raw);
            }
        } catch (e) {
            console.error("Failed to load cables:", e);
        }
        return [];
    };

    // Helper: Compute all routes synchronously
    const computeAllRoutes = (cables: Cable[], nodes: Node[]): Cable[] => {
        if (nodes.length === 0) return cables;

        const routingService = new RoutingService(nodes);
        let count = 0;

        const routed = cables.map(cable => {
            if (cable.fromNode && cable.toNode) {
                const result = routingService.findRoute(cable.fromNode, cable.toNode, cable.checkNode);
                if (result.path.length > 0) {
                    count++;
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
                    return { ...cable, routeError: result.error || 'Routing failed' };
                }
            }
            return cable;
        });

        console.log(`✅ Computed ${count}/${cables.length} routes successfully`);
        return routed;
    };

    // Save Data
    const saveData = useCallback(() => {
        const data = { cables, nodes, cableTypes, deckHeights, savedAt: new Date().toISOString() };
        localStorage.setItem(`SEASTAR_DATA_${shipId}`, JSON.stringify(data));
        console.log("💾 Project Saved to LocalStorage.");
    }, [cables, nodes, cableTypes, deckHeights, shipId]);

    // Export cache as JSON (for generating static cache file)
    const exportCacheAsJson = useCallback(() => {
        const data = {
            cables, nodes, cableTypes, deckHeights,
            generatedAt: new Date().toISOString(),
            shipId
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cache_${shipId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log(`📁 Exported cache.json - Place this file in /public/data/${shipId}/cache.json`);
    }, [cables, nodes, cableTypes, deckHeights, shipId]);

    return {
        shipId, setShipId,
        cables, setCables,
        nodes, setNodes,
        cableTypes, setCableTypes,
        deckHeights, setDeckHeights,
        isLoading, setIsLoading,
        saveData,
        exportCacheAsJson,
        dataSource,
        availableShips: AVAILABLE_SHIPS
    };
};
