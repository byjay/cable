import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronDown, Terminal, Activity, Wifi, Box, Monitor, Settings as SettingsIcon, Save, X, Upload, FileSpreadsheet, Loader2, User, Lock, Ship, Home, Calendar, Database, Eye, CheckCircle,
    FolderOpen, FileDown, List, Network, Layers, Circle, MapPin, FileText, BarChart3, PieChart, ShieldCheck, Clock, Calculator
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
import HistoryViewer from './components/HistoryViewer';
import Settings from './components/Settings';
import CableGroup from './components/CableGroup';
import WDExtractionView from './components/WDExtractionView';
import TrayFill from './components/TrayFill';
import { SimpleModal } from './components/SimpleModal';
import LoadingOverlay from './components/LoadingOverlay';
import { TraySpecContent } from './components/StaticContent';
import { ExcelService } from './services/excelService';
import { HistoryService } from './services/historyService';
import { Cable, Node, MainView, DeckConfig, GenericRow } from './types';
import { useProjectData } from './hooks/useProjectData';
import { useAutoRouting } from './hooks/useAutoRouting';
import InstallationStatusView from './components/InstallationStatusView';
import ShipSelectionModal from './components/ShipSelectionModal';

// Auth & Admin Integration
import LandingPage from './components/LandingPage';
import { CableAuthProvider, useCableAuth } from './contexts/CableAuthContext';
import CableUserManagement from './components/admin/CableUserManagement';
import CableAdminConsole from './components/admin/CableAdminConsole';
import CablePermissionEditor from './components/admin/CablePermissionEditor';
import PermissionGuard from './components/PermissionGuard';
import ColumnMapperModal from './components/ColumnMapperModal';

// [DEV] Orphaned Components Integration
import PivotAnalyzer from './components/PivotAnalyzer';
import DataVerification from './components/DataVerification';
import NodeListReportLegacy from './components/NodeListReport'; // Renamed to avoid conflict with new NodeListReport
import ThreeSceneEnhanced from './components/ThreeSceneFinal'; // Experimental 3D

// Constants
const AVAILABLE_SHIPS = [
    { id: "HK2401", name: "HK2401 - 35K Product Carrier" },
    { id: "S1001_35K_FD", name: "S1001 - 35K Product Carrier" },
    { id: "S1002_LNG", name: "S1002 - 174K LNG Carrier" },
    { id: "H5500_CONT", name: "H5500 - 16K TEU Container" },
    { id: "K2024_FERRY", name: "K2024 - Passenger Ferry" }
];

interface MenuItem {
    label: string;
    action: string;
    disabled?: boolean;
    restricted?: boolean;
    view?: string;
    role?: string[];
    icon?: React.ElementType; // Added icon property
}

interface MenuGroup {
    id: string;
    title: string;
    items: MenuItem[];
    requiredRole?: string[]; // Added requiredRole property
}

const MENU_STRUCTURE: MenuGroup[] = [
    {
        id: 'file', title: '파일 (File)', items: [
            { label: "📂 데이터 불러오기 (엑셀)", action: "Load Data", icon: FolderOpen },
            { label: "프로젝트 열기", action: "Open Project", icon: Database },
            { label: "프로젝트 저장", action: "Save Project", restricted: true, icon: Save },
            { label: "내보내기 (Export)", action: "Export", icon: FileDown },
            { label: "종료 (Exit)", action: "Exit" }
        ]
    },
    {
        id: 'schedule', title: '스케줄 (Schedule)', items: [
            { label: "케이블 리스트 (Cable List)", action: "Schedule", icon: List },
            { label: "결선 작업 (WD Extraction)", action: "WD Extraction", icon: Network },
            { label: "케이블 그룹 (Cable Group)", action: "CableGroup", icon: Layers },
            { label: "드럼 스케줄 (Drum Schedule)", action: "Drum Schedule", icon: Circle },
            { label: "🧠 트레이 최적화 (Tray Fill)", action: "TrayFill", icon: Calculator },
            { label: "노드 리스트 (Node List)", action: "Node List", icon: MapPin },
            { label: "가져오기 (Import)", action: "Import", icon: Upload }
        ]
    },
    {
        id: 'report', title: '레포트 (Report)', items: [
            { label: "물량 산출서 (BOM)", action: "Cable Req", icon: FileText },
            { label: "트레이 용량 분석", action: "Tray Analysis", icon: BarChart3 },
            { label: "📈 설치 현황판", action: "Installation Status", view: MainView.INSTALL_STATUS, icon: Activity },
            { label: "3D 시각화", action: "3D View", icon: Box },
            { label: "마스터 데이터", action: "Master Data", icon: SettingsIcon }
        ]
    },
    {
        id: 'admin', title: '관리자 (Admin)', requiredRole: ['SUPER_ADMIN'], items: [
            { label: "사용자 관리", action: "User Mgmt", view: MainView.USER_MGMT, restricted: true, icon: User },
            { label: "권한 설정", action: "Permissions", view: MainView.PERMISSIONS, restricted: true, icon: Lock },
            { label: "시스템 콘솔", action: "Admin Console", view: MainView.ADMIN_CONSOLE, icon: Terminal },
            { label: "설정", action: "Settings", icon: SettingsIcon },
            { label: "감사 로그 (Audit List)", action: "Log", icon: Eye }
        ]
    },
    {
        id: 'dev', title: '개발자 도구 (Dev Tools)', requiredRole: ['SUPER_ADMIN', 'ADMIN'], items: [
            { label: "피벗 분석", action: "Dev_Pivot", icon: PieChart },
            { label: "데이터 무결성", action: "Dev_DataHealth", icon: ShieldCheck },
            { label: "히스토리 로그", action: "Dev_History", icon: Clock },
            { label: "Legacy 노드 리스트", action: "Dev_NodeListLegacy", icon: FileText },
            { label: "3D 레벨 맵 (Exp)", action: "Dev_3DLevel", icon: Box }
        ]
    }
];

export interface AppProps {
    initialShipId?: string;
    integrationMode?: boolean;
}

// --- Menu Component ---
const MenuBar: React.FC<{
    activeMenu: string | null;
    setActiveMenu: (id: string | null) => void;
    onAction: (item: MenuItem) => void;
    isSuperAdmin: boolean;
}> = ({ activeMenu, setActiveMenu, onAction, isSuperAdmin }) => {
    return (
        <div className="flex items-center gap-1">
            {MENU_STRUCTURE.map(group => (
                <div key={group.id} className="relative group/menu">
                    <button
                        onClick={() => setActiveMenu(activeMenu === group.id ? null : group.id)}
                        className={`px-3 py-1 text-sm hover:bg-seastar-700 rounded flex items-center gap-1 ${activeMenu === group.id ? 'bg-seastar-700 text-white' : 'text-gray-300'}`}
                    >
                        {group.title} <ChevronDown size={10} />
                    </button>
                    {activeMenu === group.id && (
                        <div className="absolute top-full left-0 w-56 bg-seastar-800 border border-seastar-600 shadow-xl rounded-b-lg z-50 animate-in fade-in slide-in-from-top-2 duration-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {group.items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`px-4 py-2 text-xs border-b border-seastar-700/50 last:border-0 
                                            ${item.disabled ? 'text-gray-600' : 'text-gray-300 hover:bg-seastar-cyan hover:text-seastar-900 cursor-pointer'}
                                            ${item.restricted && !isSuperAdmin ? 'hidden' : ''}
                                         `}
                                    onClick={() => !item.disabled && onAction(item)}
                                >
                                    {item.label}
                                    {item.restricted && <Lock size={10} className="inline ml-2 text-yellow-500" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


const MainApp: React.FC<AppProps> = ({ initialShipId, integrationMode = false }) => {
    const { user, isSuperAdmin, logout } = useCableAuth();
    const DATA_VERSION = "2026-01-14 16:15:00";

    // Hooks
    const {
        cables, setCables, nodes, setNodes, cableTypes, setCableTypes, deckHeights, setDeckHeights,
        shipId, setShipId, isLoading: isDataLoading, saveData, loadProjectData, availableShips
    } = useProjectData();

    // State
    const [currentView, setCurrentView] = useState<string>(MainView.DASHBOARD);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showShipModal, setShowShipModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cableListFilter, setCableListFilter] = useState<'all' | 'unrouted' | 'missingLength'>('all');
    const [genericData, setGenericData] = useState<GenericRow[]>([]);
    const [genericTitle, setGenericTitle] = useState<string>('');
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [selectedCableId, setSelectedCableId] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [showColumnMapper, setShowColumnMapper] = useState(false);
    const [pendingFile, setPendingFile] = useState<{ file: File, type: 'cables' | 'nodes' } | null>(null);
    const [pendingExcelData, setPendingExcelData] = useState<any[]>([]);
    const [pendingExcelHeaders, setPendingExcelHeaders] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Load Logic
    useEffect(() => {
        if (initialShipId && shipId !== initialShipId) setShipId(initialShipId);
        // Force version clear
        const currentVersion = localStorage.getItem('app_data_version');
        if (currentVersion !== DATA_VERSION) {
            Object.keys(localStorage).forEach(key => key.startsWith('SEASTAR_') && localStorage.removeItem(key));
            localStorage.setItem('app_data_version', DATA_VERSION);
        }
    }, []);

    // Helper: Save
    const saveShipData = (overrideCables?: Cable[]) => {
        if (!isSuperAdmin && user?.role !== 'MANAGER' && user?.role !== 'ADMIN') {
            alert("Access Denied"); return;
        }
        const targetCables = overrideCables || cables;
        HistoryService.record('Save', `Manual save`, shipId, targetCables, nodes, cableTypes);
        saveData(targetCables, nodes, cableTypes, deckHeights);
        if (!overrideCables) alert("Saved.");
    };

    // Routing
    const {
        routingService, routePath, setRoutePath, isRouting, routingProgress, calculateRoute,
        calculateAllRoutes, calculateSelectedRoutes, isReady: isRoutingReady
    } = useAutoRouting({ nodes, cables, setCables, saveData: saveShipData });

    // Handlers
    const handleLogout = () => { logout(); setCurrentView(MainView.DASHBOARD); };

    const handleMenuAction = (item: MenuItem) => {
        setActiveMenu(null);
        if (item.action === "Open Project") {
            if (window.confirm("Load processed data (HK2401)?")) {
                loadProjectData('HK2401');
                alert("Project HK2401 Loaded.");
            }
            return;
        }
        if (item.action === "Save Project") { saveShipData(); return; }
        if (item.action === "Export") { handleExport(); return; }
        if (item.action === "Exit") { if (!integrationMode) logout(); return; }
        if (item.view) { setCurrentView(item.view); return; }

        switch (item.action) {
            case "Load Data": setShowShipModal(true); break;
            case "Schedule": setCurrentView(MainView.SCHEDULE); break;
            case "Node List": setCurrentView(MainView.REPORT_NODE); break;
            case "Cable Requirement": setCurrentView(MainView.REPORT_BOM); break;
            case "Tray Analysis": setCurrentView(MainView.TRAY_ANALYSIS); break;
            case "Analytics": setCurrentView(MainView.ANALYTICS); break;
            case "Settings": setCurrentView('SETTINGS'); break;

            // [FIX] 5-Point Restoration
            case "3D View": setCurrentView(MainView.THREE_D); break;
            case "Master Data": setCurrentView(MainView.CABLE_TYPE); break;
            case "CableGroup": setCurrentView('CABLE_GROUP'); break;
            case "Drum Schedule": setCurrentView('DRUM_SCHEDULE'); break;
            case "WD Extraction": setCurrentView(MainView.WD_EXTRACTION); break;
            case "TrayFill": setCurrentView('TRAY_FILL'); break;
            case "Import": fileInputRef.current?.click(); break;

            // [DEV] Tools
            case "Dev_DataHealth": setCurrentView('DEV_DATA_HEALTH'); break;
            case "Dev_Pivot": setCurrentView('DEV_PIVOT'); break;
            case "Dev_History": setCurrentView('HISTORY'); break; // Already mapped
            case "Dev_NodeListLegacy": setCurrentView('DEV_NODE_LEGACY'); break;
            case "Dev_3DLevel": setCurrentView('DEV_3D_LEVEL'); break;

            default: break;
        }
    };

    const handleExport = () => {
        setIsProcessing(true);
        setTimeout(() => {
            try {
                let data = cables as any[];
                let name = `${shipId}_Export`;
                if (currentView === MainView.REPORT_NODE) { data = nodes; name += "_Nodes"; }
                ExcelService.exportToExcel(data, name);
            } catch (e) { console.error(e); alert("Export Failed"); }
            finally { setIsProcessing(false); }
        }, 100);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsProcessing(true);
        try {
            const rawData = await ExcelService.importFromExcel(file);
            const headers = Object.keys(rawData[0] || {});
            const fileType = ExcelService.detectFileType(headers);

            if (fileType === 'CABLE') {
                setPendingExcelData(rawData);
                setPendingExcelHeaders(headers);
                setPendingFile({ file, type: 'cables' });
                setShowColumnMapper(true);
            } else if (fileType === 'NODE') {
                const mapped = ExcelService.mapRawToNode(rawData);
                setNodes(mapped);
                saveData(cables, mapped, cableTypes, deckHeights);
                setCurrentView(MainView.REPORT_NODE);
                alert(`Imported ${mapped.length} nodes.`);
            } else {
                setGenericData(rawData as GenericRow[]);
                setGenericTitle(file.name);
                setCurrentView(MainView.GENERIC_GRID);
            }
        } catch (e) { alert("Import Failed"); }
        finally { setIsProcessing(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleMapperConfirm = (transformedData: any[]) => {
        setShowColumnMapper(false);
        if (pendingFile?.type === 'cables') {
            const newCables = ExcelService.mapRawToCable(transformedData);
            setCables(newCables);
            saveData(newCables, nodes, cableTypes, deckHeights);
            setCurrentView(MainView.SCHEDULE);
            alert(`Imported ${newCables.length} cables.`);
        }
        setPendingFile(null);
    };

    // Render Content Switch
    const renderContent = () => {
        switch (currentView) {
            case MainView.DASHBOARD: return <DashboardView cables={cables} nodes={nodes} />;
            case MainView.SCHEDULE: return <CableList
                cables={cables}
                isLoading={isDataLoading || isRouting || isProcessing}
                onSelectCable={(c) => setSelectedCableId(c.id)}
                onCalculateRoute={calculateRoute}
                onCalculateAll={calculateAllRoutes}
                onCalculateSelected={calculateSelectedRoutes}
                onView3D={(c) => { setRoutePath(c.calculatedPath || []); setCurrentView(MainView.THREE_D); }}
                triggerImport={() => fileInputRef.current?.click()}
                onExport={handleExport}
                onUpdateCable={(c) => {
                    const nc = cables.map(x => x.id === c.id ? c : x);
                    setCables(nc); saveData(nc, nodes, cableTypes, deckHeights);
                    if (window.confirm("Reroute?")) calculateRoute(c);
                }}
                initialFilter={cableListFilter}
                selectedCableId={selectedCableId}
            />;
            case MainView.CABLE_TYPE: return <CableTypeManager data={cableTypes} />;
            case MainView.REPORT_NODE: return <NodeManager nodes={nodes} updateNodes={setNodes} />;
            case MainView.REPORT_BOM: return <CableRequirementReport cables={cables} onExport={handleExport} onCreatePOS={handleExport} />;
            case MainView.TRAY_ANALYSIS: return <TrayAnalysis cables={cables} nodes={nodes} />;
            case MainView.INSTALL_STATUS: return <InstallationStatusView cables={cables} />;
            case MainView.THREE_D: return <ThreeScene nodes={nodes} cables={cables} highlightPath={routePath} deckHeights={deckHeights} selectedCableId={selectedCableId} onClose={() => setCurrentView(MainView.SCHEDULE)} />;
            case MainView.GENERIC_GRID: return <GenericGrid data={genericData} title={genericTitle} />;
            case MainView.WD_EXTRACTION: return <WDExtractionView onApplyCables={(nc) => { setCables(nc); saveData(nc, nodes, cableTypes, deckHeights); setCurrentView(MainView.SCHEDULE); }} />;
            case MainView.USER_MGMT: return <PermissionGuard requireSuperAdmin><CableUserManagement /></PermissionGuard>;
            case MainView.PERMISSIONS: return <PermissionGuard requireSuperAdmin><CablePermissionEditor /></PermissionGuard>;
            case MainView.ADMIN_CONSOLE: return <PermissionGuard><CableAdminConsole /></PermissionGuard>;
            case 'HISTORY': return <HistoryViewer projectId={shipId} onRestore={(c, n, t) => { setCables(c); setNodes(n); setCableTypes(t); saveData(c, n, t, deckHeights); alert("Restored!"); }} />;
            case 'SETTINGS': return <Settings deckHeights={deckHeights} updateDeckHeight={(d, v) => setDeckHeights(prev => ({ ...prev, [d]: parseFloat(v) || 0 }))} />;

            // [FIX] 5-Point Integration
            case 'CABLE_GROUP': return <CableGroup cables={cables} />;
            case 'DRUM_SCHEDULE': return <DrumScheduleReport cables={cables} />;
            case 'TRAY_FILL': return <TrayFill cables={cables} nodes={nodes} selectedNode={selectedNode} onNodeSelect={setSelectedNode} />;

            // [DEV] Tools
            case 'DEV_DATA_HEALTH': return <DataVerification cables={cables} nodes={nodes} />;
            case 'DEV_PIVOT': return <PivotAnalyzer data={cables} title="Cable Data Pivot" />;
            case 'DEV_NODE_LEGACY': return <NodeListReport nodes={nodes} cables={cables} />;
            case 'DEV_3D_LEVEL': return <ThreeSceneEnhanced nodes={nodes} deckHeights={deckHeights} showLevelMap={true} />;

            default: return <div>Select View</div>;
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
                    {/* Ship Selector */}
                    <div className="flex items-center bg-seastar-800 rounded px-2 py-0.5 border border-seastar-600">
                        <Ship size={14} className="text-seastar-cyan mr-2" />
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
                                <span className="text-xs text-slate-400">프로젝트:</span>
                                <span className="text-xs font-bold text-white">{availableShips.find(s => s.id === shipId)?.name || shipId}</span>
                            </div>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user?.role === 'SUPER_ADMIN' ? 'bg-purple-600 text-purple-100' : 'bg-blue-600 text-blue-100'}`}>
                                {user?.role}
                            </div>
                        </div>
                    </div>
                    {/* Menu Bar Component */}
                    <MenuBar activeMenu={activeMenu} setActiveMenu={setActiveMenu} onAction={handleMenuAction} isSuperAdmin={isSuperAdmin} />
                </div>

                {/* Right Side Status */}
                <div className="flex items-center gap-4">
                    {isRouting && (
                        <div className="flex items-center gap-2 text-xs bg-seastar-800 px-3 py-1 rounded-full animate-pulse border border-yellow-500/30">
                            <Activity size={14} className="text-yellow-400" />
                            <span className="text-yellow-200 font-mono">Routing: {Math.round((routingProgress.current / (routingProgress.total || 1)) * 100)}%</span>
                        </div>
                    )}
                    <div className="text-xs text-gray-500 font-mono hidden md:block">Build: {DATA_VERSION}</div>
                    <div className="flex items-center gap-2 border-l border-seastar-700 pl-4 ml-2">
                        <div className="text-right hidden lg:block">
                            <div className="text-xs font-bold text-white">{user?.name}</div>
                        </div>
                        <button onClick={handleLogout} className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors"><X size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Content & Modals */}
            <div className="flex-1 overflow-hidden relative">
                {renderContent()}
                {showColumnMapper && <ColumnMapperModal excelHeaders={pendingExcelHeaders} excelData={pendingExcelData} onConfirm={handleMapperConfirm} onCancel={() => { setShowColumnMapper(false); setPendingFile(null); }} />}
                {showShipModal && (
                    <ShipSelectionModal
                        onClose={() => setShowShipModal(false)}
                        onLoadParsed={() => { loadProjectData('HK2401'); setShowShipModal(false); }}
                        onFileUpload={(files) => { handleFileChange({ target: { files } } as any); setShowShipModal(false); }}
                    />
                )}
            </div>

            {/* Hidden Input & Overlays */}
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
            {(isDataLoading || isProcessing) && <LoadingOverlay message={isProcessing ? "Processing..." : "Loading..."} />}
            {activeModal === 'TRAY_SPEC' && <SimpleModal title="Tray Spec" onClose={() => setActiveModal(null)}><TraySpecContent /></SimpleModal>}
        </div>
    );
};

const App: React.FC<AppProps> = (props) => (
    <CableAuthProvider>
        <AuthWrapper {...props} />
    </CableAuthProvider>
);

const AuthWrapper: React.FC<AppProps> = (props) => {
    const { isAuthenticated, loading, user } = useCableAuth();
    if (loading) return (
        <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <div className="text-sm font-medium animate-pulse">Initializing Secure Environment...</div>
        </div>
    );
    if (!isAuthenticated || !user) return <LandingPage onShipSelected={() => { }} />;
    return (
        <React.Suspense fallback={<LoadingOverlay message="Loading Module..." />}>
            <MainApp {...props} />
        </React.Suspense>
    );
};

export default App;