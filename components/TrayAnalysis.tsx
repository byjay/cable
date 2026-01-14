import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Cable, Node, NodeFillData, SystemResult, CableData } from '../types';
import { AlertTriangle, CheckCircle, Layers, Search, RefreshCw, Route, Play, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import TrayVisualizerEnhanced from './TrayVisualizerEnhanced';
import { autoSolveSystem, solveSystem, solveSystemAtWidth, calculateBasicStats } from '../services/traySolverEnhanced';
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
    const [routeStart, setRouteStart] = useState('');
    const [routeEnd, setRouteEnd] = useState('');
    const [routeWaypoints, setRouteWaypoints] = useState('');
    const [routeResult, setRouteResult] = useState<any>(null);
    const [allRoutes, setAllRoutes] = useState<any[]>([]);
    const [showQuickFill, setShowQuickFill] = useState(false);

    // FILL Configuration State
    const [numberOfTiers, setNumberOfTiers] = useState(1);
    const [maxHeightLimit, setMaxHeightLimit] = useState(60);
    const [fillRatioLimit, setFillRatioLimit] = useState(40);
    const [manualWidth, setManualWidth] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // CACHE for solver results (key: nodeName + params)
    const solverCache = useRef<Map<string, SystemResult>>(new Map());

    // Initialize routing service
    useEffect(() => {
        if (nodes.length > 0) {
            const service = new EnhancedRoutingService(nodes);
            setRoutingService(service);

            // Calculate all routes
            const routes = cables.map(cable => {
                if (cable.fromNode && cable.toNode) {
                    const route = service.findRoute(cable.fromNode, cable.toNode);
                    return {
                        cableId: cable.id,
                        cableName: cable.name,
                        fromNode: cable.fromNode,
                        toNode: cable.toNode,
                        path: route.path,
                        distance: route.distance,
                        error: route.error
                    };
                }
                return null;
            }).filter(Boolean);
            setAllRoutes(routes);
        }
    }, [nodes, cables]);

    // Calculate fill ratio for each node (Quick Check for List)
    const nodeAnalysis = useMemo(() => {
        const nodeMap = new Map<string, Node>();
        nodes.forEach(n => nodeMap.set(n.name, n));

        // Group cables by node usage (Pre-calculation)
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
                // Support both 'od' and 'CABLE_OUTDIA' properties
                const odValue = c.od || (c as any).CABLE_OUTDIA || (c as any).OUT_DIA || 0;
                return hasId && odValue > 0;
            })
            .sort((a, b) => {
                const odA = a.od || (a as any).CABLE_OUTDIA || (a as any).OUT_DIA || 0;
                const odB = b.od || (b as any).CABLE_OUTDIA || (b as any).OUT_DIA || 0;
                return odB - odA;
            });
    }, [selectedNode, cables]);

    // Convert to solver format
    const solverData = useMemo((): CableData[] => {
        return selectedCables.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            od: c.od || (c as any).CABLE_OUTDIA || 10, // Support both properties
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

        // Check cache first (unless forceRecalc)
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

            // Store in cache
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
            const solution = autoSolveSystem(cableData, maxHeightLimit, fillRatioLimit);
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

    // Width adjustment (Standard Industrial Steps)
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

    const recommendedWidth = useMemo(() => {
        if (!solverResult) return 0;
        const w = solverResult.systemWidth;
        const match = STANDARD_WIDTHS_UI.find(sw => sw >= w);
        return match || 1200;
    }, [solverResult]);

    return (
        <div className="flex flex-col h-full bg-[#f1f5f9]">
            {/* Top Toolbar (Glassmorphism) */}
            <div className="bg-white/90 backdrop-blur-md border-b border-white/20 flex items-center gap-4 shadow-md h-16 shrink-0 z-20 px-4 relative">
                <div className="flex flex-col">
                    <span className="font-extrabold text-lg text-slate-800 tracking-tight">전로폭 산출</span>
                    <span className="text-[10px] text-slate-500 font-medium -mt-1">Tray Fill Analysis</span>
                </div>

                {/* Vertical Divider */}
                <div className="h-8 w-px bg-slate-200 mx-2"></div>

                {/* Deck Filter & Search */}
                <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-lg border border-slate-200/60 shadow-inner">
                    <span className="text-[10px] font-bold text-slate-500 px-1">DECK</span>
                    <select
                        className="bg-transparent text-xs font-bold text-slate-700 w-20 outline-none cursor-pointer"
                        value={filterDeck}
                        onChange={(e) => setFilterDeck(e.target.value)}
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

                {/* Re-route All Panel */}
                {showRouting && (
                    <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 rounded-lg p-1.5 ml-2 animate-in fade-in slide-in-from-left-2 duration-200">
                        <div className="flex flex-col gap-0.5 px-1">
                            <span className="text-[9px] text-blue-600 font-extrabold uppercase tracking-wide">Waypoints</span>
                            <input
                                type="text"
                                placeholder="e.g. T1-01, T2-05"
                                className="bg-white border border-blue-200 text-xs px-2 py-0.5 rounded shadow-sm w-40 outline-none focus:ring-2 focus:ring-blue-400/30 text-slate-700 font-mono"
                                value={routeWaypoints}
                                onChange={(e) => setRouteWaypoints(e.target.value)}
                                title="Comma separated node names to pass through"
                            />
                        </div>
                        <div className="h-6 w-px bg-blue-200"></div>
                        <button
                            className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                            onClick={() => {
                                if (routingService) {
                                    const routes = cables.map(cable => {
                                        if (cable.fromNode && cable.toNode) {
                                            const route = routingService.findRoute(cable.fromNode, cable.toNode, routeWaypoints);
                                            return {
                                                cableId: cable.id,
                                                cableName: cable.name,
                                                fromNode: cable.fromNode,
                                                toNode: cable.toNode,
                                                path: route.path,
                                                distance: route.distance,
                                                error: route.error
                                            };
                                        }
                                        return null;
                                    }).filter(Boolean);
                                    setAllRoutes(routes);
                                }
                            }}
                        >
                            <RefreshCw size={12} className="inline" />
                            Re-route All
                        </button>
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
                    <div className="flex items-center gap-0.5 bg-slate-100 rounded p-0.5 border border-slate-200">
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

            {/* Split Pane Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: Node List */}
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

                                {/* Quick Fill Button */}
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

                {/* RIGHT: Detail View */}
                <div className="flex-1 flex flex-col bg-[#f8fafc] h-full overflow-hidden">
                    {selectedNode && solverResult ? (
                        <>
                            {/* TOP: Visualizer + Recommendation Panel */}
                            <div className="h-[320px] flex border-b border-gray-300 bg-white">
                                {/* Visualizer Area (70%) */}
                                <div className="flex-1 border-r border-gray-200 relative">
                                    <TrayVisualizerEnhanced systemResult={solverResult} fillRatioLimit={fillRatioLimit} />
                                    {/* Calculated Info Overlay */}
                                    <div className="absolute top-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded shadow pointer-events-none">
                                        W{solverResult.systemWidth} x H{maxHeightLimit} x {solverResult.tiers.length}단 | {selectedCables.length}개 (OD &gt; 0)
                                    </div>
                                </div>

                                {/* Recommendation Panel (30%) */}
                                <div className="w-[220px] bg-slate-50 p-4 flex flex-col gap-4 overflow-y-auto">
                                    <div className="pb-2 border-b border-gray-200">
                                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                            <CheckCircle className="text-green-500" size={16} />
                                            Recommendation
                                        </h3>
                                        <p className="text-[10px] text-gray-500 mt-1">Based on OD & Fill {fillRatioLimit}%</p>
                                    </div>

                                    <div className="bg-white border rounded p-3 shadow-sm text-center">
                                        <div className="text-xs text-gray-500 mb-1">Physical Analysis</div>
                                        {(() => {
                                            const stats = calculateBasicStats(solverData);
                                            return (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex justify-between text-[10px] border-b border-dashed pb-1">
                                                        <span>Total OD:</span>
                                                        <span className="font-bold text-blue-600">{stats.totalODSum.toFixed(1)} mm</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] border-b border-dashed pb-1">
                                                        <span>Area Sum:</span>
                                                        <span className="font-bold text-purple-600">{stats.totalAreaSum.toFixed(0)} mm²</span>
                                                    </div>
                                                    <div className="text-[9px] text-gray-400 mt-1">
                                                        * Used for Tier Calculation
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="bg-white border rounded p-3 shadow-sm text-center">
                                        <div className="text-xs text-gray-500 mb-1">Recommended Type</div>
                                        <div className="text-2xl font-black text-blue-600">
                                            {recommendedWidth} <span className="text-sm text-gray-400">mm</span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-700 mt-1 text-center bg-slate-100 rounded py-1">
                                            {solverResult.tiers.length}단 (Tiers)
                                        </div>
                                    </div>

                                    <div className="text-[10px] text-gray-400">
                                        * Standard tray widths (200~900mm) applied.
                                    </div>

                                    {/* Stats */}
                                    <div className="bg-white border rounded p-2 text-xs">
                                        <div className="flex justify-between py-1 border-b border-gray-100">
                                            <span className="text-gray-500">Total Cables</span>
                                            <span className="font-bold">{selectedCables.length}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-gray-100">
                                            <span className="text-gray-500">Avg Fill</span>
                                            <span className="font-bold">
                                                {solverResult.tiers.length > 0
                                                    ? (solverResult.tiers.reduce((sum, t) => sum + t.fillRatio, 0) / solverResult.tiers.length).toFixed(1)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span className="text-gray-500">Success</span>
                                            <span className={`font-bold ${solverResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                                {solverResult.success ? 'OK' : 'FAIL'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BOTTOM: Cable List */}
                            <div className="flex-1 overflow-auto custom-scrollbar flex flex-col">
                                <div className="bg-slate-100 px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-600 sticky top-0">
                                    Cables in Tray ({selectedCables.length})
                                </div>
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-white text-gray-500 sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="p-2 w-10 text-center border-b">No</th>
                                            <th className="p-2 border-b">Circuit</th>
                                            <th className="p-2 border-b">Type</th>
                                            <th className="p-2 w-20 text-right border-b">OD</th>
                                            <th className="p-2 w-20 text-right border-b">Length</th>
                                            <th className="p-2 border-b">From</th>
                                            <th className="p-2 border-b">To</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {selectedCables.map((cable, idx) => (
                                            <tr key={cable.id} className="hover:bg-blue-50">
                                                <td className="p-2 text-center text-gray-400 bg-slate-50">{idx + 1}</td>
                                                <td className="p-2 font-bold text-blue-700">{cable.name}</td>
                                                <td className="p-2 text-gray-600">{cable.type}</td>
                                                <td className="p-2 text-right font-mono">{cable.od}</td>
                                                <td className="p-2 text-right font-mono text-gray-400">{cable.calculatedLength?.toFixed(1) || '-'}</td>
                                                <td className="p-2 text-gray-500 truncate max-w-[80px]" title={cable.fromNode}>{cable.fromNode}</td>
                                                <td className="p-2 text-gray-500 truncate max-w-[80px]" title={cable.toNode}>{cable.toNode}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
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
