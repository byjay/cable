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
export const AVAILABLE_SHIPS = [
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

    // Load Data with Priority: 1. Split Storage -> 2. Monolithic Storage (Migration) -> 3. JSON Cache -> 4. Excel -> 5. Mock
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            console.log(`🔄 Loading data for ${shipId}...`);

            try {
                // LOAD GLOBAL SETTINGS FIRST
                const globalData = localStorage.getItem('SEASTAR_GLOBAL_SETTINGS');
                if (globalData) {
                    const parsedGlobal = JSON.parse(globalData);
                    setCableTypes(parsedGlobal.cableTypes || initialCableTypes);
                    setDeckHeights(parsedGlobal.deckHeights || DEFAULT_DECK_CONFIG);
                    // Add other global master data here if needed
                }

                // CHECK FOR SPLIT STORAGE (NEW MODEL)
                const shipCablesKey = `SEASTAR_SHIP_${shipId}_CABLES`;
                const shipNodesKey = `SEASTAR_SHIP_${shipId}_NODES`;

                const storedCables = localStorage.getItem(shipCablesKey);
                const storedNodes = localStorage.getItem(shipNodesKey);

                if (storedCables && storedNodes) {
                    const parsedCables = JSON.parse(storedCables);
                    const parsedNodes = JSON.parse(storedNodes);

                    if (parsedCables.length > 0) {
                        setCables(parsedCables);
                        setNodes(parsedNodes);
                        setDataSource('localStorage');
                        console.log(`✅ Loaded ${parsedCables.length} cables from Split Storage for ${shipId}`);
                        setIsLoading(false);
                        return;
                    }
                }

                // FALLBACK: CHECK MONOLITHIC STORAGE (OLD MODEL) & MIGRATE
                const oldKey = `SEASTAR_DATA_${shipId}`;
                const savedData = localStorage.getItem(oldKey);
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    if (parsed.cables && parsed.cables.length > 0) {
                        console.log("⚠️ Old Data Format Detected. Migrating to Split Storage...");

                        // Migrate to Split Keys
                        localStorage.setItem(shipCablesKey, JSON.stringify(parsed.cables));
                        localStorage.setItem(shipNodesKey, JSON.stringify(parsed.nodes || []));

                        // Save Global if not exists (or overwrite? prefer preserve existing global if new)
                        if (!globalData) {
                            const globalPayload = {
                                cableTypes: parsed.cableTypes || initialCableTypes,
                                deckHeights: parsed.deckHeights || DEFAULT_DECK_CONFIG
                            };
                            localStorage.setItem('SEASTAR_GLOBAL_SETTINGS', JSON.stringify(globalPayload));
                            setCableTypes(globalPayload.cableTypes);
                            setDeckHeights(globalPayload.deckHeights);
                        }

                        setCables(parsed.cables);
                        setNodes(parsed.nodes || []);
                        setDataSource('localStorage');
                        setIsLoading(false);
                        return;
                    }
                }

                // PRIORITY 3: JSON CACHE (TODO: Update cache loader to support split or adapt monolithic cache)
                // For now, assume cache is still monolithic source of truth for new ships
                try {
                    const cacheUrl = `./data/${shipId}/cache.json`;
                    console.log(`🔍 Checking for JSON cache at ${cacheUrl}...`);
                    const cacheResponse = await fetch(cacheUrl);
                    if (cacheResponse.ok) {
                        const cacheData = await cacheResponse.json();
                        if (cacheData.cables && cacheData.cables.length > 0) {
                            setCables(cacheData.cables);
                            setNodes(cacheData.nodes || []);

                            // Initialize Global from Cache if empty
                            if (!globalData) {
                                setCableTypes(cacheData.cableTypes || initialCableTypes);
                                setDeckHeights(cacheData.deckHeights || DEFAULT_DECK_CONFIG);
                                localStorage.setItem('SEASTAR_GLOBAL_SETTINGS', JSON.stringify({
                                    cableTypes: cacheData.cableTypes || initialCableTypes,
                                    deckHeights: cacheData.deckHeights || DEFAULT_DECK_CONFIG
                                }));
                            }

                            setDataSource('cache');
                            console.log(`✅ Loaded ${cacheData.cables.length} cables from JSON cache`);

                            // Save to Split Storage immediately
                            localStorage.setItem(shipCablesKey, JSON.stringify(cacheData.cables));
                            localStorage.setItem(shipNodesKey, JSON.stringify(cacheData.nodes || []));

                            setIsLoading(false);
                            return;
                        }
                    }
                } catch (cacheError) {
                    console.log(`⚠️ JSON cache not available: ${cacheError}`);
                }

                // PRIORITY 4: EXCEL (Legacy Load)
                // ... (Existing Excel Logic - reusing helper functions)
                const loadedNodes = await loadNodesFromExcel(shipId);
                const loadedCables = await loadCablesFromExcel(shipId);

                if (loadedNodes.length > 0 && loadedCables.length > 0) {
                    setNodes(loadedNodes);
                    console.log(`📊 Loaded ${loadedCables.length} cables from Excel`);
                    const routedCables = computeAllRoutes(loadedCables, loadedNodes);
                    setCables(routedCables);
                    setDataSource('excel');

                    // Save to Split Storage
                    localStorage.setItem(shipCablesKey, JSON.stringify(routedCables));
                    localStorage.setItem(shipNodesKey, JSON.stringify(loadedNodes));
                    if (!globalData) {
                        localStorage.setItem('SEASTAR_GLOBAL_SETTINGS', JSON.stringify({
                            cableTypes: initialCableTypes,
                            deckHeights: DEFAULT_DECK_CONFIG
                        }));
                    }
                } else {
                    // PRIORITY 5: MOCK (Only for dev/unknown ships)
                    const isProductionShip = AVAILABLE_SHIPS.some(s => s.id === shipId);
                    if (isProductionShip) {
                        console.log(`ℹ️ New/Empty Production Ship (${shipId}). Starting precise.`);
                        setCables([]);
                        setNodes([]);
                        setDataSource('localStorage'); // Treat as valid empty state
                    } else {
                        console.warn(`⚠️ Could not load data, using mock`);
                        setCables(initialCables);
                        setNodes(initialNodes);
                        setDataSource('mock');
                    }
                }

            } catch (error) {
                console.error("❌ Data Load Error:", error);
                setCables(initialCables);
                setNodes(initialNodes);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [shipId]);

    // ... (Helpers remain same) ...

    // Save Data - UPDATED for Split Storage
    const saveData = useCallback((newCables?: Cable[], newNodes?: Node[], newTypes?: GenericRow[], newDecks?: DeckConfig) => {
        // Use args or current state
        const c = newCables || cables;
        const n = newNodes || nodes;
        const t = newTypes || cableTypes;
        const d = newDecks || deckHeights;

        // Save Ship Specific
        localStorage.setItem(`SEASTAR_SHIP_${shipId}_CABLES`, JSON.stringify(c));
        localStorage.setItem(`SEASTAR_SHIP_${shipId}_NODES`, JSON.stringify(n));

        // Save Global
        // CHECK privilege here? Or assume UI handles it? 
        // For safety, we always save whatever is passed.
        localStorage.setItem('SEASTAR_GLOBAL_SETTINGS', JSON.stringify({
            cableTypes: t,
            deckHeights: d
        }));

        console.log(`💾 Project Saved (Split) for ${shipId}.`);
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

// Helper Functions for Excel Loading
const loadNodesFromExcel = async (shipId: string): Promise<Node[]> => {
    try {
        const response = await fetch(`./data/${shipId}/nodes.xlsx`);
        if (!response.ok) return [];
        const buffer = await response.arrayBuffer();
        const rawData = ExcelService.readArrayBuffer(buffer);
        return ExcelService.mapRawToNode(rawData);
    } catch (error) {
        console.warn(`Failed to load nodes for ${shipId}`, error);
        return [];
    }
};

const loadCablesFromExcel = async (shipId: string): Promise<Cable[]> => {
    try {
        const response = await fetch(`./data/${shipId}/cables.xlsx`);
        if (!response.ok) return [];
        const buffer = await response.arrayBuffer();
        const rawData = ExcelService.readArrayBuffer(buffer);
        return ExcelService.mapRawToCable(rawData);
    } catch (error) {
        console.warn(`Failed to load cables for ${shipId}`, error);
        return [];
    }
};

const computeAllRoutes = (cables: Cable[], nodes: Node[]): Cable[] => {
    // Simple pass-through if full routing service isn't instantiated
    // For initial load, we might rely on cached paths or simple straight lines.
    // If we want real routing, we need RoutingService.
    // Given the complexity, let's just return cables for now, or instantiate RoutingService.
    try {
        const router = new RoutingService(nodes);
        return cables.map(c => {
            if (c.calculatedPath) return c; // Already has path?
            const res = router.findRoute(c.fromNode, c.toNode, c.checkNode);
            return {
                ...c,
                calculatedPath: res.path,
                calculatedLength: res.distance || c.length,
                routeError: res.path.length === 0 ? 'No Path' : undefined
            };
        });
    } catch (e) {
        console.warn("Auto-routing failed during load", e);
        return cables;
    }
};
