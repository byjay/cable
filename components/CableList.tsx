import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Cable } from '../types';
import {
    Search, Save, Zap, List, Eye, FileSpreadsheet, Filter, FileText,
    FilePlus, FolderOpen, Trash2, ArrowDown, ArrowUp, Calculator, Pin, Printer, Folder,
    AlertTriangle, ChevronUp, ChevronDown
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

const ROW_HEIGHT = 28; // Increased slightly for readability in dark mode
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

    // Raw Data Modal
    const [showRawDataModal, setShowRawDataModal] = useState(false);
    const [rawDataSource, setRawDataSource] = useState<Cable | null>(null);

    // Sorting
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Click Guard - 동시 클릭 방지
    const [isProcessing, setIsProcessing] = useState(false);

    // Stats
    const totalLength = useMemo(() => cables.reduce((sum, c) => sum + (c.calculatedLength || c.length || 0), 0), [cables]);
    const calculatedPaths = useMemo(() => cables.filter(c => c.calculatedPath).length, [cables]);

    const isInternalSelection = useRef(false);

    useEffect(() => {
        if (!initialFilter) return;
        if (initialFilter === 'missingLength') setShowMissingLength(true);
        if (initialFilter === 'unrouted') setShowUnrouted(true);
    }, [initialFilter]);

    useEffect(() => {
        if (selectedCableId) {
            // Only update if it's NOT an internal selection (prevents wiping multi-select on row click)
            if (!isInternalSelection.current) {
                setSelectedIds(new Set([selectedCableId]));
                setLastSelectedId(selectedCableId);
            }
            // Reset the flag for the next cycle
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

    const missingLengthCount = useMemo(() =>
        cables.filter(c => !c.length || c.length === 0).length,
        [cables]);

    const unroutedCount = useMemo(() =>
        cables.filter(c => !c.calculatedPath || c.calculatedPath.length === 0).length,
        [cables]);

    const selectedCable = useMemo(() => {
        if (selectedIds.size === 0) return null;
        const firstId = Array.from(selectedIds)[0];
        return cables.find(c => c.id === firstId) || null;
    }, [selectedIds, cables]);

    const getSelectedCables = (): Cable[] => {
        return cables.filter(c => selectedIds.has(c.id));
    };

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

    // Columns - Styled for Dark Theme (Matches 라우팅.html headers)
    const FIXED_COLUMNS = [
        { key: 'id', label: 'NO', width: 'w-10', align: 'center' },
        { key: 'system', label: 'SYSTEM', width: 'w-20' },
        { key: 'page', label: 'PAGE', width: 'w-16', align: 'center' },
        { key: 'name', label: 'CABLE NAME', width: 'w-32', color: 'text-cyan-400 font-bold' },
        { key: 'type', label: 'TYPE', width: 'w-24' },
        { key: 'fromRoom', label: 'FROM RM', width: 'w-24', bg: 'bg-blue-900/30' },
        { key: 'fromEquip', label: 'FROM EQ', width: 'w-32', bg: 'bg-blue-900/30' },
        { key: 'fromNode', label: 'FROM ND', width: 'w-24', bg: 'bg-blue-900/30' },
        { key: 'toRoom', label: 'TO ROOM', width: 'w-24', bg: 'bg-green-900/30' },
        { key: 'toEquip', label: 'TO EQ', width: 'w-32', bg: 'bg-green-900/30' },
        { key: 'toNode', label: 'TO ND', width: 'w-24', bg: 'bg-green-900/30' },
        { key: 'length', label: 'LENGTH', width: 'w-24', align: 'right', color: 'text-yellow-400 font-mono font-bold' },
        { key: 'path', label: 'PATH', width: 'w-64', color: 'text-green-400 font-mono text-[10px]' },
        { key: 'od', label: 'DIA', width: 'w-16', align: 'right' },
        { key: 'checkNode', label: 'CHECK NODE', width: 'w-24' },
        { key: 'remark', label: 'REMARK', width: 'w-32' },
    ];

    const filteredCables = useMemo(() => {
        const searchTerm = filterName.toLowerCase();
        let result = cables.filter(c => {
            if (!searchTerm) return true;
            return Object.values(c).some(val =>
                String(val || '').toLowerCase().includes(searchTerm)
            );
        });
        if (showMissingLength) {
            result = result.filter(c => !c.length || c.length === 0);
        }
        if (showUnrouted) {
            result = result.filter(c => !c.calculatedPath || c.calculatedPath.length === 0);
        }
        if (sortColumn) {
            result = [...result].sort((a, b) => {
                const aVal = a[sortColumn] ?? '';
                const bVal = b[sortColumn] ?? '';
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                }
                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();
                if (sortDirection === 'asc') return aStr.localeCompare(bStr);
                return bStr.localeCompare(aStr);
            });
        }
        return result;
    }, [cables, filterName, showMissingLength, sortColumn, sortDirection]);

    const handleCellChange = (id: string, field: string, value: any) => {
        if (!onUpdateCable) return;
        const cable = cables.find(c => c.id === id);
        if (!cable) return;
        const oldValue = cable[field];
        if (oldValue == value) return;

        const today = new Date().toISOString().split('T')[0];
        const user = "ADMIN";
        const changeLog = `${today} [${user}] ${field}: ${oldValue} -> ${value}`;
        const newRevComment = cable.revComment ? `${cable.revComment}\n${changeLog}` : changeLog;

        onUpdateCable({ ...cable, [field]: value, revComment: newRevComment });
    };

    const handleRowClick = (e: React.MouseEvent, cable: Cable, index: number) => {
        // 3D View Integration: Trigger highlighting if available
        if (onView3D) {
            onView3D(cable);
        }

        const id = cable.id;
        let newSet = new Set(selectedIds);

        if (e.ctrlKey || e.metaKey) {
            // Toggle selection
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            setLastSelectedId(id);
        } else if (e.shiftKey && lastSelectedId) {
            // Range selection
            const lastIndex = filteredCables.findIndex(c => c.id === lastSelectedId);
            if (lastIndex !== -1) {
                const start = Math.min(lastIndex, index);
                const end = Math.max(lastIndex, index);

                newSet = new Set(); // Clear others for pure Shift-Select
                for (let i = start; i <= end; i++) {
                    if (filteredCables[i]) newSet.add(filteredCables[i].id);
                }
            }
        } else {
            // Single select
            newSet = new Set();
            newSet.add(id);
            setLastSelectedId(id);
        }

        setSelectedIds(newSet);
        isInternalSelection.current = true;
        onSelectCable(cable);
    };

    const handleViewRawData = (cable: Cable) => {
        setRawDataSource(cable);
        setShowRawDataModal(true);
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
            // Add slight delay to prevent instant re-click
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

    // --- DARK THEME STYLES (MATCHES 라우팅.html) ---
    // Background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%)
    // Headers: linear-gradient(135deg, #1e40af, #3b82f6)
    // Table Rows: Dark with hover

    return (
        <div className="flex flex-col h-full font-sans text-gray-200">

            {/* --- TOP TOOLBAR --- */}
            <div className="h-10 border-b border-slate-700 flex items-center px-2 shadow-md bg-slate-900/80 backdrop-blur select-none z-20">
                <IconBtn icon={FilePlus} label="New" color="text-yellow-500" disabled={false} />
                <IconBtn icon={FolderOpen} label="Open Excel" onClick={triggerImport} color="text-yellow-500" />
                <IconBtn icon={Save} label="Save" color="text-blue-500" onClick={onExport} />
                <Divider />
                <IconBtn icon={Search} label="Search" />
                <Divider />
                <button
                    onClick={safeHandler(onCalculateAll)}
                    disabled={isProcessing}
                    className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white rounded mx-1 shadow-lg shadow-blue-900/50 transition-all border ${isProcessing ? 'bg-gray-600 border-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 border-blue-400'}`}
                >
                    {isProcessing ? (
                        <span className="animate-spin">⏳</span>
                    ) : (
                        <Calculator size={14} />
                    )}
                    {isProcessing ? 'PROCESSING...' : 'ROUTE ALL'}
                </button>
                <div className="flex-1"></div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 mr-2">
                    <div className="bg-slate-800 border border-slate-600 px-3 py-0.5 rounded text-[10px] text-cyan-400 font-mono">
                        TOTAL: <span className="text-white font-bold">{cables.length}</span>
                    </div>
                    <div className="bg-slate-800 border border-slate-600 px-3 py-0.5 rounded text-[10px] text-yellow-400 font-mono">
                        LENGTH: <span className="text-white font-bold">{totalLength.toFixed(0)}m</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* --- LEFT SIDEBAR (Cable Group Tree) --- */}
                <div className="w-56 bg-[#0f172a]/95 border-r border-slate-700 flex flex-col shadow-inner">
                    <div className="p-3 border-b border-slate-700 bg-slate-800/50">
                        <div className="text-[11px] font-bold text-slate-400 mb-1">SEARCH CABLES</div>
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

                {/* --- MAIN CONTENT --- */}
                <div className="flex-1 flex flex-col bg-slate-900/50 overflow-hidden relative">
                    {/* --- DETAIL PANEL (Top of Grid) --- */}
                    <div className="bg-slate-800/90 border-b border-slate-600 p-3 min-h-[140px] shadow-lg z-10">
                        {selectedCable ? (
                            <div className="flex gap-6 h-full">
                                <div className="w-1/4 flex flex-col gap-1.5">
                                    <div className="text-[10px] text-cyan-400 font-bold tracking-wider">SELECTED CABLE</div>
                                    <div className="text-lg font-bold text-white tracking-wide">{selectedCable.name}</div>
                                    <div className="flex gap-2 text-xs">
                                        <div className="bg-slate-900 px-2 py-0.5 rounded border border-slate-600">{selectedCable.type}</div>
                                        <div className="bg-slate-900 px-2 py-0.5 rounded border border-slate-600 text-yellow-500">{selectedCable.system}</div>
                                    </div>
                                    <div className="mt-auto text-[10px] text-slate-400">{selectedCable.id}</div>
                                </div>
                                <div className="flex-1 flex items-center gap-4 bg-slate-900/50 rounded-lg p-2 border border-slate-700/50">
                                    <div className="flex-1 flex flex-col items-center">
                                        <div className="text-[10px] text-blue-400 font-bold mb-1">FROM</div>
                                        <div className="text-sm font-bold text-white">{selectedCable.fromNode}</div>
                                        <div className="text-[10px] text-slate-400">{selectedCable.fromRoom || '-'}</div>
                                    </div>
                                    <div className="text-slate-600">→</div>
                                    <div className="flex-1 flex flex-col items-center">
                                        <div className="text-[10px] text-green-400 font-bold mb-1">TO</div>
                                        <div className="text-sm font-bold text-white">{selectedCable.toNode}</div>
                                        <div className="text-[10px] text-slate-400">{selectedCable.toRoom || '-'}</div>
                                    </div>
                                </div>
                                <div className="w-1/3 flex flex-col gap-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-[10px] font-bold text-slate-400 w-16">CHECK ND</span>
                                        <input
                                            className="flex-1 bg-slate-900 border border-slate-600 text-xs text-white px-2 py-1 rounded focus:border-cyan-500 outline-none"
                                            value={selectedCable.checkNode || ''}
                                            onChange={(e) => handleCellChange(selectedCable.id, 'checkNode', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 overflow-hidden">
                                        <div className="text-[9px] text-slate-500 font-bold mb-0.5">PATH RESULT</div>
                                        <div className="text-[10px] font-mono text-green-400 leading-tight break-all h-full overflow-y-auto custom-scrollbar">
                                            {selectedCable.path || selectedCable.calculatedPath?.join(' → ') || 'No Path Calculated'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">
                                Select a cable to view details
                            </div>
                        )}
                    </div>

                    {/* --- TABLE --- */}
                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-auto custom-scrollbar bg-transparent"
                        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
                    >
                        <div style={{ height: filteredCables.length * ROW_HEIGHT + 32, position: 'relative' }}>
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead className="sticky top-0 z-10 text-[11px]">
                                    <tr style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }}>
                                        <th className="px-2 py-2 w-8 font-bold text-center border-r border-blue-500 text-white shadow-lg">
                                            <input
                                                type="checkbox"
                                                title="Select All"
                                                checked={filteredCables.length > 0 && filteredCables.every(c => selectedIds.has(c.id))}
                                                onChange={(e) => handleToggleAll(e.target.checked)}
                                                className="cursor-pointer"
                                            />
                                        </th>
                                        {FIXED_COLUMNS.map(col => (
                                            <th
                                                key={col.key}
                                                className={`px-2 py-2 font-bold text-white border-r border-blue-500 whitespace-nowrap ${col.width} text-center cursor-pointer select-none hover:bg-blue-600 transition-colors shadow-sm`}
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
                                                {startIdx > 0 && <tr style={{ height: startIdx * ROW_HEIGHT }}><td colSpan={FIXED_COLUMNS.length + 2}></td></tr>}
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
                                                                    onChange={() => { }}
                                                                    className="cursor-pointer bg-slate-700 border-none"
                                                                />
                                                            </td>
                                                            {FIXED_COLUMNS.map(col => (
                                                                <td key={`${cable.id}-${col.key}`} className={`px-2 border-r border-slate-700/50 whitespace-nowrap overflow-hidden text-ellipsis ${!isSelected && col.bg ? col.bg : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                                                                    <input
                                                                        type="text"
                                                                        className={`w-full bg-transparent border-none p-0 text-inherit focus:ring-0 cursor-pointer ${col.color || ''}`}
                                                                        value={cable[col.key] || ''}
                                                                        onChange={(e) => handleCellChange(cable.id, col.key, e.target.value)}
                                                                        readOnly={col.key === 'id' || col.key === 'length' || col.key === 'path'}
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
                                                {endIdx < filteredCables.length && <tr style={{ height: (filteredCables.length - endIdx) * ROW_HEIGHT }}><td colSpan={FIXED_COLUMNS.length + 2}></td></tr>}
                                            </>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- BOTTOM STATUS BAR --- */}
            <div className="h-6 bg-slate-900/80 backdrop-blur border-t border-slate-700 flex justify-between items-center px-4 text-[10px] text-slate-500">
                <div>SEASTAR CABLE MANAGER V6.2 (Verified: 2026-01-14 07:50)</div>
                <div>Status: <span className="text-green-500">Connected</span> • System Ready</div>
            </div>
        </div>
    );
};

export default CableList;