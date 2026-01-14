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
    { id: "HK2401", name: "35K D/F PRODUCT/OM CARRIER" },
    { id: "S1001_35K_FD", name: "S1001 35K FEEDER" }
];

export const useProjectData = () => {
    // Core Data State
    const [shipId, setShipId] = useState<string>("HK2401");
    const [cables, setCables] = useState<Cable[]>([]);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [cableTypes, setCableTypes] = useState<GenericRow[]>(initialCableTypes);
    const [deckHeights, setDeckHeights] = useState<DeckConfig>(DEFAULT_DECK_CONFIG);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [dataSource, setDataSource] = useState<'cache' | 'excel' | 'localStorage' | 'mock'>('mock');

    // Manual Load Trigger
    const loadProjectData = async (targetShipId: string) => {
        setIsLoading(true);
        setShipId(targetShipId);

        try {
            console.log(`📊 Standardized Data Load Triggered for ${targetShipId}...`);

            // 1. Fetch unified JSON from public/data
            const response = await fetch(`/data/${targetShipId}.json`);
            if (!response.ok) {
                throw new Error(`Cloud data not found: ${targetShipId}`);
            }

            const projectData = await response.json();
            const newCables = projectData.cables || [];
            const newNodes = projectData.nodes || [];
            const newTypes = projectData.cableTypes || [];

            // 2. Calculate Diff for History
            import('../services/historyService').then(({ HistoryService }) => {
                const summary = HistoryService.summarizeDiff(cables, newCables, nodes, newNodes);
                HistoryService.record('Load', `Cloud Auto-Load: ${summary}`, targetShipId, newCables, newNodes, newTypes);
            });

            // 3. Set Core State
            setCables(newCables);
            setNodes(newNodes);
            if (projectData.cableTypes) setCableTypes(projectData.cableTypes);
            if (projectData.deckHeights) setDeckHeights(projectData.deckHeights);

            setDataSource('cache');
            console.log(`✅ Loaded Standardized Project: ${targetShipId} (${newCables.length} cables)`);

            // 4. Sync to LocalStorage for persistence
            localStorage.setItem(`SEASTAR_SHIP_${targetShipId}_CABLES`, JSON.stringify(newCables));
            localStorage.setItem(`SEASTAR_SHIP_${targetShipId}_NODES`, JSON.stringify(newNodes));

        } catch (error) {
            console.warn("❌ Standardized Load Failed, falling back to local buffer:", error);

            // Fallback: Try LocalStorage
            const storedCables = localStorage.getItem(`SEASTAR_SHIP_${targetShipId}_CABLES`);
            const storedNodes = localStorage.getItem(`SEASTAR_SHIP_${targetShipId}_NODES`);

            if (storedCables && storedNodes) {
                setCables(JSON.parse(storedCables));
                setNodes(JSON.parse(storedNodes));
                setDataSource('localStorage');
            } else {
                // Final Fallback: Mock
                setCables(initialCables);
                setNodes(initialNodes);
                setDataSource('mock');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Save Data - UPDATED for Split Storage
    const saveData = useCallback((newCables?: Cable[], newNodes?: Node[], newTypes?: GenericRow[], newDecks?: DeckConfig) => {
        const c = newCables || cables;
        const n = newNodes || nodes;
        const t = newTypes || cableTypes;
        const d = newDecks || deckHeights;

        localStorage.setItem(`SEASTAR_SHIP_${shipId}_CABLES`, JSON.stringify(c));
        localStorage.setItem(`SEASTAR_SHIP_${shipId}_NODES`, JSON.stringify(n));

        localStorage.setItem('SEASTAR_GLOBAL_SETTINGS', JSON.stringify({
            cableTypes: t,
            deckHeights: d
        }));

        console.log(`💾 Project Saved (Split) for ${shipId}.`);
    }, [cables, nodes, cableTypes, deckHeights, shipId]);

    // Export cache as JSON
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
    }, [cables, nodes, cableTypes, deckHeights, shipId]);

    return {
        shipId, setShipId,
        cables, setCables,
        nodes, setNodes,
        cableTypes, setCableTypes,
        deckHeights, setDeckHeights,
        isLoading, setIsLoading,
        saveData,
        loadProjectData,
        exportCacheAsJson,
        dataSource,
        availableShips: AVAILABLE_SHIPS
    };
};
