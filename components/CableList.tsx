import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Cable } from '../types';
import {
    Search, Save, Zap, List, Eye, FileSpreadsheet, Filter, FileText,
    FilePlus, FolderOpen, Trash2, ArrowDown, ArrowUp, Calculator, Pin, Printer, Folder,
    AlertTriangle, ChevronUp, ChevronDown, CheckSquare, X
} from 'lucide-react';

interface CableListProps {
    cables: Cable[];
    isLoading: boolean;
    onSelectCable: (cable: Cable) => void;
    onCalculateRoute: (cable: Cable) => void;
    onCalculateAll: () => void;
    onCalculateSelected: (selectedCables: Cable[]) => void;
    onView3D: (cable: Cable) => void;
    triggerImport: () => void;
    onExport: () => void;
    onUpdateCable?: (cable: Cable) => void;
    initialFilter?: 'missingLength' | 'unrouted' | null;
    selectedCableId?: string | null;
}

const ROW_HEIGHT = 28;
const VISIBLE_ROWS = 30;
const BUFFER_ROWS = 10;

const CableList: React.FC<CableListProps> = ({ cables, isLoading, onSelectCable, onCalculateRoute, onCalculateAll, onCalculateSelected, onView3D, triggerImport, onExport, initialFilter, onUpdateCable, selectedCableId }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [filterName, setFilterName] = useState('');
    const [showMissingLength, setShowMissingLength] = useState(false);
    const [showUnrouted, setShowUnrouted] = useState(false);

    // Dynamic Columns State
    const [dynamicColumns, setDynamicColumns] = useState<any[]>([]);

    // Raw Data Modal
    const [showRawDataModal, setShowRawDataModal] = useState(false);
    const [rawDataSource, setRawDataSource] = useState<Cable | null>(null);

    // Sorting
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const [isProcessing, setIsProcessing] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false); // Mobile Sidebar State

    // Stats
    const totalLength = useMemo(() => cables.reduce((sum, c) => sum + (c.calculatedLength || c.length || 0), 0), [cables]);
    const calculatedPaths = useMemo(() => cables.filter(c => c.calculatedPath).length, [cables]);

    const isInternalSelection = useRef(false);

    // Initialize/Update Columns based on Data
    useEffect(() => {
        if (cables.length > 0) {
            const firstCable = cables[0];
            // 1. Check if originalData exists (Dynamic Excel Import)
            if (firstCable.originalData && Object.keys(firstCable.originalData).length > 0) {
                const keys = Object.keys(firstCable.originalData);
                const cols = keys.map(key => ({
                    key: key,
                    label: key.toUpperCase().replace(/_/g, ' '),
                    width: 'w-32',
                    isDynamic: true
                }));

                // Add System Columns that might override or augment
                if (!keys.includes('length')) cols.push({ key: 'length', label: 'LENGTH', width: 'w-24', isDynamic: false });
                if (!keys.includes('path')) cols.push({ key: 'path', label: 'PATH', width: 'w-64', isDynamic: false });

                setDynamicColumns(cols);
            } else {
                // 2. Fallback to Fixed Default Columns
                setDynamicColumns([
                    { key: 'id', label: 'NO', width: 'w-10', align: 'center' },
                    { key: 'system', label: 'SYSTEM', width: 'w-20' },
                    { key: 'name', label: 'CABLE NAME', width: 'w-32', color: 'text-cyan-400 font-bold' },
                    { key: 'type', label: 'TYPE', width: 'w-24' },
                    { key: 'fromNode', label: 'FROM ND', width: 'w-24', bg: 'bg-blue-900/30' },
                    { key: 'toNode', label: 'TO ND', width: 'w-24', bg: 'bg-green-900/30' },
                    { key: 'length', label: 'LENGTH', width: 'w-24', align: 'right', color: 'text-yellow-400 font-mono font-bold' },
                    { key: 'path', label: 'PATH', width: 'w-64', color: 'text-green-400 font-mono text-[10px]' },
                ]);
            }
        }
    }, [cables]);

    useEffect(() => {
        if (!initialFilter) return;
        if (initialFilter === 'missingLength') setShowMissingLength(true);
        if (initialFilter === 'unrouted') setShowUnrouted(true);
    }, [initialFilter]);

    useEffect(() => {
        if (selectedCableId) {
            if (!isInternalSelection.current) {
                setSelectedIds(new Set([selectedCableId]));
                setLastSelectedId(selectedCableId);
            }
            isInternalSelection.current = false;
        }
    }, [selectedCableId]);

    const handleSort = (columnKey: string) => {
        if (sortColumn === columnKey) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnKey);
            setSortDirection('asc');
        }
    };

    const missingLengthCount = useMemo(() => cables.filter(c => !c.length || c.length === 0).length, [cables]);
    const unroutedCount = useMemo(() => cables.filter(c => !c.calculatedPath || c.calculatedPath.length === 0).length, [cables]);

    const selectedCable = useMemo(() => {
        if (selectedIds.size === 0) return null;
        const firstId = Array.from(selectedIds)[0];
        return cables.find(c => c.id === firstId) || null;
    }, [selectedIds, cables]);

    const handleToggleAll = (checked: boolean) => {
        if (checked) {
            const newSet = new Set(selectedIds);
            filteredCables.forEach(c => newSet.add(c.id));
            setSelectedIds(newSet);
        } else {
            const newSet = new Set(selectedIds);
            filteredCables.forEach(c => newSet.delete(c.id));
            setSelectedIds(newSet);
        }
    };

    const filteredCables = useMemo(() => {
        const searchTerm = filterName.toLowerCase();
        let result = cables.filter(c => {
            if (!searchTerm) return true;
            return Object.values(c).some(val =>
                String(val || '').toLowerCase().includes(searchTerm)
            );
        });
        if (showMissingLength) result = result.filter(c => !c.length || c.length === 0);
        if (showUnrouted) result = result.filter(c => !c.calculatedPath || c.calculatedPath.length === 0);

        if (sortColumn) {
            result = [...result].sort((a, b) => {
                const aVal = a.originalData ? a.originalData[sortColumn] : a[sortColumn]; // Prioritize original data for sorting
                const bVal = b.originalData ? b.originalData[sortColumn] : b[sortColumn];

                if (aVal == bVal) return 0;
                const valA = aVal || '';
                const valB = bVal || '';

                if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
                    return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
                }
                return sortDirection === 'asc'
                    ? String(valA).localeCompare(String(valB))
                    : String(valB).localeCompare(String(valA));
            });
        }
        return result;
    }, [cables, filterName, showMissingLength, sortColumn, sortDirection]);

    const handleCellChange = (id: string, field: string, value: any) => {
        if (!onUpdateCable) return;
        const cable = cables.find(c => c.id === id);
        if (!cable) return;

        // Update both standard prop and originalData prop to keep sync
        const newOriginal = cable.originalData ? { ...cable.originalData, [field]: value } : undefined;
        onUpdateCable({ ...cable, [field]: value, originalData: newOriginal });
    };

    const handleRowClick = (e: React.MouseEvent, cable: Cable, index: number) => {
        // 3D View is triggered by the Eye icon button ONLY (not row click)
        // This prevents accidental 3D navigation when selecting rows

        const id = cable.id;
        let newSet: Set<string>;

        if (e.ctrlKey || e.metaKey) {
            // Toggle
            newSet = new Set(selectedIds);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            setLastSelectedId(id);
        } else if (e.shiftKey && lastSelectedId) {

            // Range
            newSet = new Set(selectedIds); // Keep existing? No, usually shift click replaces except for range
            // Standard OS behavior: Shift+Click extends selection from anchor. 
            // Usually it clears others unless Ctrl is also held.
            // For simplicity here, we'll clear others to avoid "stuck" multi-select.
            newSet = new Set();

            const lastIndex = filteredCables.findIndex(c => c.id === lastSelectedId);
            const currentIndex = filteredCables.findIndex(c => c.id === id);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                for (let i = start; i <= end; i++) {
                    newSet.add(filteredCables[i].id);
                }
            } else {
                newSet.add(id);
            }
        } else {
            // Single Click -> STRICT RESET
            newSet = new Set();
            newSet.add(id);
            setLastSelectedId(id);
        }

        setSelectedIds(newSet);
        isInternalSelection.current = true;
        onSelectCable(cable);
    };

    // --- CLICK GUARD WRAPPER ---
    const safeHandler = (fn: Function) => async (...args: any[]) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await fn(...args);
        } catch (e) {
            console.error("Action failed:", e);
        } finally {
            setTimeout(() => setIsProcessing(false), 300);
        }
    };

    const IconBtn = ({ icon: Icon, label, onClick, color = "text-gray-400", disabled }: any) => (
        <button
            onClick={onClick ? safeHandler(onClick) : undefined}
            disabled={disabled || isProcessing}
            className={`flex flex-col items-center justify-center px-2 py-1 rounded transition-colors group ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700'}`}
            title={label}
        >
            <Icon size={16} className={`${disabled || isProcessing ? 'text-gray-600' : color} ${(!disabled && !isProcessing) && 'group-hover:text-white'} transition-colors`} />
        </button>
    );

    const Divider = () => <div className="w-px h-5 bg-slate-600 mx-1"></div>;

    const getDisplayValue = (cable: Cable, col: any) => {
        if (col.isDynamic && cable.originalData) {
            return cable.originalData[col.key] || cable[col.key]; // Fallback to root prop
        }
        return cable[col.key];
    };

    return (
        <div className="flex flex-col h-full font-sans text-gray-200">

            {/* --- TOP TOOLBAR --- */}
            <div className="h-10 border-b border-slate-700 flex items-center px-2 shadow-md bg-slate-900/80 backdrop-blur select-none z-20">
                <button
                    onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                    className="lg:hidden p-1.5 hover:bg-slate-700 rounded mr-1 text-slate-400"
                >
                    <List size={18} />
                </button>
                <div className="hidden md:flex items-center">
                    <IconBtn icon={FilePlus} label="New" color="text-yellow-500" disabled={false} />
                    <IconBtn icon={FolderOpen} label="Open Excel" onClick={triggerImport} color="text-yellow-500" />
                    <IconBtn icon={FolderOpen} label="LOAD DATA" color="text-yellow-400" onClick={() => {
                        const sid = localStorage.getItem('SEASTAR_CURRENT_SHIP');
                        if (sid) onCalculateSelected([]); // Dummy call to trigger re-render or status
                        window.location.reload(); // Temporary force reload to trigger useProjectData effect
                    }} />
                    <Divider />
                    <IconBtn icon={Upload} label="Open Excel" color="text-cyan-400" onClick={triggerImport} />
                    <Divider />
                </div>
                <IconBtn icon={Search} label="Search" />
                <Divider />

                {/* ROUTE ALL BUTTON */}
                <button
                    onClick={safeHandler(onCalculateAll)}
                    disabled={isProcessing}
                    className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white rounded mx-1 shadow-lg shadow-blue-900/50 transition-all border ${isProcessing ? 'bg-gray-600 border-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 border-blue-400'}`}
                >
                    {isProcessing ? <span className="animate-spin">⏳</span> : <Calculator size={14} />}
                    {isProcessing ? 'PROCESSING...' : 'ROUTE ALL'}
                </button>

                {/* ROUTE SELECTED BUTTON (NEW) */}
                <button
                    onClick={safeHandler(() => onCalculateSelected(filteredCables.filter(c => selectedIds.has(c.id))))}
                    disabled={isProcessing || selectedIds.size === 0}
                    className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white rounded mx-1 shadow-lg transition-all border 
                    ${isProcessing || selectedIds.size === 0
                            ? 'bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-500 border-green-400 shadow-green-900/50'}`}
                >
                    <CheckSquare size={14} />
                    ROUTE SELECTED ({selectedIds.size})
                </button>

                {/* LOAD DATA BUTTON (NEW) */}
                <button
                    onClick={safeHandler(() => triggerImport())}
                    className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white rounded mx-1 shadow-lg bg-cyan-600 hover:bg-cyan-500 border border-cyan-400 transition-all"
                >
                    <FolderOpen size={14} />
                    LOAD DATA
                </button>

                <div className="flex-1"></div>

                <div className="hidden sm:flex items-center gap-2 mr-2">
                    <div className="bg-slate-800 border border-slate-600 px-3 py-0.5 rounded text-[10px] text-cyan-400 font-mono">
                        TOTAL: <span className="text-white font-bold">{cables.length}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* LEFT SIDEBAR (Cable Group Tree) */}
                <div className={`
                    absolute lg:relative z-40 h-full w-64 lg:w-56 bg-[#0f172a]/95 border-r border-slate-700 flex flex-col shadow-inner transition-transform duration-300
                    ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    <div className="p-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Search Cables</div>
                        <button onClick={() => setMobileSidebarOpen(false)} className="lg:hidden text-slate-500"><X size={16} /></button>
                    </div>
                    <input
                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none transition-colors"
                        value={filterName}
                        onChange={e => setFilterName(e.target.value)}
                        placeholder="Type to filter..."
                    />
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <button
                        onClick={selectedCable ? safeHandler(() => onView3D(selectedCable)) : undefined}
                        className={`w-full mb-3 text-xs font-bold py-2 rounded shadow-lg flex items-center justify-center gap-2 transition-all ${selectedCable && !isProcessing ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 ring-1 ring-cyan-400' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}
                        disabled={!selectedCable || isProcessing}
                    >
                        <Eye size={14} /> 3D ROUTE VIEW
                    </button>
                    <div className="text-[10px] uppercase font-bold text-slate-500 mt-4 mb-2 px-2">Filters</div>
                    <button
                        onClick={() => setShowMissingLength(!showMissingLength)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded transition-colors ${showMissingLength ? 'bg-red-900/50 text-red-200 border border-red-500' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                        <span className="flex items-center gap-2"><AlertTriangle size={12} /> Missing Length</span>
                        {missingLengthCount > 0 && <span className="text-[10px] bg-red-600 text-white px-1.5 rounded-full">{missingLengthCount}</span>}
                    </button>
                    <button
                        onClick={() => setShowUnrouted(!showUnrouted)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded transition-colors ${showUnrouted ? 'bg-purple-900/50 text-purple-200 border border-purple-500' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                        <span className="flex items-center gap-2"><Zap size={12} /> Unrouted</span>
                        {unroutedCount > 0 && <span className="text-[10px] bg-purple-600 text-white px-1.5 rounded-full">{unroutedCount}</span>}
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col bg-slate-900/50 overflow-hidden relative">
                {/* DETAIL PANEL - FORM LAYOUT */}
                <div className="bg-slate-800 border-b border-slate-600 p-3 md:p-4 shadow-lg z-10 shrink-0 overflow-y-auto max-h-[40vh] md:max-h-none">
                    {selectedCable ? (
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* COL 1: Basic Info */}
                            <div className="w-full lg:w-1/5 space-y-2">
                                <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                                    <div className="text-[10px] text-slate-400 font-bold mb-1">CABLE NAME</div>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm font-bold text-white focus:border-cyan-500 outline-none"
                                        value={selectedCable.name}
                                        readOnly title="Cable Name"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-bold mb-1">TYPE</div>
                                        <input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-cyan-300" value={selectedCable.type} readOnly title="Type" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-bold mb-1">SYSTEM</div>
                                        <input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-yellow-500" value={selectedCable.system} readOnly title="System" />
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-400 font-bold mb-1">SUPPLY DK</div>
                                    <input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" value={selectedCable.supplyDeck || ''} onChange={e => handleCellChange(selectedCable.id, 'supplyDeck', e.target.value)} title="Supply Deck" />
                                </div>
                                <div className="flex gap-2">
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-bold mb-1">LENGTH</div>
                                        <div className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm font-mono font-bold text-yellow-400 text-right">
                                            {selectedCable.length || 0}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-bold mb-1">WEIGHT</div>
                                        <div className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm font-mono text-slate-300 text-right">
                                            {selectedCable.weight || 0}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COL 2: From / To */}
                            <div className="flex-1 grid grid-cols-2 gap-4 bg-slate-900/30 p-2 rounded border border-slate-700/50">
                                {/* FROM SECTION */}
                                <div className="space-y-1">
                                    <div className="text-[11px] font-bold text-blue-400 border-b border-blue-900/50 mb-2">FROM</div>
                                    <div className="flex gap-2 items-center">
                                        <span className="w-10 text-[10px] text-slate-500 font-bold">DECK</span>
                                        <input className="flex-1 bg-slate-900 border border-slate-700 text-xs px-2 py-1 rounded" value={selectedCable.fromDeck || ''} onChange={e => handleCellChange(selectedCable.id, 'fromDeck', e.target.value)} title="From Deck" />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="w-10 text-[10px] text-slate-500 font-bold">NODE</span>
                                        <input className="w-16 bg-slate-900 border border-slate-700 text-xs px-2 py-1 rounded font-bold text-white" value={selectedCable.fromNode} readOnly title="From Node" />
                                        <span className="text-[10px] text-slate-500 font-bold ml-1">REST</span>
                                        <input className="w-12 bg-slate-900 border border-slate-700 text-xs px-2 py-1 rounded text-right" value={selectedCable.fromRest || ''} onChange={e => handleCellChange(selectedCable.id, 'fromRest', e.target.value)} title="From Rest" />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="w-10 text-[10px] text-slate-500 font-bold">EQUIP</span>
                                        <input className="flex-1 bg-slate-900 border border-slate-700 text-xs px-2 py-1 rounded" value={selectedCable.fromEquip || ''} onChange={e => handleCellChange(selectedCable.id, 'fromEquip', e.target.value)} title="From Equipment" />
                                    </div>
                                </div>

                                {/* TO SECTION */}
                                <div className="space-y-1">
                                    <div className="text-[11px] font-bold text-green-400 border-b border-green-900/50 mb-2">TO</div>
                                    <div className="flex gap-2 items-center">
                                        <span className="w-10 text-[10px] text-slate-500 font-bold">DECK</span>
                                        <input className="flex-1 bg-slate-900 border border-slate-700 text-xs px-2 py-1 rounded" value={selectedCable.toDeck || ''} onChange={e => handleCellChange(selectedCable.id, 'toDeck', e.target.value)} title="To Deck" />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="w-10 text-[10px] text-slate-500 font-bold">NODE</span>
                                        <input className="w-16 bg-slate-900 border border-slate-700 text-xs px-2 py-1 rounded font-bold text-white" value={selectedCable.toNode} readOnly title="To Node" />
                                        <span className="text-[10px] text-slate-500 font-bold ml-1">REST</span>
                                        <input className="w-12 bg-slate-900 border border-slate-700 text-xs px-2 py-1 rounded text-right" value={selectedCable.toRest || ''} onChange={e => handleCellChange(selectedCable.id, 'toRest', e.target.value)} title="To Rest" />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="w-10 text-[10px] text-slate-500 font-bold">EQUIP</span>
                                        <input className="flex-1 bg-slate-900 border border-slate-700 text-xs px-2 py-1 rounded" value={selectedCable.toEquip || ''} onChange={e => handleCellChange(selectedCable.id, 'toEquip', e.target.value)} title="To Equipment" />
                                    </div>
                                </div>
                            </div>

                            {/* COL 3: Routing & Check */}
                            <div className="w-1/4 flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <div className="text-[10px] text-slate-400 font-bold mb-1">CHECK NODE</div>
                                        <input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-yellow-300" value={selectedCable.checkNode || ''} onChange={e => handleCellChange(selectedCable.id, 'checkNode', e.target.value)} title="Check Node" />
                                    </div>
                                    <div className="w-20 flex items-end">
                                        <button
                                            onClick={safeHandler(() => onCalculateRoute(selectedCable))}
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded text-xs shadow-lg transition-colors border border-blue-400"
                                        >
                                            ROUTE
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 overflow-hidden flex flex-col">
                                    <div className="text-[9px] text-slate-500 font-bold mb-1">PATH RESULT</div>
                                    <div className="flex-1 text-[11px] font-mono text-green-400 leading-snug break-all overflow-y-auto custom-scrollbar p-1 bg-slate-950 rounded">
                                        {selectedCable.path || selectedCable.calculatedPath?.join(' → ') || 'No Path'}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] text-slate-400 font-bold mb-1">REV. COMMENT</div>
                                    <input className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" value={selectedCable.revComment || ''} onChange={e => handleCellChange(selectedCable.id, 'revComment', e.target.value)} title="Revision Comment" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-48 text-slate-500 text-sm italic border-2 border-dashed border-slate-700 rounded-lg">
                            Select a cable from the list to view details
                        </div>
                    )}
                </div>

                {/* TABLE */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-auto custom-scrollbar bg-transparent"
                    onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
                >
                    <div
                        className="relative"
                        style={{ height: `${filteredCables.length * ROW_HEIGHT + 32}px` }}
                    >
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead className="sticky top-0 z-10 text-[11px]">
                                <tr className="bg-gradient-to-br from-blue-800 to-blue-500">
                                    <th className="px-2 py-2 w-8 font-bold text-center border-r border-blue-500 text-white shadow-lg">
                                        <input
                                            type="checkbox"
                                            title="Select All"
                                            checked={filteredCables.length > 0 && filteredCables.every(c => selectedIds.has(c.id))}
                                            onChange={(e) => handleToggleAll(e.target.checked)}
                                            className="cursor-pointer"
                                        />
                                    </th>
                                    {dynamicColumns.map(col => (
                                        <th
                                            key={col.key}
                                            className={`px-2 py-2 font-bold text-white border-r border-blue-500 whitespace-nowrap ${col.width || 'w-24'} text-center cursor-pointer select-none hover:bg-blue-600 transition-colors shadow-sm`}
                                            onClick={() => handleSort(col.key)}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                {col.label}
                                                {sortColumn === col.key && (
                                                    sortDirection === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-2 w-10 text-center font-bold text-white">VIEW</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
                                    const endIdx = Math.min(filteredCables.length, startIdx + VISIBLE_ROWS + BUFFER_ROWS * 2);
                                    const visibleCables = filteredCables.slice(startIdx, endIdx);

                                    return (
                                        <>
                                            {startIdx > 0 && <tr style={{ height: startIdx * ROW_HEIGHT }}><td colSpan={dynamicColumns.length + 2}></td></tr>}
                                            {visibleCables.map((cable, localIdx) => {
                                                const idx = startIdx + localIdx;
                                                const isSelected = selectedIds.has(cable.id);
                                                return (
                                                    <tr
                                                        key={cable.id}
                                                        onClick={(e) => handleRowClick(e, cable, idx)}
                                                        style={{ height: ROW_HEIGHT }}
                                                        className={`cursor-pointer text-[12px] transition-colors border-b border-slate-800 ${isSelected
                                                            ? 'bg-blue-600/40 text-white hover:bg-blue-600/50'
                                                            : 'text-slate-300 hover:bg-slate-800 odd:bg-slate-900/40 even:bg-slate-900/80'
                                                            }`}
                                                    >
                                                        <td className="px-2 text-center border-r border-slate-700/50">
                                                            <input
                                                                type="checkbox"
                                                                title="Select Row"
                                                                checked={isSelected}
                                                                onChange={() => { /* Handled by Row Click */ }}
                                                                className="cursor-pointer bg-slate-700 border-none"
                                                            />
                                                        </td>
                                                        {dynamicColumns.map(col => (
                                                            <td key={`${cable.id}-${col.key}`} className={`px-2 border-r border-slate-700/50 whitespace-nowrap overflow-hidden text-ellipsis ${!isSelected && col.bg ? col.bg : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                                                                <input
                                                                    type="text"
                                                                    className={`w-full bg-transparent border-none p-0 text-inherit focus:ring-0 cursor-pointer ${col.color || ''}`}
                                                                    value={getDisplayValue(cable, col) || ''}
                                                                    onChange={(e) => handleCellChange(cable.id, col.key, e.target.value)}
                                                                    readOnly={col.key === 'id' || col.key === 'length' || col.key === 'path' || col.isDynamic}
                                                                    title={getDisplayValue(cable, col) || ''}
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="px-2 text-center">
                                                            <button onClick={(e) => { e.stopPropagation(); onView3D(cable); }} className={`hover:text-cyan-400 ${isSelected ? 'text-white' : 'text-slate-600'}`} title="View 3D Route" aria-label="View 3D Route">
                                                                <Eye size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {endIdx < filteredCables.length && <tr style={{ height: (filteredCables.length - endIdx) * ROW_HEIGHT }}><td colSpan={dynamicColumns.length + 2}></td></tr>}
                                        </>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* BOTTOM STATUS BAR */}
            <div className="h-6 bg-slate-900/80 backdrop-blur border-t border-slate-700 flex justify-between items-center px-4 text-[10px] text-slate-500">
                <div>SEASTAR CABLE MANAGER V2.0 (Verified: 2026-01-14)</div>
                <div>Status: <span className="text-green-500">Connected</span> • System Ready</div>
            </div>
        </div>
    );
};

export default CableList;