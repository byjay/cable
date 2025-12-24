import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronDown, Terminal, Activity, Wifi, Box, Monitor, Settings, Save, X, Upload, FileSpreadsheet, Loader2, User, Lock, Ship, Home
} from 'lucide-react';

import ThreeScene from './components/ThreeScene';
import CableList from './components/CableList';
import GenericGrid from './components/GenericGrid';
import CableTypeManager from './components/CableTypeManager';
import NodeManager from './components/NodeManager';
import CableRequirementReport from './components/CableRequirementReport';
import TrayAnalysis from './components/TrayAnalysis';
import Dashboard from './components/Dashboard';
import { initialCables, initialNodes, initialCableTypes } from './services/mockData';
import { RoutingService } from './services/routingService';
import { ExcelService } from './services/excelService';
import { Cable, Node, MainView, DeckConfig, GenericRow } from './types';

// Default Deck Heights
const DEFAULT_DECK_CONFIG: DeckConfig = {
    "TO": 4, // Top
    "SF": 3,
    "TW": 2,
    "PR": 1,
    "UP": 0  // Upper Deck
};

// Hardcoded Ship List
const AVAILABLE_SHIPS = [
    { id: "S1001_35K_FD", name: "S1001 - 35K Product Carrier" },
    { id: "S1002_LNG", name: "S1002 - 174K LNG Carrier" },
    { id: "H5500_CONT", name: "H5500 - 16K TEU Container" },
    { id: "K2024_FERRY", name: "K2024 - Passenger Ferry" }
];

// Menu Definition Structure
interface MenuItem {
    label: string;
    action: string;
    disabled?: boolean;
    restricted?: boolean;
}

interface MenuGroup {
    id: string;
    title: string;
    items: MenuItem[];
}

const MENU_STRUCTURE: MenuGroup[] = [
    {
        id: 'file', title: 'File', items: [
            { label: "Open Project", action: "Open Project" },
            { label: "Save Project", action: "Save Project", restricted: true },
            { label: "Export", action: "Export" },
            { label: "Exit", action: "Exit" }
        ]
    },
    {
        id: 'master', title: 'Master', items: [
            { label: "Master Data", action: "Master Data", disabled: true },
            { label: "DB Update", action: "DB Update", disabled: true },
            { label: "Test", action: "Test", disabled: true }
        ]
    },
    {
        id: 'cabletype', title: 'CableType', items: [
            { label: "Cable Type", action: "Cable Type" },
            { label: "Tray Spec", action: "Tray Spec", disabled: true },
            { label: "Cable Binding", action: "Cable Binding", disabled: true }
        ]
    },
    {
        id: 'user', title: 'User', items: [
            { label: "User Mgmt", action: "User Mgmt", disabled: true },
            { label: "Switch User Role", action: "Switch Role" },
            { label: "Log", action: "Log", disabled: true }
        ]
    },
    {
        id: 'ship', title: 'Ship', items: [
            { label: "Ship Select", action: "Ship Select", restricted: true },
            { label: "Ship Definition", action: "Ship Definition", disabled: true },
            { label: "Deck Code", action: "Deck Code" },
            { label: "Equip Code", action: "Equip Code", disabled: true }
        ]
    },
    {
        id: 'schedule', title: 'Schedule', items: [
            { label: "Schedule", action: "Schedule" },
            { label: "CableGroup", action: "CableGroup", disabled: true }
        ]
    },
    {
        id: 'report', title: 'Report', items: [
            { label: "Cable List", action: "Cable List" },
            { label: "Node List", action: "Node List" },
            { label: "Cable Requirement", action: "Cable Requirement" },
            { label: "Tray Analysis", action: "Tray Analysis" },
            { label: "Cable Drum Inquiry", action: "Cable Drum Inquiry" },
            { label: "Terminal Qty", action: "Terminal Qty", disabled: true }
        ]
    },
    {
        id: 'data', title: 'Data Transfer', items: [
            { label: "Import", action: "Import", disabled: true },
            { label: "Export", action: "Export" }
        ]
    },
    {
        id: 'option', title: 'Option', items: [
            { label: "Settings", action: "Settings", disabled: true },
            { label: "3D Config", action: "3D Config" }
        ]
    }
];

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<string>(MainView.DASHBOARD);

    // Data State
    const [cables, setCables] = useState<Cable[]>(initialCables);
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [cableTypes, setCableTypes] = useState<GenericRow[]>(initialCableTypes);
    const [deckHeights, setDeckHeights] = useState<DeckConfig>(DEFAULT_DECK_CONFIG);

    const [genericData, setGenericData] = useState<GenericRow[]>([]);
    const [genericTitle, setGenericTitle] = useState<string>('');

    const [routePath, setRoutePath] = useState<string[]>([]);
    const [routingService, setRoutingService] = useState<RoutingService | null>(null);

    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showDeckModal, setShowDeckModal] = useState(false);
    const [showShipModal, setShowShipModal] = useState(false);
    const [shipId, setShipId] = useState("S1001_35K_FD");
    const [isLoading, setIsLoading] = useState(false);

    const [userRole, setUserRole] = useState<'ADMIN' | 'GUEST'>('ADMIN');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadShipData(shipId);
    }, [shipId]);

    const loadShipData = async (id: string) => {
        setIsLoading(true);

        const savedData = localStorage.getItem(`SEASTAR_DATA_${id}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setCables(parsed.cables || []);
                setNodes(parsed.nodes || []);
                setCableTypes(parsed.cableTypes && parsed.cableTypes.length > 0 ? parsed.cableTypes : initialCableTypes);
                setDeckHeights(parsed.deckHeights || DEFAULT_DECK_CONFIG);
                setIsLoading(false);
                return;
            } catch (e) {
                console.error("Failed to load saved data", e);
            }
        }

        // Auto-load Excel files for S1001_35K_FD if no saved data
        if (id === "S1001_35K_FD") {
            try {
                console.log("🚀 Auto-loading 35K data from Excel files...");

                // Load Node file
                const nodeResponse = await fetch('/data/35k_node.xlsx');
                if (nodeResponse.ok) {
                    const nodeBlob = await nodeResponse.blob();
                    const nodeFile = new File([nodeBlob], '35k_node.xlsx');
                    const nodeRaw = await ExcelService.importFromExcel(nodeFile);
                    const mappedNodes = ExcelService.mapRawToNode(nodeRaw);
                    setNodes(mappedNodes);
                    console.log(`✅ Loaded ${mappedNodes.length} nodes with POINT coordinates`);
                }

                // Load Cable Schedule file
                const schResponse = await fetch('/data/35k_sch.xlsx');
                if (schResponse.ok) {
                    const schBlob = await schResponse.blob();
                    const schFile = new File([schBlob], '35k_sch.xlsx');
                    const schRaw = await ExcelService.importFromExcel(schFile);
                    const mappedCables = ExcelService.mapRawToCable(schRaw);
                    setCables(mappedCables);
                    console.log(`✅ Loaded ${mappedCables.length} cables`);
                }

                setCableTypes(initialCableTypes);
                setDeckHeights(DEFAULT_DECK_CONFIG);

            } catch (e) {
                console.error("Auto-load failed, using mock data:", e);
                setCables(initialCables);
                setNodes(initialNodes);
                setCableTypes(initialCableTypes);
            }
        } else {
            setCables([]);
            setNodes([]);
            setCableTypes(initialCableTypes);
        }

        setDeckHeights(DEFAULT_DECK_CONFIG);
        setIsLoading(false);
    };

    const saveShipData = () => {
        if (userRole !== 'ADMIN') {
            alert("Access Denied: You do not have permission to save data.");
            return;
        }
        const dataToSave = { cables, nodes, cableTypes, deckHeights };
        localStorage.setItem(`SEASTAR_DATA_${shipId}`, JSON.stringify(dataToSave));
        alert(`Project saved for Ship ${shipId} successfully.`);
    };

    useEffect(() => {
        const svc = new RoutingService(nodes);
        setRoutingService(svc);
    }, [nodes]);

    const handleUpdateNodes = (updatedNodes: Node[]) => {
        setNodes(updatedNodes);
        // Auto-save logic could go here, but usually explicitly saved via "Save Project"
    };

    const handleCalculateRoute = (cable: Cable) => {
        if (!routingService) {
            alert("Routing Engine not ready. Please load Node data.");
            return;
        }

        // Auto-calculate logic here if needed
        const result = routingService.findRoute(cable.fromNode, cable.toNode, cable.checkNode);

        if (result.path.length > 0) {
            setRoutePath(result.path);
            const updatedCables = cables.map(c =>
                c.id === cable.id
                    ? {
                        ...c,
                        calculatedPath: result.path,
                        calculatedLength: result.distance,
                        path: result.path.join(',') // UPDATE CABLE_PATH TEXT
                    }
                    : c
            );
            setCables(updatedCables);
        } else {
            alert(`Routing failed: ${result.error || 'No connection found between nodes.'}`);
        }
    };

    const handleCalculateAllRoutes = () => {
        if (!routingService) {
            alert("Routing Engine not ready.");
            return;
        }
        setIsLoading(true);

        setTimeout(() => {
            let calculatedCount = 0;
            const updatedCables = cables.map(cable => {
                // Only calculate if nodes exist and path is empty or forced update
                if (cable.fromNode && cable.toNode) {
                    const result = routingService!.findRoute(cable.fromNode, cable.toNode, cable.checkNode);
                    if (result.path.length > 0) {
                        calculatedCount++;
                        // Add FROM_REST + TO_REST to total length
                        const fromRest = parseFloat(String(cable.fromRest || 0)) || 0;
                        const toRest = parseFloat(String(cable.toRest || 0)) || 0;
                        const totalLength = result.distance + fromRest + toRest;
                        return {
                            ...cable,
                            calculatedPath: result.path,
                            calculatedLength: totalLength,
                            length: totalLength, // Also update the length field
                            path: result.path.join(',') // Populate the CABLE_PATH column
                        };
                    }
                }
                return cable;
            });

            setCables(updatedCables);
            // Auto-save after Route All
            const dataToSave = { cables: updatedCables, nodes, cableTypes, deckHeights };
            localStorage.setItem(`SEASTAR_DATA_${shipId}`, JSON.stringify(dataToSave));
            setIsLoading(false);
            alert(`Route Generation Complete. ${calculatedCount} routes updated. (Auto-saved)`);
        }, 100);
    };

    // Handle routing for selected cables only
    const handleCalculateSelected = (selectedCables: Cable[]) => {
        if (!routingService) {
            alert("Routing Engine not ready.");
            return;
        }
        if (selectedCables.length === 0) {
            alert("No cables selected.");
            return;
        }
        setIsLoading(true);

        setTimeout(() => {
            let calculatedCount = 0;
            const selectedIds = new Set(selectedCables.map(c => c.id));

            const updatedCables = cables.map(cable => {
                if (selectedIds.has(cable.id) && cable.fromNode && cable.toNode) {
                    const result = routingService!.findRoute(cable.fromNode, cable.toNode, cable.checkNode);
                    if (result.path.length > 0) {
                        calculatedCount++;
                        // Add FROM_REST + TO_REST to total length
                        const fromRest = parseFloat(String(cable.fromRest || 0)) || 0;
                        const toRest = parseFloat(String(cable.toRest || 0)) || 0;
                        const totalLength = result.distance + fromRest + toRest;
                        return {
                            ...cable,
                            calculatedPath: result.path,
                            calculatedLength: totalLength,
                            length: totalLength, // Also update the length field
                            path: result.path.join(',')
                        };
                    }
                }
                return cable;
            });

            setCables(updatedCables);
            setIsLoading(false);
            alert(`Selected Route Generation Complete. ${calculatedCount} of ${selectedCables.length} routes updated.`);
        }, 100);
    };

    const handleView3D = (cable: Cable) => {
        if (!cable.calculatedPath && cable.path) {
            // If we have text path but no 3D path array, try to split text
            const derivedPath = cable.path.split(',').map(s => s.trim());
            setRoutePath(derivedPath);
        } else if (cable.calculatedPath) {
            setRoutePath(cable.calculatedPath);
        } else {
            // Try to calc on fly
            if (routingService) {
                const res = routingService.findRoute(cable.fromNode, cable.toNode, cable.checkNode);
                setRoutePath(res.path);
            }
        }
        setCurrentView(MainView.THREE_D);
    };

    const updateDeckHeight = (deck: string, val: string) => {
        setDeckHeights(prev => ({
            ...prev,
            [deck]: parseFloat(val) || 0
        }));
    };

    const triggerFileUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setTimeout(async () => {
            try {
                const rawData = await ExcelService.importFromExcel(file);
                const headers = Object.keys(rawData[0] || {});
                const fileType = ExcelService.detectFileType(headers);

                if (fileType === 'CABLE') {
                    const newCables = ExcelService.mapRawToCable(rawData);

                    // Change Detection: Compare with existing cables
                    const oldCableMap = new Map<string, Cable>(cables.map(c => [c.name, c]));
                    let resetCount = 0;
                    let preservedCount = 0;

                    const mergedCables = newCables.map(newCable => {
                        const oldCable = oldCableMap.get(newCable.name);
                        if (oldCable) {
                            // Check if routing-related fields changed
                            const nodeChanged =
                                oldCable.fromNode !== newCable.fromNode ||
                                oldCable.toNode !== newCable.toNode ||
                                oldCable.checkNode !== newCable.checkNode;

                            if (nodeChanged) {
                                // Reset route/length data for changed cables
                                resetCount++;
                                return {
                                    ...newCable,
                                    calculatedPath: undefined,
                                    calculatedLength: undefined,
                                    length: 0,
                                    path: ''
                                };
                            }
                            // Preserve existing route data for unchanged cables
                            preservedCount++;
                            return {
                                ...newCable,
                                calculatedPath: oldCable.calculatedPath,
                                calculatedLength: oldCable.calculatedLength,
                                length: oldCable.length || newCable.length,
                                path: oldCable.path || newCable.path
                            };
                        }
                        return newCable; // New cable, no previous data
                    });

                    setCables(mergedCables);
                    // PERSIST TO SHIP DATA
                    const dataToSave = { cables: mergedCables, nodes, cableTypes, deckHeights };
                    localStorage.setItem(`SEASTAR_DATA_${shipId}`, JSON.stringify(dataToSave));
                    setCurrentView(MainView.SCHEDULE);

                    // Show detailed import message
                    let msg = `Imported ${mergedCables.length} Cables.`;
                    if (resetCount > 0) {
                        msg += `\n⚠️ ${resetCount} cable(s) had node changes - route data RESET!`;
                    }
                    if (preservedCount > 0) {
                        msg += `\n✅ ${preservedCount} cable(s) route data preserved.`;
                    }
                    // Check for missing lengths
                    const missingLength = mergedCables.filter(c => !c.length || c.length === 0).length;
                    if (missingLength > 0) {
                        msg += `\n⚠️ ${missingLength} cable(s) have NO length calculated!`;
                    }
                    alert(msg);
                } else if (fileType === 'NODE') {
                    const mappedNodes = ExcelService.mapRawToNode(rawData);
                    setNodes(mappedNodes);
                    // PERSIST TO SHIP DATA
                    const dataToSave = { cables, nodes: mappedNodes, cableTypes, deckHeights };
                    localStorage.setItem(`SEASTAR_DATA_${shipId}`, JSON.stringify(dataToSave));
                    setCurrentView(MainView.REPORT_NODE);
                    alert(`Imported ${mappedNodes.length} Nodes successfully. Graph Updated and saved to Ship DB.`);
                } else if (fileType === 'TYPE') {
                    setCableTypes(rawData as GenericRow[]);
                    // PERSIST TO SHIP DATA
                    const dataToSave = { cables, nodes, cableTypes: rawData, deckHeights };
                    localStorage.setItem(`SEASTAR_DATA_${shipId}`, JSON.stringify(dataToSave));
                    setCurrentView(MainView.CABLE_TYPE);
                    alert(`Imported ${rawData.length} Cable Types and saved.`);
                } else {
                    setGenericData(rawData as GenericRow[]);
                    setGenericTitle(`Data: ${file.name}`);
                    setCurrentView(MainView.GENERIC_GRID);
                    alert(`Imported ${rawData.length} records as Generic Data.`);
                }
            } catch (error) {
                console.error(error);
                alert("Failed to import Excel file. Please check the file format.");
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }, 500);
    };

    const handleExport = () => {
        setIsLoading(true);
        setTimeout(() => {
            try {
                let dataToExport: any[] = [];
                let fileName = `${shipId}_Export`;

                switch (currentView) {
                    case MainView.SCHEDULE:
                        dataToExport = cables;
                        fileName += "_Schedule";
                        break;
                    case MainView.CABLE_TYPE:
                        dataToExport = cableTypes;
                        fileName += "_CableTypes";
                        break;
                    case MainView.GENERIC_GRID:
                        dataToExport = genericData;
                        fileName += `_${genericTitle.replace(/\s/g, '')}`;
                        break;
                    case MainView.REPORT_NODE:
                        dataToExport = nodes;
                        fileName += "_Nodes";
                        break;
                    // For report views like BOM, we need to construct the export data
                    case MainView.REPORT_BOM:
                        // Simple export of current cable list, user can do pivot in Excel
                        // Ideally we reconstruct the aggregation here, but simply exporting the raw data 
                        // is often enough or we can export a processed list.
                        // Let's export the raw cables for now as it contains the source data
                        dataToExport = cables;
                        fileName += "_RequirementCalculation";
                        break;
                    default:
                        dataToExport = cables;
                        fileName += "_Data";
                }

                if (dataToExport.length === 0) {
                    alert("No data to export in current view.");
                    return;
                }

                ExcelService.exportToExcel(dataToExport, fileName);
            } catch (e) {
                console.error(e);
                alert("Export Failed");
            } finally {
                setIsLoading(false);
            }
        }, 500);
    };

    const handleMenuAction = (action: string) => {
        setActiveMenu(null);
        switch (action) {
            case "Open Project": triggerFileUpload(); break;
            case "Save Project": saveShipData(); break;
            case "Export": handleExport(); break;
            case "Exit": if (confirm("Reload Application?")) window.location.reload(); break;
            case "Switch Role":
                const newRole = userRole === 'ADMIN' ? 'GUEST' : 'ADMIN';
                setUserRole(newRole);
                alert(`Switched to ${newRole} role.`);
                break;
            case "Cable Type": setCurrentView(MainView.CABLE_TYPE); break;
            case "Ship Select":
                if (userRole === 'ADMIN') setShowShipModal(true);
                else alert("Access Denied.");
                break;
            case "Deck Code": setShowDeckModal(true); break;
            case "Schedule": setCurrentView(MainView.SCHEDULE); break;
            case "Node List": setCurrentView(MainView.REPORT_NODE); break;
            case "Cable Requirement": setCurrentView(MainView.REPORT_BOM); break;
            case "Tray Analysis": setCurrentView(MainView.TRAY_ANALYSIS); break;
            case "Cable Drum Inquiry":
                const drums = cables.reduce((acc, curr) => {
                    const key = `${curr.type}-DRUM-AUTO`;
                    if (!acc[key]) acc[key] = { DrumNo: key, CableType: curr.type, TotalLen: 0, Count: 0 };
                    acc[key].TotalLen += curr.length;
                    acc[key].Count += 1;
                    return acc;
                }, {} as any);
                setGenericTitle("Cable Drum Schedule");
                setGenericData(Object.values(drums));
                setCurrentView(MainView.GENERIC_GRID);
                break;
            case "Cable List": setCurrentView(MainView.SCHEDULE); break;
            case "3D Config": setCurrentView(MainView.THREE_D); break;
            default: console.log("Action not implemented:", action);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClick = () => setActiveMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const MenuDropdown: React.FC<{ group: MenuGroup }> = ({ group }) => (
        <div className="relative" onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === group.id ? null : group.id); }}>
            <button className={`px-3 py-1 text-sm hover:bg-seastar-700 rounded flex items-center gap-1 ${activeMenu === group.id ? 'bg-seastar-700 text-white' : 'text-gray-300'}`}>
                {group.title} <ChevronDown size={10} />
            </button>
            {activeMenu === group.id && (
                <div className="absolute top-full left-0 w-56 bg-seastar-800 border border-seastar-600 shadow-xl rounded-b-lg z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                    {group.items.map((item, idx) => (
                        !item.restricted || userRole === 'ADMIN' ? (
                            <div
                                key={idx}
                                className={`px-4 py-2 text-xs border-b border-seastar-700/50 last:border-0 
                                ${item.disabled
                                        ? 'text-gray-600 cursor-not-allowed'
                                        : 'text-gray-300 hover:bg-seastar-cyan hover:text-seastar-900 cursor-pointer'
                                    }`}
                                onClick={(e) => {
                                    if (!item.disabled) handleMenuAction(item.action);
                                    e.stopPropagation();
                                }}
                            >
                                {item.label}
                                {item.restricted && <Lock size={10} className="inline ml-2 text-yellow-500" />}
                            </div>
                        ) : null
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-seastar-900 text-gray-100 overflow-hidden font-sans">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls, .csv" className="hidden" />

            {/* TOP MENU BAR */}
            <div className="h-10 bg-seastar-900 border-b border-seastar-700 flex items-center px-4 select-none shadow-md z-50">
                <div className="font-bold text-seastar-cyan mr-6 flex items-center gap-2 text-sm tracking-wider cursor-pointer" onClick={() => setCurrentView(MainView.DASHBOARD)}>
                    <Activity size={16} /> SEASTAR V5
                </div>

                <div className="flex items-center gap-1">
                    <button
                        className={`px-3 py-1 text-sm hover:bg-seastar-700 rounded flex items-center gap-1 ${currentView === MainView.DASHBOARD ? 'bg-seastar-700 text-seastar-neon font-bold' : 'text-gray-300'}`}
                        onClick={() => setCurrentView(MainView.DASHBOARD)}
                    >
                        <Home size={12} /> Dashboard
                    </button>

                    <div className="h-4 w-px bg-seastar-700 mx-1"></div>

                    {MENU_STRUCTURE.map(group => <MenuDropdown key={group.id} group={group} />)}

                    <div className="h-4 w-px bg-seastar-700 mx-2"></div>
                    <button onClick={triggerFileUpload} className="p-1 hover:text-seastar-neon" title="Open Excel"><Upload size={16} /></button>
                    <button onClick={handleExport} className="p-1 hover:text-seastar-neon" title="Export Excel"><FileSpreadsheet size={16} /></button>

                    <button
                        className={`ml-4 px-3 py-1 text-xs font-bold rounded border ${currentView === MainView.THREE_D ? 'bg-seastar-pink text-seastar-900 border-seastar-pink' : 'border-seastar-700 text-seastar-pink hover:bg-seastar-800'}`}
                        onClick={() => setCurrentView(currentView === MainView.THREE_D ? MainView.SCHEDULE : MainView.THREE_D)}
                    >
                        {currentView === MainView.THREE_D ? "BACK TO GRID" : "3D VIEW"}
                    </button>
                </div>
            </div>

            {/* MAIN WORKSPACE */}
            <main className="flex-1 flex flex-col overflow-hidden bg-seastar-900 relative">
                <div className="flex-1 p-2 overflow-hidden flex flex-col">
                    {currentView === MainView.DASHBOARD && (
                        <Dashboard cables={cables} nodes={nodes} />
                    )}

                    {currentView === MainView.SCHEDULE && (
                        <CableList
                            cables={cables}
                            isLoading={isLoading}
                            onSelectCable={() => { }}
                            onCalculateRoute={handleCalculateRoute}
                            onCalculateAll={handleCalculateAllRoutes}
                            onCalculateSelected={handleCalculateSelected}
                            onView3D={handleView3D}
                            triggerImport={triggerFileUpload}
                            onExport={handleExport}
                        />
                    )}

                    {currentView === MainView.CABLE_TYPE && (
                        <CableTypeManager data={cableTypes} />
                    )}

                    {currentView === MainView.REPORT_NODE && (
                        <NodeManager nodes={nodes} onUpdateNodes={handleUpdateNodes} triggerImport={triggerFileUpload} onExport={handleExport} />
                    )}

                    {currentView === MainView.REPORT_BOM && (
                        <CableRequirementReport cables={cables} />
                    )}

                    {currentView === MainView.TRAY_ANALYSIS && (
                        <TrayAnalysis cables={cables} nodes={nodes} />
                    )}

                    {currentView === MainView.GENERIC_GRID && (
                        <GenericGrid title={genericTitle} data={genericData} />
                    )}

                    {currentView === MainView.THREE_D && (
                        <div className="flex-1 border border-seastar-700 rounded-lg overflow-hidden relative shadow-2xl">
                            <ThreeScene nodes={nodes} highlightPath={routePath} deckHeights={deckHeights} />
                        </div>
                    )}
                </div>
            </main>

            {/* STATUS BAR */}
            <div className="h-6 bg-seastar-800 border-t border-seastar-700 flex items-center px-4 text-[10px] text-gray-400 select-none justify-between">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1 text-seastar-cyan font-bold">
                        <Terminal size={10} /> Developer: designsir@seastargo.com
                    </span>
                    <span className="flex items-center gap-1 cursor-pointer hover:text-white">
                        <User size={10} /> User: <span className={userRole === 'ADMIN' ? 'text-yellow-400 font-bold' : 'text-gray-400'}>{userRole === 'ADMIN' ? 'kbj (Admin)' : 'Guest'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Ship size={10} /> Ship: <span className="text-yellow-400 font-mono">{shipId}</span>
                    </span>
                    <span>Cables: <span className="text-white">{cables.length}</span></span>
                </div>
                <div className="flex items-center gap-4">
                    {isLoading && (
                        <span className="flex items-center gap-1 text-yellow-400 animate-pulse font-bold">
                            <Loader2 size={10} className="animate-spin" /> PROCESSING...
                        </span>
                    )}
                </div>
            </div>

            {/* SHIP SELECTION MODAL */}
            {showShipModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-seastar-800 border border-seastar-600 rounded-lg shadow-2xl w-[500px] p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4 border-b border-seastar-700 pb-2">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Ship size={18} className="text-seastar-neon" /> Select Vessel
                            </h3>
                            <button onClick={() => setShowShipModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="grid gap-2 mb-6">
                            {AVAILABLE_SHIPS.map(ship => (
                                <button
                                    key={ship.id}
                                    className={`flex items-center justify-between p-4 rounded border text-left transition-all
                                ${shipId === ship.id
                                            ? 'bg-seastar-700 border-seastar-neon shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                                            : 'bg-seastar-900 border-seastar-700 hover:bg-seastar-700/50 hover:border-gray-500'}`}
                                    onClick={() => {
                                        setShipId(ship.id);
                                        setShowShipModal(false);
                                    }}
                                >
                                    <div>
                                        <div className={`font-bold ${shipId === ship.id ? 'text-seastar-neon' : 'text-white'}`}>{ship.id}</div>
                                        <div className="text-xs text-gray-400">{ship.name}</div>
                                    </div>
                                    {shipId === ship.id && <div className="text-seastar-neon text-xs font-bold">ACTIVE</div>}
                                </button>
                            ))}
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                            Switching ships will load the corresponding dataset from the database.
                        </div>
                    </div>
                </div>
            )}

            {/* DECK MODAL */}
            {showDeckModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-seastar-800 border border-seastar-600 rounded-lg shadow-2xl w-96 p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4 border-b border-seastar-700 pb-2">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Settings size={18} className="text-seastar-pink" /> Deck Configuration
                            </h3>
                            <button onClick={() => setShowDeckModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
                            {Object.keys(deckHeights).map(deck => (
                                <div key={deck} className="flex items-center justify-between bg-seastar-900 p-2 rounded border border-seastar-700">
                                    <span className="font-mono text-seastar-cyan font-bold w-12">{deck}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Level:</span>
                                        <input type="number" step="0.5" className="w-20 bg-seastar-800 border border-seastar-600 rounded px-2 py-1 text-sm text-right focus:border-seastar-neon outline-none" value={deckHeights[deck]} onChange={(e) => updateDeckHeight(deck, e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowDeckModal(false)} className="px-4 py-2 bg-seastar-cyan hover:bg-cyan-400 text-seastar-900 font-bold rounded text-sm shadow-lg shadow-cyan-900/50">Apply</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;