import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Cable, Node, NodeFillData, SystemResult, CableData } from '../types';
import { Search, Route, Play, ChevronLeft, ChevronRight, RefreshCw, Layers } from 'lucide-react';
import TrayVisualizer from './TrayVisualizer';
import { solveSystem, solveSystemAtWidth } from '../services/traySolverEnhanced';
import { EnhancedRoutingService } from '../services/EnhancedRoutingService';

interface TrayAnalysisProps {
    cables: Cable[];
    nodes: Node[];
}

const TrayAnalysis: React.FC<TrayAnalysisProps> = ({ cables, nodes }) => {
    // Selection State
    const [selectedNode, setSelectedNode] = useState<NodeFillData | null>(null);
    const [filterDeck, setFilterDeck] = useState('ALL');
    const [searchText, setSearchText] = useState('');
    const [solverResult, setSolverResult] = useState<SystemResult | null>(null);
    const [routingService, setRoutingService] = useState<EnhancedRoutingService | null>(null);
    const [showRouting, setShowRouting] = useState(false);
    const [routeWaypoints, setRouteWaypoints] = useState('');

    // FILL Configuration State
    const [numberOfTiers, setNumberOfTiers] = useState(1);
    const [maxHeightLimit, setMaxHeightLimit] = useState(60);
    const [fillRatioLimit, setFillRatioLimit] = useState(40);
    const [manualWidth, setManualWidth] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // CACHE for solver results
    const solverCache = useRef<Map<string, SystemResult>>(new Map());

    // Initialize routing service
    useEffect(() => {
        if (nodes.length > 0) {
            setRoutingService(new EnhancedRoutingService(nodes));
        }
    }, [nodes]);

    // Calculate fill ratio for each node (Quick Check for List)
    const nodeAnalysis = useMemo(() => {
        const nodeMap = new Map<string, Node>();
        nodes.forEach(n => nodeMap.set(n.name, n));

        const nodeCableIds = new Map<string, string[]>();

        cables.forEach(c => {
            const path = c.calculatedPath || c.path?.split(',') || [];
            path.forEach(nName => {
                const cleanName = nName.trim();
                if (nodeMap.has(cleanName)) {
                    if (!nodeCableIds.has(cleanName)) nodeCableIds.set(cleanName, []);
                    nodeCableIds.get(cleanName)!.push(c.id);
                }
            });
        });

        const results: NodeFillData[] = [];

        nodeMap.forEach((node, nodeName) => {
            const cableIds = nodeCableIds.get(nodeName) || [];
            if (node.type !== 'Tray' && cableIds.length === 0) return;

            const trayWidth = node.areaSize || 300;
            const trayCapacity = trayWidth * 60;

            results.push({
                nodeName,
                trayWidth,
                trayCapacity,
                cableCount: cableIds.length,
                totalCableArea: 0,
                fillRatio: 0,
                isOverfilled: false,
                cables: cableIds
            });
        });

        return results;
    }, [cables, nodes]);

    // Derived: Unique Decks
    const uniqueDecks = useMemo(() => {
        const decks = new Set(nodes.map(n => n.deck || 'Unknown'));
        return ['ALL', ...Array.from(decks).sort()];
    }, [nodes]);

    // Filtering
    const filteredNodes = useMemo(() => {
        return nodeAnalysis.filter(n => {
            const node = nodes.find(orig => orig.name === n.nodeName);
            const deck = node?.deck || 'Unknown';
            const matchesDeck = filterDeck === 'ALL' || deck === filterDeck;
            const matchesSearch = n.nodeName.toLowerCase().includes(searchText.toLowerCase());
            return matchesDeck && matchesSearch;
        }).sort((a, b) => b.cableCount - a.cableCount);
    }, [nodeAnalysis, filterDeck, searchText, nodes]);

    // Get cables that pass through the selected node with valid OD
    const selectedCables = useMemo(() => {
        if (!selectedNode) return [];
        return cables
            .filter(c => {
                const hasId = selectedNode.cables.includes(c.id);
                const odValue = c.od || (c as any).CABLE_OUTDIA || (c as any).OUT_DIA || 0;
                return hasId && odValue > 0;
            })
            .sort((a, b) => {
                // 1. System
                const sysA = a.system || '';
                const sysB = b.system || '';
                if (sysA !== sysB) return sysA.localeCompare(sysB);
                // 2. OD (Desc)
                const odA = a.od || 0;
                const odB = b.od || 0;
                if (odA !== odB) return odB - odA;
                // 3. From Node
                const nodeA = a.fromNode || '';
                const nodeB = b.fromNode || '';
                return nodeA.localeCompare(nodeB);
            });
    }, [selectedNode, cables]);

    // Convert to solver format
    const solverData = useMemo((): CableData[] => {
        return selectedCables.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            od: c.od || (c as any).CABLE_OUTDIA || 10,
            system: c.system,
            fromNode: c.fromNode,
            toNode: c.toNode,
            checkNode: c.checkNode,
            calculatedPath: c.calculatedPath,
            color: undefined
        }));
    }, [selectedCables]);

    // Generate cache key
    const getCacheKey = (nodeName: string, tiers: number, height: number, fill: number, width: number | null) => {
        return `${nodeName}_${tiers}_${height}_${fill}_${width || 'auto'}`;
    };

    // Calculate function with caching
    const calculate = (overrideWidth: number | null = null, forceRecalc: boolean = false) => {
        if (solverData.length === 0 || !selectedNode) {
            setSolverResult(null);
            return;
        }

        const cacheKey = getCacheKey(selectedNode.nodeName, numberOfTiers, maxHeightLimit, fillRatioLimit, overrideWidth);

        if (!forceRecalc && solverCache.current.has(cacheKey)) {
            setSolverResult(solverCache.current.get(cacheKey)!);
            return;
        }

        setIsCalculating(true);
        setTimeout(() => {
            let solution: SystemResult;
            if (overrideWidth !== null) {
                solution = solveSystemAtWidth(solverData, numberOfTiers, overrideWidth, maxHeightLimit, fillRatioLimit);
            } else {
                solution = solveSystem(solverData, numberOfTiers, maxHeightLimit, fillRatioLimit);
            }

            solverCache.current.set(cacheKey, solution);
            setSolverResult(solution);
            setIsCalculating(false);
        }, 10);
    };

    // Quick fill function for each node
    const handleQuickFill = (nodeData: NodeFillData) => {
        const nodeCables = cables.filter(c => {
            const hasId = nodeData.cables.includes(c.id);
            const odValue = c.od || (c as any).CABLE_OUTDIA || 0;
            return hasId && odValue > 0;
        });

        const cableData: CableData[] = nodeCables.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            od: c.od || (c as any).CABLE_OUTDIA || 10,
            color: undefined
        }));

        if (cableData.length > 0) {
            const solution = solveSystem(cableData, 1, maxHeightLimit, fillRatioLimit);
            setSolverResult(solution);
            setSelectedNode(nodeData);
        }
    };

    // Recalculate when parameters change
    useEffect(() => {
        if (selectedNode && solverData.length > 0) {
            calculate(manualWidth);
        }
    }, [selectedNode, numberOfTiers, maxHeightLimit, fillRatioLimit, solverData.length]);

    // Width adjustment
    const STANDARD_WIDTHS_UI = [150, 300, 450, 600, 750, 900, 1050, 1200];

    const adjustWidth = (delta: number) => {
        const currentW = solverResult?.systemWidth || 300;
        let nextW: number;

        if (delta > 0) {
            nextW = STANDARD_WIDTHS_UI.find(w => w > currentW) || 1200;
        } else {
            nextW = [...STANDARD_WIDTHS_UI].reverse().find(w => w < currentW) || 150;
        }

        setManualWidth(nextW);
        calculate(nextW);
    };

    const resetToAuto = () => {
        setManualWidth(null);
        calculate(null);
    };

    // Generate warning if manual selection is suboptimal
    const widthWarning = useMemo(() => {
        if (!manualWidth || !solverResult) return null;

        // 1. Overfill Check
        if (!solverResult.success) {
            return { type: 'error', text: '⚠️ 용량 부족 (Insufficient)' };
        }

        // 2. Underfill Check (Wasteful)
        // If fill ratio is significantly lower than limit (e.g., < 30% of limit), it might be wasteful
        // But only if there is a smaller valid width in the matrix (if we have matrix data)
        const currentMaxFill = Math.max(...solverResult.tiers.map(t => t.fillRatio));
        if (currentMaxFill < (fillRatioLimit * 0.5)) {
            return { type: 'warning', text: '⚠️ 규격 과다 (Oversized)' };
        }

        return null;
    }, [manualWidth, solverResult, fillRatioLimit]);

    return (
        <div className="flex flex-col h-full bg-[#f1f5f9]">
            {/* Top Toolbar */}
            <div className="bg-white/90 backdrop-blur-md border-b border-white/20 flex items-center gap-4 shadow-md h-16 shrink-0 z-20 px-4 relative">
                <div className="flex flex-col">
                    <span className="font-extrabold text-lg text-slate-800 tracking-tight">전로폭 산출</span>
                    <span className="text-[10px] text-slate-500 font-medium -mt-1">Tray Fill Analysis</span>
                </div>

                <div className="h-8 w-px bg-slate-200 mx-2"></div>

                {/* Deck Filter & Search */}
                <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-lg border border-slate-200/60 shadow-inner">
                    <span className="text-[10px] font-bold text-slate-500 px-1">DECK</span>
                    <select
                        className="bg-transparent text-xs font-bold text-slate-700 w-20 outline-none cursor-pointer"
                        value={filterDeck}
                        onChange={(e) => setFilterDeck(e.target.value)}
                        title="Filter by Deck Level"
                    >
                        {uniqueDecks.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <Search size={14} className="text-slate-400" />
                    <input
                        className="bg-transparent text-xs p-1 w-28 outline-none placeholder:text-slate-400 font-medium"
                        placeholder="Search Node..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        title="Search for specific Node"
                    />
                </div>

                {/* Routing Toggle */}
                <button
                    className={`ml-2 px-4 py-1.5 rounded-full text-xs font-bold border transition-all shadow-sm flex items-center gap-2 ${showRouting
                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 ring-2 ring-blue-500/20'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-300'
                        }`}
                    onClick={() => setShowRouting(!showRouting)}
                >
                    <Route size={14} />
                    {showRouting ? 'Hide Routing' : 'Show Routing'}
                </button>

                {/* Routing Waypoints Input (Only visible when active) */}
                {showRouting && (
                    <div className="flex items-center gap-2 ml-2">
                        <input
                            type="text"
                            placeholder="Waypoints eg T1-01"
                            className="text-xs border p-1 rounded"
                            value={routeWaypoints}
                            onChange={(e) => setRouteWaypoints(e.target.value)}
                            title="Navigation Waypoints (Comma separated)"
                        />
                        <button className="bg-blue-500 text-white text-xs px-2 py-1 rounded" title="Recalculate path">Re-calc</button>
                    </div>
                )}


                {/* FILL Controls */}
                <div className="flex items-center gap-3 ml-auto">
                    {/* Tier Selection (1-9) */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 border border-slate-200">
                        <span className="text-[9px] text-slate-500 font-bold">단</span>
                        <select
                            value={numberOfTiers}
                            onChange={(e) => setNumberOfTiers(parseInt(e.target.value))}
                            className="bg-white border border-slate-300 text-xs p-0.5 rounded w-12 outline-none font-bold text-blue-600"
                            title="Number of Tray Tiers"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                <option key={n} value={n}>{n}단</option>
                            ))}
                        </select>
                    </div>

                    {/* Height Slider */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 border border-slate-200">
                        <span className="text-[9px] text-slate-500 font-bold">H</span>
                        <input
                            type="range" min="40" max="100" step="5" value={maxHeightLimit}
                            onChange={(e) => setMaxHeightLimit(parseInt(e.target.value))}
                            className="w-16 h-1 bg-slate-300 rounded appearance-none cursor-pointer accent-blue-500"
                            title={`Max Height: ${maxHeightLimit}mm`}
                        />
                        <span className="text-[10px] font-bold text-blue-600 w-6">{maxHeightLimit}</span>
                    </div>

                    {/* Fill Rate Slider */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 border border-slate-200">
                        <span className="text-[9px] text-slate-500 font-bold">F</span>
                        <input
                            type="range" min="10" max="60" step="5" value={fillRatioLimit}
                            onChange={(e) => setFillRatioLimit(parseInt(e.target.value))}
                            className="w-16 h-1 bg-slate-300 rounded appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-[10px] font-bold text-blue-600 w-8">{fillRatioLimit}%</span>
                    </div>

                    {/* Width Override */}
                    <div className="flex items-center gap-0.5 bg-slate-100 rounded p-0.5 border border-slate-200 relative">
                        <button onClick={() => adjustWidth(-100)} className="p-1 text-slate-500 hover:text-blue-600">
                            <ChevronLeft size={14} />
                        </button>
                        <span className={`text-[10px] font-bold min-w-[40px] text-center ${manualWidth ? 'text-blue-600' : 'text-slate-700'}`}>
                            {solverResult?.systemWidth || 0}
                        </span>
                        <button onClick={() => adjustWidth(100)} className="p-1 text-slate-500 hover:text-blue-600">
                            <ChevronRight size={14} />
                        </button>
                        {manualWidth && (
                            <button onClick={resetToAuto} className="p-0.5 text-yellow-500 hover:text-yellow-600" title="Reset to Auto">
                                <RefreshCw size={12} />
                            </button>
                        )}

                        {/* WARNING BADGE */}
                        {widthWarning && (
                            <div className={`absolute top-full right-0 mt-1 px-2 py-1 rounded text-[10px] font-bold shadow-md whitespace-nowrap z-50 animate-bounce cursor-help
                                ${widthWarning.type === 'error' ? 'bg-red-500 text-white' : 'bg-orange-400 text-white'}`}
                                title={widthWarning.text}
                            >
                                {widthWarning.text}
                            </div>
                        )}
                    </div>

                    {/* Calculate Button */}
                    <button
                        onClick={() => calculate(manualWidth)}
                        disabled={isCalculating || solverData.length === 0}
                        className={`px-3 py-1.5 rounded font-bold text-[10px] flex items-center gap-1 ${isCalculating || solverData.length === 0
                            ? 'bg-slate-300 text-slate-500'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        <Play size={12} />
                        {isCalculating ? "..." : "계산"}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: Node List Sidebar */}
                <div className="w-[320px] flex flex-col border-r border-gray-300 bg-white shrink-0">
                    <div className="bg-slate-100 p-2 text-xs font-bold border-b border-gray-200 text-gray-600">
                        Node List ({filteredNodes.length})
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {filteredNodes.map((item) => (
                            <div
                                key={item.nodeName}
                                onClick={() => setSelectedNode(item)}
                                className={`px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${selectedNode?.nodeName === item.nodeName ? 'bg-blue-100 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-gray-800 text-sm">{item.nodeName}</span>
                                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 rounded">{item.cableCount} ea</span>
                                </div>
                                <div className="text-xs text-gray-400">
                                    Width: {item.trayWidth}mm
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickFill(item);
                                    }}
                                    className="mt-2 px-2 py-1 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600"
                                >
                                    <Play size={10} className="inline mr-1" />
                                    Quick Fill
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Visualizer Area (Takes full remaining space) */}
                <div className="flex-1 flex flex-col bg-[#f8fafc] h-full overflow-hidden p-4">
                    {selectedNode && solverResult ? (
                        <div className="w-full h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                            {/* The TrayVisualizer handles its own internal layout (Visualizer Left, Matrix Bottom, Cable Index Right) */}
                            <TrayVisualizer systemResult={solverResult} fillRatioLimit={fillRatioLimit} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Layers size={48} className="mb-2 opacity-20" />
                            <p>Select a Node to view analysis</p>
                            {selectedNode && solverData.length === 0 && (
                                <p className="text-sm text-orange-500 mt-2">⚠️ No cables with valid OD found</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrayAnalysis;
