import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronDown, Terminal, Activity, Wifi, Box, Monitor, Settings as SettingsIcon, Save, X, Upload, FileSpreadsheet, Loader2, User, Lock, Ship, Home, Calendar, Database, Eye, CheckCircle
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
import InstallationStatusView from './components/InstallationStatusView';

// Auth & Admin Integration
import LandingPage from './components/LandingPage';
import { CableAuthProvider, useCableAuth } from './contexts/CableAuthContext';
import CableUserManagement from './components/admin/CableUserManagement';
import CableAdminConsole from './components/admin/CableAdminConsole';
import CablePermissionEditor from './components/admin/CablePermissionEditor';
import PermissionGuard from './components/PermissionGuard';
import ColumnMapperModal from './components/ColumnMapperModal';

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
    view?: string; // Directly map to view
    role?: string[]; // Allowed roles
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
            { label: "Installation Status", action: "Install Status", view: MainView.INSTALL_STATUS },
            { label: "Data Analytics", action: "Analytics", restricted: false },
            { label: "History", action: "History" }
        ]
    },
    {
        id: 'admin', title: 'Admin', items: [
            { label: "👥 User Management", action: "User Mgmt", view: MainView.USER_MGMT, restricted: true },
            { label: "🔐 Permissions", action: "Permissions", view: MainView.PERMISSIONS, restricted: true },
            { label: "⚙️ System Console", action: "Admin Console", view: MainView.ADMIN_CONSOLE },
            { label: "🛠️ Settings", action: "Settings" },
            { label: "📜 Audit Log", action: "Log" }
        ]
    }
];

// Integration Props for SDMS
export interface AppProps {
    initialShipId?: string; // If provided by parent SDMS
    integrationMode?: boolean; // If true, disable conflicting global styles or routing
}

// Inner Main App Component (Authenticated)
const MainApp: React.FC<AppProps> = ({ initialShipId, integrationMode = false }) => {
    const { user, isSuperAdmin, logout } = useCableAuth();

    // Auth context wrapper handles missing user, but check just in case
    if (!user) return null;

    // Version Control
    const DATA_VERSION = "2026-01-14 15:30:00";

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

            // Clear all SEASTAR related data (Keep Auth Data!)
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('SEASTAR_')) {
                    localStorage.removeItem(key);
                }
            });

            try {
                localStorage.setItem('app_data_version', DATA_VERSION);
            } catch (e) {
                console.error("Critical Error: Failed to save version info. LocalStorage might be full.", e);
            }
        }
    }, []);

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

    // Column Mapper State
    const [showColumnMapper, setShowColumnMapper] = useState(false);
    const [pendingFile, setPendingFile] = useState<{ file: File, type: 'cables' | 'nodes' } | null>(null);
    const [pendingExcelData, setPendingExcelData] = useState<any[]>([]);
    const [pendingExcelHeaders, setPendingExcelHeaders] = useState<string[]>([]);

    // Loading State for mapper
    const [isParsingExcel, setIsParsingExcel] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Effect to check if user has access to current ship, otherwise default to first available
    useEffect(() => {
        if (!user.shipAccess) return;

        const hasAccess = user.shipAccess.includes('*') || user.shipAccess.includes(shipId);
        if (!hasAccess) {
            // Find first accessible ship
            if (user.shipAccess.length > 0) {
                const first = user.shipAccess[0];
                setShipId(first);
            } else {
                alert("You have no ship access assigned. Please contact administrator.");
            }
        }
    }, [user, shipId]);

    // Force ship update from props if needed (and different)
    useEffect(() => {
        if (initialShipId && shipId !== initialShipId) {
            setShipId(initialShipId);
        }
    }, [initialShipId, shipId]);

    const handleLogout = () => {
        logout();
        setCurrentView(MainView.DASHBOARD);
    };

    // Save Data - Defined early to be passed to hooks
    const saveShipData = (overrideCables?: Cable[]) => {
        const targetCables = overrideCables || cables;
        if (!isSuperAdmin && user.role !== 'MANAGER' && user.role !== 'ADMIN') {
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

    // File Upload Handler (Raw) -> Detects format -> Opens Mapper if needed
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsingExcel(true);
        setIsProcessing(true);

        try {
            const rawData = await ExcelService.importFromExcel(file);
            const headers = Object.keys(rawData[0] || {});
            const fileType = ExcelService.detectFileType(headers);

            console.log("Detected File Type:", fileType);

            if (fileType === 'CABLE') {
                // Determine if we need mapper (simplified check: if standard Cable format fits poorly)
                // For now, ALWAYS show mapper for Cables to ensure quality as per instructions
                setPendingExcelData(rawData);
                setPendingExcelHeaders(headers);
                setPendingFile({ file, type: 'cables' });
                setShowColumnMapper(true);
            } else if (fileType === 'NODE') {
                // For nodes, standard import is usually safer, but could use mapper too.
                // Let's stick to standard for now unless requested
                const mappedNodes = ExcelService.mapRawToNode(rawData);
                setNodes(mappedNodes);
                const dataToSave = { cables, nodes: mappedNodes, cableTypes, deckHeights };
                localStorage.setItem(`SEASTAR_DATA_${shipId}`, JSON.stringify(dataToSave));
                setCurrentView(MainView.REPORT_NODE);
                alert(`Imported ${mappedNodes.length} Nodes successfully.`);
            } else if (fileType === 'TYPE') {
                setCableTypes(rawData as GenericRow[]);
                const dataToSave = { cables, nodes, cableTypes: rawData, deckHeights };
                localStorage.setItem(`SEASTAR_DATA_${shipId}`, JSON.stringify(dataToSave));
                setCurrentView(MainView.CABLE_TYPE);
                alert(`Imported ${rawData.length} Cable Types.`);
            } else {
                setGenericData(rawData as GenericRow[]);
                setGenericTitle(`Data: ${file.name}`);
                setCurrentView(MainView.GENERIC_GRID);
                alert(`Imported ${rawData.length} records as Generic Data.`);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to parse Excel file.");
        } finally {
            setIsParsingExcel(false);
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Callback from Column Mapper
    const handleMapperConfirm = (transformedData: any[]) => {
        setShowColumnMapper(false);
        if (!pendingFile) return;

        setIsProcessing(true);
        try {
            if (pendingFile.type === 'cables') {
                const newCables = ExcelService.mapRawToCable(transformedData);

                // Merge logic (copied from previous impl)
                const oldCableMap = new Map<string, Cable>(cables.map(c => [c.name, c]));
                let resetCount = 0;
                let preservedCount = 0;

                const mergedCables = newCables.map(newCable => {
                    const oldCable = oldCableMap.get(newCable.name);
                    if (oldCable) {
                        const nodeChanged =
                            oldCable.fromNode !== newCable.fromNode ||
                            oldCable.toNode !== newCable.toNode;

                        if (nodeChanged) {
                            resetCount++;
                            return { ...newCable, calculatedPath: undefined, calculatedLength: undefined, length: 0, path: '' };
                        }
                        preservedCount++;
                        return {
                            ...newCable,
                            calculatedPath: oldCable.calculatedPath,
                            calculatedLength: oldCable.calculatedLength,
                            length: oldCable.length || newCable.length,
                            path: oldCable.path || newCable.path
                        };
                    }
                    return newCable;
                });

                setCables(mergedCables);
                const dataToSave = { cables: mergedCables, nodes, cableTypes, deckHeights };
                localStorage.setItem(`SEASTAR_DATA_${shipId}`, JSON.stringify(dataToSave));
                setCurrentView(MainView.SCHEDULE);

                alert(`Successfully imported ${mergedCables.length} cables using custom mapping!`);
                if (resetCount > 0) handleAutoRouting();
            }
        } catch (e) {
            console.error(e);
            alert("Error applying mapped data.");
        } finally {
            setIsProcessing(false);
            setPendingFile(null);
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

    const handleMenuAction = (item: MenuItem) => {
        setActiveMenu(null);
        if (item.action === "Open Project") {
            triggerFileUpload();
            return;
        }
        if (item.action === "Save Project") { saveShipData(); return; }
        if (item.action === "Export") { handleExport(); return; }
        if (item.action === "Exit") {
            if (integrationMode) { alert("Cannot exit module in integration mode."); return; }
            logout();
            return;
        }
        if (item.view) {
            setCurrentView(item.view);
            return;
        }

        switch (item.action) {
            // Legacy actions mapping
            case "Load Data": setShowShipModal(true); break;
            case "Schedule": setCurrentView(MainView.SCHEDULE); break;
            case "Node List": setCurrentView(MainView.REPORT_NODE); break;
            case "Cable Requirement": setCurrentView(MainView.REPORT_BOM); break;
            case "Tray Analysis": setCurrentView(MainView.TRAY_ANALYSIS); break;
            case "Analytics": setCurrentView(MainView.ANALYTICS); break;
            case "History": setCurrentView('HISTORY'); break;
            case "Settings": setCurrentView('SETTINGS'); break;
            // Add other logical mappings if view not explicitly set
            default: console.log("Action fallthrough:", item.action);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClick = () => setActiveMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const MenuDropdown: React.FC<{ group: MenuGroup }> = ({ group }) => {
        // Filter items based on permission
        const visibleItems = group.items.filter(item => {
            // 1. Integration Check
            if (integrationMode && item.action === 'Exit') return false;
            // 2. Restricted Check
            if (item.restricted && !isSuperAdmin) return false;
            // 3. Admin View Check
            if (item.view === MainView.USER_MGMT && !isSuperAdmin) return false;
            if (item.view === MainView.PERMISSIONS && !isSuperAdmin) return false;
            // 4. Role Check (future extensibility)
            if (item.role && !item.role.includes(user.role)) return false;

            return true;
        });

        if (visibleItems.length === 0) return null;

        return (
            <div className="relative" onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === group.id ? null : group.id); }}>
                <button className={`px-3 py-1 text-sm hover:bg-seastar-700 rounded flex items-center gap-1 ${activeMenu === group.id ? 'bg-seastar-700 text-white' : 'text-gray-300'}`}>
                    {group.title} <ChevronDown size={10} />
                </button>
                {activeMenu === group.id && (
                    <div className="absolute top-full left-0 w-56 bg-seastar-800 border border-seastar-600 shadow-xl rounded-b-lg z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                        {visibleItems.map((item, idx) => (
                            <div
                                key={idx}
                                className={`px-4 py-2 text-xs border-b border-seastar-700/50 last:border-0 
                            ${item.disabled
                                        ? 'text-gray-600 cursor-not-allowed'
                                        : 'text-gray-300 hover:bg-seastar-cyan hover:text-seastar-900 cursor-pointer'
                                    }`}
                                onClick={(e) => {
                                    if (!item.disabled) handleMenuAction(item);
                                    e.stopPropagation();
                                }}
                            >
                                {item.label}
                                {item.restricted && <Lock size={10} className="inline ml-2 text-yellow-500" />}
                            </div>
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
            case MainView.INSTALL_STATUS:
                return <InstallationStatusView cables={cables} />;
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
            case MainView.USER_MGMT:
                return <PermissionGuard requireSuperAdmin><CableUserManagement /></PermissionGuard>;
            case MainView.PERMISSIONS:
                return <PermissionGuard requireSuperAdmin><CablePermissionEditor /></PermissionGuard>;
            case MainView.ADMIN_CONSOLE:
                return <PermissionGuard><CableAdminConsole /></PermissionGuard>;
            case 'HISTORY':
                return <HistoryViewer onRestore={(snapshot) => {
                    // Restore logic
                    alert("Snapshot restore functionality coming soon.");
                }} />;
            case 'SETTINGS':
                return <Settings deckHeights={deckHeights} updateDeckHeight={updateDeckHeight} />;

            default:
                return (
                    <div className="flex items-center justify-center h-full text-gray-400 flex-col">
                        <Monitor size={64} className="mb-4 text-gray-600" />
                        <h2 className="text-xl font-semibold">Welcome to Cable Manager</h2>
                        <p>Select an option from the menu enabled for your role ({user.role})</p>
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
            {/* Header */}
            <div className="bg-seastar-900 text-white shadow-md z-30 flex-none h-12 flex items-center justify-between px-4 border-b border-seastar-700">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-lg tracking-tight flex items-center gap-2 text-seastar-cyan">
                        <Wifi size={20} className="text-seastar-cyan animate-pulse-slow" />
                        SEASTAR <span className="text-gray-400 font-light text-sm">Cable Manager 2.0</span>
                    </div>

                    {/* Ship Selector in Header */}
                    <div className="flex items-center bg-seastar-800 rounded px-2 py-0.5 border border-seastar-600">
                        <Ship size={14} className="text-seastar-cyan mr-2" />
                        <span className="text-xs text-gray-300 mr-2">Project:</span>
                        <select
                            value={shipId}
                            onChange={(e) => {
                                // Check access
                                if (user.shipAccess?.includes('*') || user.shipAccess?.includes(e.target.value)) {
                                    setShipId(e.target.value);
                                } else {
                                    alert("Access Denied for this ship.");
                                }
                            }}
                            className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
                        >
                            {availableShips.map(ship => (
                                <option key={ship.id} value={ship.id} className="bg-seastar-900 text-white">
                                    {ship.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Role Badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${user.role === 'SUPER_ADMIN' ? 'bg-purple-900 border-purple-500 text-purple-200' :
                            user.role === 'ADMIN' ? 'bg-red-900 border-red-500 text-red-200' :
                                'bg-blue-900 border-blue-500 text-blue-200'
                        }`}>
                        {user.role}
                    </span>
                </div>

                {/* Menus */}
                <div className="flex items-center gap-1">
                    {MENU_STRUCTURE.map(group => (
                        <MenuDropdown key={group.id} group={group} />
                    ))}
                </div>

                {/* Right Side Status */}
                <div className="flex items-center gap-4">
                    {isRouting && (
                        <div className="flex items-center gap-2 text-xs bg-seastar-800 px-3 py-1 rounded-full animate-pulse border border-yellow-500/30">
                            <Activity size={14} className="text-yellow-400" />
                            <span className="text-yellow-200 font-mono">
                                Routing: {routingProgress.total > 0 ? `${Math.round((routingProgress.current / routingProgress.total) * 100)}%` : 'Init...'}
                            </span>
                        </div>
                    )}

                    <div className="text-xs text-gray-500 font-mono hidden md:block">
                        Build: {DATA_VERSION}
                    </div>

                    {/* Profile/Logout */}
                    <div className="flex items-center gap-2 border-l border-seastar-700 pl-4 ml-2">
                        <div className="text-right hidden lg:block">
                            <div className="text-xs font-bold text-white">{user.name}</div>
                            <div className="text-[10px] text-gray-400">{user.email}</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Sign Out"
                            className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {renderContent()}

                {/* Column Mapper Modal */}
                {showColumnMapper && (
                    <ColumnMapperModal
                        excelHeaders={pendingExcelHeaders}
                        excelData={pendingExcelData}
                        onConfirm={handleMapperConfirm}
                        onCancel={() => { setShowColumnMapper(false); setPendingFile(null); }}
                    />
                )}
            </div>

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
            />

            {/* Global Overlays */}
            {isLoading && <LoadingOverlay message={isProcessing ? "Processing Data..." : "Initializing..."} />}
            {activeModal === 'TRAY_SPEC' && <SimpleModal title="Tray Specification" onClose={() => setActiveModal(null)}><TraySpecContent /></SimpleModal>}
            {activeModal === 'CABLE_BINDING' && <SimpleModal title="Cable Binding Standard" onClose={() => setActiveModal(null)}><CableBindingContent /></SimpleModal>}
            {activeModal === 'EQUIP_CODE' && <SimpleModal title="Equipment Code Table" onClose={() => setActiveModal(null)}><EquipCodeContent /></SimpleModal>}
            {activeModal === 'TERMINAL_QTY' && <SimpleModal title="Terminal Quantity Standard" onClose={() => setActiveModal(null)}><TerminalQtyContent /></SimpleModal>}
        </div>
    );
};

// Outer App Wrapper with Auth Provider
const App: React.FC<AppProps> = (props) => {
    return (
        <CableAuthProvider>
            <AuthWrapper {...props} />
        </CableAuthProvider>
    );
};

// Auth Logic Wrapper
const AuthWrapper: React.FC<AppProps> = (props) => {
    const { isAuthenticated, loading, user, setShipAccess } = useCableAuth();

    // Loading State
    if (loading) {
        return (
            <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <div className="text-sm font-medium animate-pulse">Initializing Secure Environment...</div>
            </div>
        );
    }

    // Not Authenticated -> Show Landing Page
    if (!isAuthenticated || !user) {
        return <LandingPage onShipSelected={(shipId) => {
            // Note: Landing page updates auth context login. 
            // If we are here, user is meant to be logged out.
            // Actually LandingPage handles login internally now.
        }} />;
    }

    // Authenticated -> Show Main App
    return (
        <React.Suspense fallback={<LoadingOverlay message="Loading Module..." />}>
            <MainApp {...props} />
        </React.Suspense>
    );
};

export default App;