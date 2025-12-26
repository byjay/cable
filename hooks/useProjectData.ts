import { useState, useEffect, useCallback } from 'react';
import { Cable, Node, GenericRow, DeckConfig, CableType } from '../types';
import { initialCables, initialNodes, initialCableTypes } from '../services/mockData';
import { ExcelService } from '../services/excelService';

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
    const [cables, setCables] = useState<Cable[]>(initialCables);
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [cableTypes, setCableTypes] = useState<GenericRow[]>(initialCableTypes);
    const [deckHeights, setDeckHeights] = useState<DeckConfig>(DEFAULT_DECK_CONFIG);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Load Data based on Ship ID or LocalStorage
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // 1. Try LocalStorage
                const savedData = localStorage.getItem(`SEASTAR_DATA_${shipId}`);
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    setCables(parsed.cables || []);
                    setNodes(parsed.nodes || []);
                    setCableTypes(parsed.cableTypes || initialCableTypes);
                    setDeckHeights(parsed.deckHeights || DEFAULT_DECK_CONFIG);
                    console.log(`Loaded saved data for ${shipId}`);
                } else {
                    // 2. Load Default Excel Data
                    console.log(`Loading default data for ${shipId}...`);
                    await loadDefaultData(shipId);
                }
            } catch (error) {
                console.error("Data Load Error:", error);
                alert("Failed to load project data. See console.");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [shipId]);

    const loadDefaultData = async (id: string) => {
        try {
            // Load Nodes
            let nodeResponse = await fetch(`/data/${id}/nodes.xlsx`);
            if (!nodeResponse.ok) nodeResponse = await fetch(`data/${id}/nodes.xlsx`);
            if (nodeResponse.ok) {
                const blob = await nodeResponse.blob();
                const raw = await ExcelService.importFromExcel(new File([blob], 'nodes.xlsx'));
                setNodes(ExcelService.mapRawToNode(raw));
            }

            // Load Cables
            let schResponse = await fetch(`/data/${id}/cables.xlsx`);
            if (!schResponse.ok) schResponse = await fetch(`data/${id}/cables.xlsx`);
            if (schResponse.ok) {
                const blob = await schResponse.blob();
                const raw = await ExcelService.importFromExcel(new File([blob], 'cables.xlsx'));
                setCables(ExcelService.mapRawToCable(raw));
            }
        } catch (e) {
            console.error("Default Load Failed:", e);
            // Non-fatal if we just want empty state, but for a "Manager" we often want explicit failure
            if (id === "S1001_35K_FD") alert("Failed to load default S1001 data.");
        }
    };

    // Save Data
    const saveData = useCallback(() => {
        const data = { cables, nodes, cableTypes, deckHeights };
        localStorage.setItem(`SEASTAR_DATA_${shipId}`, JSON.stringify(data));
        console.log("Project Saved.");
    }, [cables, nodes, cableTypes, deckHeights, shipId]);

    return {
        shipId, setShipId,
        cables, setCables,
        nodes, setNodes,
        cableTypes, setCableTypes,
        deckHeights, setDeckHeights,
        isLoading, setIsLoading,
        saveData,
        availableShips: AVAILABLE_SHIPS
    };
};
