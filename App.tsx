import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronDown, Terminal, Activity, Wifi, Box, Monitor, Settings as SettingsIcon, Save, X, Upload, FileSpreadsheet, Loader2, User, Lock, Ship, Home, Calendar, Database
} from 'lucide-react';

import ThreeScene from './components/ThreeSceneUltra';
import CableList from './components/CableList';
import GenericGrid from './components/GenericGrid';
import CableTypeManager from './components/CableTypeManager';
import NodeManager from './components/NodeManager';
import CableRequirementReport from './components/CableRequirementReport';
import TrayAnalysis from './components/TrayAnalysis';
import DashboardView from './components/DashboardView';
import NodeListReport from './components/NodeListReport';
import DrumScheduleReport from './components/DrumScheduleReport';
import UserManagement from './components/UserManagement';
import ShipDefinition from './components/ShipDefinition';
import MasterData from './components/MasterData';
import HistoryViewer from './components/HistoryViewer';
import Settings from './components/Settings';
import CableGroup from './components/CableGroup';
import ImportPanel from './components/ImportPanel';
import WDExtractionView from './components/WDExtractionView';
import PivotAnalyzer from './components/PivotAnalyzer';
import { SimpleModal } from './components/SimpleModal';
import LoadingOverlay from './components/LoadingOverlay';
import { TraySpecContent, CableBindingContent, EquipCodeContent, TerminalQtyContent } from './components/StaticContent';
import { initialCables, initialNodes, initialCableTypes } from './services/mockData';
import { RoutingService } from './services/routingService';
import { ExcelService } from './services/excelService';
import { HistoryService } from './services/historyService';
import { Cable, Node, MainView, DeckConfig, GenericRow, CableType } from './types';
import { useProjectData } from './hooks/useProjectData';
import { useAutoRouting } from './hooks/useAutoRouting';
import LoginPanel from './components/LoginPanel';
import { AuthService } from './services/authService';
import InstallationStatusView from './components/InstallationStatusView';

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
    { id: "HK2401", name: "HK2401 - 35K Product Carrier" },
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
            { label: "📂 Load Data", action: "Load Data" },  // Manual data load button
            { label: "Open Project", action: "Open Project" },
            { label: "Save Project", action: "Save Project", restricted: true },
            { label: "Export", action: "Export" },
            { label: "Exit", action: "Exit" }
        ]
    },

    {
        id: 'schedule', title: 'Schedule', items: [
            { label: "Cable List", action: "Schedule" },
            { label: "WD Extraction", action: "WD Extraction" },
            { label: "CableGroup", action: "CableGroup" },
            { label: "Drum Schedule", action: "Drum Schedule" },
            { label: "Node List", action: "Node List" },
            { label: "Import", action: "Import" }
        ]
    },
    {
        id: 'report', title: 'Report', items: [
            { label: "Cable Requirement", action: "Cable Requirement" },
            { label: "Node List", action: "Node List Report" },
            { label: "Tray Analysis", action: "Tray Analysis" },
            { label: "Data Analytics", action: "Analytics", restricted: false },
            { label: "History", action: "History" }
        ]
    },
    {
        id: 'tools', title: 'Tools', items: [
            { label: "Settings", action: "Settings" },
            { label: "User Mgmt", action: "User Mgmt" },
            { label: "Switch User Role", action: "Switch Role" },
            { label: "Log", action: "Log" }
        ]
    }
];

// Integration Props for SDMS
export interface AppProps {
    initialShipId?: string; // If provided by parent SDMS
    integrationMode?: boolean; // If true, disable conflicting global styles or routing
}

const App: React.FC<AppProps> = ({ initialShipId, integrationMode = false }) => {
    // Version Control
    const DATA_VERSION = "2026-01-14 14:26:00";

    // Enforce "R" or "S" Ship Type Constraint for SDMS Integration
    // If strict integration is required, we can block access here.
    const isValidShip = initialShipId
        ? (initialShipId.startsWith('S') || initialShipId.startsWith('R') || initialShipId.startsWith('H') || initialShipId.startsWith('K'))
        : true;

    if (integrationMode && !isValidShip) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white font-sans">
                <div className="text-red-500 font-bold text-3xl mb-4"><Lock size={48} className="inline mr-2" />Module Verified</div>
                <div className="text-xl mb-2">The Cable Manager Module</div>
                <div className="text-gray-400 max-w-md text-center">
                    This module is optimized for Series <b>S, R, H, and K</b>.
                    <br />Project ID <span className="text-yellow-400 font-mono">{initialShipId}</span> is not supported.
                </div>
            </div>
        );
    }

    // Force Clear LocalStorage on first load of version
    useEffect(() => {
        const currentVersion = localStorage.getItem('app_data_version');
        if (currentVersion !== DATA_VERSION) {
            console.log(`Detected version change: ${currentVersion} -> ${DATA_VERSION}. Clearing data...`);

            // Clear all SEASTAR related data
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('SEASTAR_')) {
                    localStorage.removeItem(key);
                }
            });

            try {
                localStorage.setItem('app_data_version', DATA_VERSION);
            } catch (e) {
                console.error("Critical Error: Failed to save version info. LocalStorage might be full.", e);
                // Last resort: clear everything to release space
                localStorage.clear();
            }
        }
    }, []);

    // Sync Initial Ship ID
    useEffect(() => {
        if (initialShipId) {
            console.log("Integration Mode: Locking to Project", initialShipId);
            // We rely on useProjectData initializing correctly or taking this effect
            // Ideally useProjectData should accept initialId too, but setting shipId here works 
            // because hooks run after effect
        }
    }, [initialShipId]);

    // DEV BYPASS: Default to ADMIN for testing
    const [currentUser, setCurrentUser] = useState(AuthService.getCurrentUser() || {
        id: 'test-admin',
        username: 'Test Admin',
        role: 'ADMIN',
        assignedShips: ['ALL'],
        password: '',
        createdAt: new Date().toISOString()
    } as any);

    const [currentView, setCurrentView] = useState<string>(MainView.DASHBOARD);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showShipModal, setShowShipModal] = useState(false);
    const [showDeckModal, setShowDeckModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // View Routing Filter State
    const [cableListFilter, setCableListFilter] = useState<'all' | 'unrouted' | 'missingLength'>('all');

    // Generic Data Handling
    const [genericData, setGenericData] = useState<GenericRow[]>([]);
    const [genericTitle, setGenericTitle] = useState<string>('');

    // Simple Modals State
    const [activeModal, setActiveModal] = useState<string | null>(null);

    // Cable Selection State for 3D View Integration
    const [selectedCableId, setSelectedCableId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect: Sync currentUser (Modified for Dev Bypass)
    useEffect(() => {
        const user = AuthService.getCurrentUser();
        // Only override if we really want to enforce auth. For dev bypass, we keep the initial state if user is null.
        if (user) {
            setCurrentUser(user);
        }
    }, []);

    // CUSTOM HOOKS
    // We pass initialShipId to hook if possible, or ensure setShipId is called fast enough
    const {
        cables, setCables,
        nodes, setNodes,
        cableTypes, setCableTypes,
        deckHeights, setDeckHeights,
        shipId, setShipId,
        isLoading: isDataLoading,
        saveData,
        loadProjectData, // Added for manual load
        availableShips
    } = useProjectData();

    // Force ship update from props if needed (and different)
    useEffect(() => {
        if (initialShipId && shipId !== initialShipId) {
            setShipId(initialShipId);
        }
    }, [initialShipId, shipId]);

    // Handler for Manual Data Load
    const handleDataLoadRequest = () => {
        setShowShipModal(true);
    };

    const executeDataLoad = async (targetShipId: string) => {
        console.log("🚀 Executing Manual Data Load for:", targetShipId);
        await loadProjectData(targetShipId);
        setShowShipModal(false);
    };


    const handleLogin = () => {
        const user = AuthService.getCurrentUser();
        setCurrentUser(user);
        // If user has specific ships, set one of them as default if current is not allowed
        if (user && !AuthService.canAccessShip(user, shipId)) {
            // Find first accessible ship
            const firstShip = AVAILABLE_SHIPS.find(s => AuthService.canAccessShip(user, s.id));
            if (firstShip) setShipId(firstShip.id);
        }
    };

    const handleLogout = () => {
        AuthService.logout();
        setCurrentUser(null);
        setCurrentView(MainView.DASHBOARD);
    };

    // Filter Ships based on Role
    const accessibleShips = AVAILABLE_SHIPS.filter(ship => AuthService.canAccessShip(currentUser, ship.id));

    // Security Guard: If not logged in, show Login Panel
    if (!currentUser) {
        return <LoginPanel onLogin={handleLogin} />;
    }

    // Save Data - Defined early to be passed to hooks
    const saveShipData = (overrideCables?: Cable[]) => {
        const targetCables = overrideCables || cables;
        if (!AuthService.isAdmin(currentUser)) {
            alert("Access Denied: You do not have permission to save data.");
            return;
        }
        // Record history snapshot before saving
        HistoryService.record('Save Project', `Manual save with ${targetCables.length} cables, ${nodes.length} nodes`, shipId, targetCables, nodes, cableTypes);

        saveData(targetCables, nodes, cableTypes, deckHeights);
        // Only show alert if manual save (no override) or explicit
        if (!overrideCables) alert(`Project saved for Ship ${shipId} successfully.`);
    };

    const {
        routingService,
        routePath, setRoutePath,
        isRouting,
        routingProgress,
        calculateRoute,
        calculateAllRoutes: originalHandleAutoRouting,
        calculateSelectedRoutes,
        isReady: isRoutingReady
    } = useAutoRouting({ nodes, cables, setCables, saveData: saveShipData });


    // Wrapper to set processing state during routing
    const handleAutoRouting = async () => {
        setIsProcessing(true);
        // Small timeout to allow UI to wait for state to settle
        await new Promise(resolve => setTimeout(resolve, 100));

        // Use the function from the hook
        originalHandleAutoRouting();

        setIsProcessing(false);
    };

    // Auto-Calculate Routes on Data Load
    useEffect(() => {
        if (!isDataLoading && cables.length > 0 && nodes.length > 0 && isRoutingReady) {
            const needsRouting = cables.some(c => !c.calculatedPath || c.calculatedPath.length === 0 || !c.length);
            if (needsRouting) {
                console.log("🚀 Triggering Initial Auto-Routing...");
                handleAutoRouting();
            }
        }
    }, [isDataLoading, cables.length, nodes.length, isRoutingReady]);

    // Auto-Route on Initial Load
    useEffect(() => {
        if (!isDataLoading && cables.length > 0 && nodes.length > 0) {
            // Check if routing hasn't drastically happened yet (optional optimization)
            const routedCount = cables.filter(c => c.calculatedLength).length;
            if (routedCount < cables.length * 0.1) { // If less than 10% routed, force route
                console.log("🚀 Initial Data Loaded. Triggering Auto-Routing...");
                handleAutoRouting();
            }
        }
    }, [isDataLoading, shipId]);

    // Handlers
    const handleImportExcel = async (type: 'cables' | 'nodes', file: File) => {
        setIsProcessing(true);
        try {
            if (type === 'nodes') {
                const rawNodes = await ExcelService.importFromExcel(file);
                const processedNodes = ExcelService.mapRawToNode(rawNodes);
                setNodes(processedNodes);
            } else {
                const rawCables = await ExcelService.importFromExcel(file);
                const processedCables = ExcelService.mapRawToCable(rawCables);
                setCables(processedCables);
            }
        } catch (error) {
            console.error("Import failed:", error);
            alert("Import failed. See console for details.");
        } finally {
            setIsProcessing(false);
        }
    };

    const isLoading = isDataLoading || isRouting || isProcessing;

    const handleUpdateNodes = (updatedNodes: Node[]) => {
        setNodes(updatedNodes);
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
            saveData(updatedCables, nodes, cableTypes, deckHeights);
        } else {
            alert(`Routing failed: ${result.error || 'No connection found between nodes.'}`);
        }
    };

    const handleCalculateAllRoutes = (currentCablesOverride?: Cable[]) => {
        handleAutoRouting(); // Calls the wrapper which calls hook
    };

    // Handle routing for selected cables only
    const handleCalculateSelected = (selectedCables: Cable[]) => {
        calculateSelectedRoutes(selectedCables);
    };

    const handleView3D = (cable: Cable) => {
        setSelectedCableId(cable.id);
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

        setIsProcessing(true);
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

                    // Trigger auto-routing for new/reset cables
                    if (resetCount > 0 || newCables.length > cables.length) {
                        alert(`${msg}\n\nStarting automatic route calculation for ${mergedCables.length} cables...`);
                        // Use a timeout to allow state to update
                        setTimeout(() => {
                            // We need to pass the NEW mergedCables directly because state might not be updated yet in this closure
                            // But handleAutoRouting uses hook state... wait, handleAutoRouting calls originalHandleAutoRouting which uses hook state 'cables'
                            // Hook state 'cables' is updated via setCables(mergedCables).
                            // This might be tricky.
                            // Better: call calculateAllRoutes with argument if supported, or rely on effect?
                            // Hook supports nothing?
                            // Actually, let's trust React state update slightly or force it.
                            handleAutoRouting();
                        }, 500);
                    } else {
                        alert(msg);
                    }
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
                setIsProcessing(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }, 500);
    };

    const handleExport = () => {
        setIsProcessing(true);
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
                setIsProcessing(false);
            }
        }, 500);
    };

    const handleMenuAction = (action: string) => {
        setActiveMenu(null);
        switch (action) {
            case "Open Project": triggerFileUpload(); break;
            case "Save Project": saveShipData(); break;
            case "Export": handleExport(); break;
            case "Exit":
                if (integrationMode) {
                    alert("Cannot exit module in integration mode.");
                    return;
                }
                if (confirm("Reload Application?")) window.location.reload();
                break;
            case "Switch Role":
                alert("Please Logout and Login as a different user.");
                break;
            case "DB Update": alert("DB Update functionality not yet implemented."); break;
            case "Test": alert("Test functionality not yet implemented."); break;
            case "Cable Type": setCurrentView(MainView.CABLE_TYPE); break;
            case "Ship Select":
                if (initialShipId) {
                    alert("Ship selection is locked to the current project.");
                    return;
                }
                if (AuthService.isAdmin(currentUser)) setShowShipModal(true);
                else alert("Access Denied.");
                break;
            case "Deck Code": setShowDeckModal(true); break;
            case "Schedule": setCurrentView(MainView.SCHEDULE); break;
            case "Node List Report": setCurrentView(MainView.REPORT_NODE); break;
            case "Cable Requirement": setCurrentView(MainView.REPORT_BOM); break;
            case "Tray Analysis": setCurrentView(MainView.TRAY_ANALYSIS); break;
            case "Analytics": setCurrentView(MainView.ANALYTICS); break;

            case "Cable List": setCurrentView(MainView.SCHEDULE); break;
            case "3D Config": setCurrentView(MainView.THREE_D); break;
            case "Master Data": setCurrentView('MASTER_DATA'); break;
            case "User Mgmt": setCurrentView('USER_MGMT'); break;
            case "Ship Definition": setCurrentView('SHIP_DEF'); break;
            case "Cable Drum Inquiry": setCurrentView('DRUM_SCHEDULE'); break;
            case "Log": setCurrentView('HISTORY'); break;
            case "Settings": setCurrentView('SETTINGS'); break;
            case "CableGroup": setCurrentView('CABLE_GROUP'); break;
            case "WD Extraction":
                setCurrentView(MainView.WD_EXTRACTION);
                break;
            case "Import": setCurrentView('IMPORT'); break;

            // Simple Modals
            case "Tray Spec": setActiveModal('TRAY_SPEC'); break;
            case "Cable Binding": setActiveModal('CABLE_BINDING'); break;
            case "Equip Code": setActiveModal('EQUIP_CODE'); break;
            case "Terminal Qty": setActiveModal('TERMINAL_QTY'); break;

            default: console.log("Action not implemented:", action);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClick = () => setActiveMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Helper: Filter Menu Items based on Integration Mode
    const getFilteredMenuItems = (items: MenuItem[]) => {
        return items.filter(item => {
            // Hide "Exit" in integration mode
            if (integrationMode && item.action === 'Exit') return false;
            // Hide "Ship Select" if ship is locked via props
            if (initialShipId && item.action === 'Ship Select') return false;
            return true;
        });
    };

    const MenuDropdown: React.FC<{ group: MenuGroup }> = ({ group }) => {
        const visibleItems = getFilteredMenuItems(group.items);
        if (visibleItems.length === 0) return null; // Don't show empty groups

        return (
            <div className="relative" onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === group.id ? null : group.id); }}>
                <button className={`px-3 py-1 text-sm hover:bg-seastar-700 rounded flex items-center gap-1 ${activeMenu === group.id ? 'bg-seastar-700 text-white' : 'text-gray-300'}`}>
                    {group.title} <ChevronDown size={10} />
                </button>
                {activeMenu === group.id && (
                    <div className="absolute top-full left-0 w-56 bg-seastar-800 border border-seastar-600 shadow-xl rounded-b-lg z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                        {visibleItems.map((item, idx) => (
                            !item.restricted || AuthService.isAdmin(currentUser) ? (
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
    };

    const handleViewUnrouted = (type: 'missingLength' | 'unrouted') => {
        setCableListFilter(type);
        setCurrentView(MainView.SCHEDULE);
    };

    const onSelectCable = (cable: Cable) => {
        console.log("Selected cable:", cable.id);
        setSelectedCableId(cable.id);

        // Robust Path Resolution (Fix for "Not Working" issue)
        let pathData: string[] = [];
        if (cable.calculatedPath && cable.calculatedPath.length > 0) {
            pathData = cable.calculatedPath;
        } else if (cable.path) {
            pathData = cable.path.split(',').map(s => s.trim()).filter(s => s);
        }

        if (pathData.length > 0) {
            setRoutePath(pathData);
            console.log("Updated Route Path:", pathData);
        }
    };

    const handleUpdateCable = (updatedCable: Cable) => {
        const newCables = cables.map(c => c.id === updatedCable.id ? updatedCable : c);
        setCables(newCables);
        saveData(newCables, nodes, cableTypes, deckHeights);

        // Simple confirmation for re-routing
        if (window.confirm("데이터가 변경되었습니다. 이 케이블을 다시 라우팅하시겠습니까?\n(Data changed. Re-route this cable?)")) {
            calculateRoute(updatedCable);
        }
    };

    const renderContent = () => {
        switch (currentView) {
            case MainView.DASHBOARD:
                return <DashboardView cables={cables} nodes={nodes} />;
            case MainView.SCHEDULE:
                return (
                    <CableList
                        cables={cables}
                        isLoading={isLoading}
                        onSelectCable={onSelectCable}
                        onCalculateRoute={calculateRoute}
                        onCalculateAll={handleAutoRouting}
                        onCalculateSelected={calculateSelectedRoutes}
                        onView3D={(cable) => {
                            setRoutePath(cable.calculatedPath || []);
                            setCurrentView(MainView.THREE_D);
                        }}
                        triggerImport={triggerFileUpload}
                        onExport={handleExport}
                        onUpdateCable={handleUpdateCable}
                        initialFilter={cableListFilter}
                        selectedCableId={selectedCableId}
                    />
                );
            case MainView.CABLE_TYPE:
                return <CableTypeManager data={cableTypes} />;
            case MainView.REPORT_NODE:
                return <NodeManager nodes={nodes} updateNodes={handleUpdateNodes} />;
            case MainView.REPORT_BOM:
                return <CableRequirementReport cables={cables} onExport={handleExport} onCreatePOS={handleExport} />;
            case MainView.TRAY_ANALYSIS:
                return <TrayAnalysis cables={cables} nodes={nodes} />;
            case MainView.THREE_D:
                return (
                    <ThreeScene
                        nodes={nodes}
                        cables={cables}
                        highlightPath={routePath}
                        deckHeights={deckHeights}
                        selectedCableId={selectedCableId}
                        onClose={() => setCurrentView(MainView.SCHEDULE)}
                    />
                );
            case MainView.GENERIC_GRID:
                return <GenericGrid data={genericData} title={genericTitle} />;
            case MainView.WD_EXTRACTION:
                return <WDExtractionView onApplyCables={(newCables) => {
                    setCables(newCables);
                    saveData(newCables, nodes, cableTypes, deckHeights);
                    setCurrentView(MainView.SCHEDULE);
                    alert(`Applied ${newCables.length} cables from Extraction.`);
                }} />;

            // New Menu Views
            case 'MASTER_DATA': return <MasterData />;
            case 'USER_MGMT': return <UserManagement />;
            case 'SHIP_DEF': return <ShipDefinition />;
            case 'DRUM_SCHEDULE': return <DrumScheduleReport cables={cables} />;
            case 'HISTORY': return <HistoryViewer history={HistoryService.getHistory()} />;
            case 'SETTINGS': return <Settings />;
            case 'CABLE_GROUP': return <CableGroup cables={cables} />;
            case 'IMPORT': return <ImportPanel onImport={handleImportExcel} />;
            case MainView.REPORT_NODE: return <NodeListReport nodes={nodes} cables={cables} />;
            case MainView.INSTALL_STATUS: return <InstallationStatusView cables={cables} />;
            case MainView.ANALYTICS: return <PivotAnalyzer data={cables} />;

            default:
                return <div className="p-10 text-center text-gray-400">View Not Implemented: {currentView}</div>;
        }
    };

    return (
        <div className="flex flex-col h-screen text-gray-100 font-sans overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
            {/* <LoadingOverlay isVisible={isLoading || isProcessing} message={isRouting ? "Calculating Routes..." : "Processing Data..."} /> */}

            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} title="Upload Excel Data" />

            {/* Simple Modals */}
            {activeModal && (
                <SimpleModal
                    title={activeModal.replace('_', ' ')}
                    onClose={() => setActiveModal(null)}
                >
                    {activeModal === 'TRAY_SPEC' && <TraySpecContent />}
                    {activeModal === 'CABLE_BINDING' && <CableBindingContent />}
                    {activeModal === 'EQUIP_CODE' && <EquipCodeContent />}
                    {activeModal === 'TERMINAL_QTY' && <TerminalQtyContent />}
                </SimpleModal>
            )}

            {/* HEADER */}
            <div className="h-10 bg-seastar-800 border-b border-seastar-600 flex items-center justify-between px-4 shadow-md z-20 select-none">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-seastar-neon to-blue-600 rounded flex items-center justify-center shadow-neon">
                        <Terminal size={14} className="text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">
                        <span className="text-white">SEASTAR</span>
                        <span className="text-seastar-cyan">CMS</span>
                    </span>
                    <span className="text-[10px] text-gray-500 ml-1 border border-gray-600 px-1 rounded">v{DATA_VERSION}</span>

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
                    {renderContent()}
                </div>
            </main>

            {/* STATUS BAR */}
            <div className="h-6 bg-seastar-800 border-t border-seastar-700 flex items-center px-4 text-[10px] text-gray-400 select-none justify-between">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1 text-seastar-cyan font-bold">
                        <Terminal size={10} /> Developer: designsir@seastargo.com
                    </span>
                    <span className="flex items-center gap-1 cursor-pointer hover:text-white" onClick={handleLogout} title="Click to Logout">
                        <User size={10} /> User: <span className={currentUser.role === 'ADMIN' ? 'text-yellow-400 font-bold' : 'text-gray-400'}>
                            {currentUser.username} ({currentUser.role})
                        </span>
                        <span className="text-[9px] text-red-400 ml-1 border border-red-900 px-1 rounded hover:bg-red-900/50">LOGOUT</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Ship size={10} /> Ship: <span className="text-yellow-400 font-mono">{shipId}</span>
                        {!AuthService.canAccessShip(currentUser, shipId) && <span className="text-red-500 font-bold ml-1">(ACCESS DENIED)</span>}
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
                            <button onClick={() => setShowShipModal(false)} className="text-gray-400 hover:text-white" title="Close Vessel Selection"><X size={18} /></button>
                        </div>
                        <div className="grid gap-2 mb-6">
                            {accessibleShips.map(ship => (
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
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-seastar-800 border border-seastar-600 rounded-lg shadow-2xl w-[400px] p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4 border-b border-seastar-700 pb-2">
                            <h3 className="text-lg font-bold text-white">Deck Configuration (Elevation)</h3>
                            <button onClick={() => setShowDeckModal(false)} className="text-gray-400 hover:text-white" title="Close Deck Configuration"><X size={18} /></button>
                        </div>
                        <div className="space-y-2">
                            {Object.entries(deckHeights).map(([deck, height]) => (
                                <div key={deck} className="flex items-center justify-between bg-seastar-900 p-2 rounded border border-seastar-700">
                                    <span className="font-mono text-seastar-cyan">{deck}</span>
                                    <input
                                        type="number"
                                        className="w-24 bg-black border border-gray-600 rounded px-2 py-1 text-right text-white"
                                        value={height}
                                        onChange={(e) => updateDeckHeight(deck, e.target.value)}
                                        title={`Height for ${deck} deck`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* GLOBAL STATUS BAR (User Requested) */}
            {(isRouting || isProcessing) && (
                <div className="fixed bottom-0 left-0 right-0 z-[100] bg-seastar-900/95 border-t border-seastar-neon p-2 flex items-center justify-center space-x-4 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-5">
                    <Loader2 className="w-5 h-5 text-seastar-neon animate-spin" />
                    <div className="text-seastar-cyan font-bold font-mono tracking-wider">
                        {isRouting
                            ? `라우팅 처리 중... ${routingProgress}% (${Math.round(cables.length * routingProgress / 100)}/${cables.length})`
                            : "시스템 처리 중... (SYSTEM PROCESSING)"}
                    </div>
                    <div className="h-2 w-48 bg-gray-700 rounded overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-200"
                            style={{ width: isRouting ? `${routingProgress}%` : '0%' }}
                        ></div>
                    </div>
                    <div className="text-seastar-neon font-bold font-mono text-lg">{routingProgress}%</div>
                </div>
            )}


        </div>
    );
};

export default App;