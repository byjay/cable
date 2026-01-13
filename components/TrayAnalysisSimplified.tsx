import React, { useMemo, useState, useEffect } from 'react';
import { Cable, Node, NodeFillData, SystemResult, CableData } from '../types';
import { AlertTriangle, CheckCircle, Layers, Search, RefreshCw, Route, Play, Settings } from 'lucide-react';
import TrayVisualizer from './TrayVisualizer';
import { autoSolveSystem } from '../services/traySolver';
import { EnhancedRoutingService } from '../services/EnhancedRoutingService';

interface TrayAnalysisProps {
    cables: Cable[];
    nodes: Node[];
}

const TrayAnalysisSimplified: React.FC<TrayAnalysisProps> = ({ cables, nodes }) => {
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
    const [routeResult, setRouteResult] = <any>(null);
    const [allRoutes, setAllRoutes] = useState<any[]>([]);
    const [showQuickFill, setShowQuickFill] = useState(false);

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

    // Calculate fill ratio for each node
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

    // Unique Decks
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

    // SOLVER LOGIC TRIGGER
    useEffect(() => {
        if (selectedNode) {
            const nodeCables = cables.filter(c => selectedNode.cables.includes(c.id));
            const solverData: CableData[] = nodeCables.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                od: c.od || 0,
                color: undefined
            }));
            const res = autoSolveSystem(solverData, 60, 40);
            setSolverResult(res);
        } else {
            setSolverResult(null);
        }
    }, [selectedNode, cables]);

    // Recommended Tray Type Logic
    const STANDARD_WIDTHS = [200, 300, 400, 500, 600, 700, 800, 900];
    const recommendedWidth = useMemo(() => {
        if (!solverResult) return 0;
        const w = solverResult.systemWidth;
        const match = STANDARD_WIDTHS.find(sw => sw >= w);
        return match || 900;
    }, [solverResult]);

    const selectedCables = useMemo(() => {
        if (!selectedNode) return [];
        return cables.filter(c => selectedNode.cables.includes(c.id)).sort((a, b) => (b.od || 0) - (a.od || 0));
    }, [selectedNode, cables]);

    // Handle route calculation
    const handleCalculateRoute = () => {
        if (!routingService || !routeStart || !routeEnd) return;
        
        const waypoints = routeWaypoints ? routeWaypoints.split(',').map(s => s.trim()).filter(s => s) : [];
        const result = routingService.findRoute(routeStart, routeEnd, waypoints.join(','));
        setRouteResult(result);
    };

    // Handle recalculate all routes
    const handleRecalculateAllRoutes = () => {
        if (!routingService) return;
        
        const routes = cables.map(cable => {
            if (cable.fromNode && cable.toNode) {
                const route = routingService.findRoute(cable.fromNode, cable.toNode);
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
        
        // Update cables with new paths
        cables.forEach(cable => {
            const route = routes.find(r => r.cableId === cable.id);
            if (route && route.path.length > 0) {
                cable.calculatedPath = route.path.join(',');
            }
        });
    };

    // Quick fill for selected node
    const handleQuickFill = () => {
        if (!selectedNode) return;
        
        const nodeCables = cables.filter(c => selectedNode.cables.includes(c.id));
        const solverData: CableData[] = nodeCables.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            od: c.od || 0,
            color: undefined
        }));
        const res = autoSandleSystem(solverData, 60, 40);
        setSolverResult(res);
    };

    return (
        <div className="flex flex-col h-full bg-[#f1f5f9]">
            {/* Simplified Top Toolbar */}
            <div className="bg-white p-2 border-b border-gray-300 flex items-center gap-4 shadow-sm h-12 shrink-0">
                <span className="font-bold text-lg text-gray-800">전로폭 산출</span>
                
                {/* Simple Deck Filter */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600">Deck:</span>
                    <select
                        className="bg-white border border-gray-300 text-xs p-1 rounded w-24 outline-none"
                        value={filterDeck}
                        onChange={(e) => setFilterDeck(e.target.value)}
                    >
                        {uniqueDecks.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                
                {/* Simple Search */}
                <div className="flex items-center gap-2">
                    <input
                        className="border border-gray-300 rounded text-xs p-1 w-32 outline-none"
                        placeholder="Search Node..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                    <button className="bg-gray-200 hover:bg-gray-300 border border-gray-300 text-xs font-bold px-3 py-1 rounded text-gray-700">
                        <Search size={12} />
                    </button>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowRouting(!showRouting)}
                        className={`px-3 py-1 rounded text-xs font-bold border ${
                            showRouting 
                                ? 'bg-blue-500 text-white border-blue-500' 
                                : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                        }`}
                    >
                        <Route size={12} className="mr-1" />
                        {showRouting ? '라우팅' : '라우팅'}
                    </button>
                    
                    <button
                        onClick={() => setShowQuickFill(!showQuickFill)}
                        className={`px-3 py-1 rounded text-xs font-bold border ${
                            showQuickFill 
                                ? 'bg-green-500 text-white border-green-500' 
                                : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                        }`}
                    >
                        <Play size={12} className="mr-1" />
                        {showQuickFill ? '빠른 채우기' : '빠른 채우기'}
                    </button>
                    
                    <button
                        onClick={handleRecalculateAllRoutes}
                        className="bg-green-500 text-white px-3 py-1 rounded text-xs font-bold border border-green-500 hover:bg-green-600"
                    >
                        <RefreshCw size={12} className="mr-1" />
                        재라우팅
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: Node List */}
                <div className="w-[320px] flex flex-col border-r border-gray-300 bg-white shrink-0">
                    <div className="bg-slate-100 p-2 text-xs font-bold border-b border-gray-200 text-gray-600">
                        Node List ({filteredNodes.length})
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {filteredNodes.map((item, idx) => (
                            <div
                                key={item.nodeName}
                                onClick={() => setSelectedNode(item)}
                                className={`px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                                    selectedNode?.nodeName === item.nodeName 
                                        ? 'bg-blue-100 border-l-4 border-l-blue-500' 
                                        : 'border-l-4 border-l-transparent'
                                }`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-gray-800 text-sm">{item.nodeName}</span>
                                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 rounded">{item.cableCount}개</span>
                                </div>
                                <div className="text-xs text-gray-400">
                                    Width: {item.trayWidth}mm
                                </div>
                                
                                {/* Quick Fill Button */}
                                <div className="mt-2">
                                    <button
                                        onClick={handleQuickFill}
                                        className="w-full bg-green-500 text-white rounded px-2 py-1 text-xs font-bold hover:bg-green-600"
                                    >
                                        <Play size={12} className="mr-1" />
                                        빠른 채우기
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Detail View */}
                <div className="flex-1 flex flex-col bg-[#f8fafc] h-full overflow-hidden">
                    {selectedNode && solverResult ? (
                        /* NODE DETAIL VIEW */
                        <div className="flex-1 p-4 overflow-auto">
                            {/* Node Header */}
                            <div className="bg-white rounded-lg p-4 mb-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="font-bold text-xl">{selectedNode.nodeName}</h2>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        solverResult.fillRatio > 90 
                                            ? 'bg-red-100 text-red-800' 
                                            : solverResult.fillRatio > 70 
                                                ? 'bg-yellow-100 text-yellow-800' 
                                                : 'bg-green-100 text-green-800'
                                    }`}>
                                        충전율: {solverResult.fillRatio.toFixed(1)}%
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">권장 케이블:</span>
                                        <span className="ml-2 font-bold">{selectedCables.length}개</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">계산 폭:</span>
                                        <span className="ml-2 font-bold">{solverResult.systemWidth}mm</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">권장 용량:</span>
                                        <span className="ml-2 font-bold">{solverResult.totalCapacity}mm²</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">사용 용량:</span>
                                        <span className="ml-2 font-bold">{solverResult.usedCapacity}mm²</span>
                                    </div>
                                </div>
                            </div>

                            {/* Recommended Tray */}
                            <div className="bg-white rounded-lg p-4 mb-4">
                                <h3 className="font-bold text-lg mb-3">권장 트레이 추천</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="text-sm text-gray-600">표준 폭</div>
                                        <div className="text-xl font-bold text-blue-600">{recommendedWidth}mm</div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm text-gray-600">예상 충전율</div>
                                        <div className="text-xl font-bold text-green-600">
                                            {((solverResult.usedCapacity / (recommendedWidth * 60)) * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cable List */}
                            <div className="bg-white rounded-lg p-4 mb-4">
                                <h3 className="font-bold text-lg mb-3">권장 케이블 목록</h3>
                                <div className="space-y-2 max-h-64 overflow-auto">
                                    {selectedCables.map((cable, idx) => (
                                        <div key={cable.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                                <div>
                                                    <div className="font-bold text-sm">{cable.name}</div>
                                                    <div className="text-xs text-gray-500">{cable.type}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold">Ø{cable.od || 0}mm</div>
                                                <div className="text-xs text-gray-500">ID: {cable.id}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Visualizer */}
                            <div className="bg-white rounded-lg p-4">
                                <h3 className="font-bold text-lg mb-3">트레이 시각화</h3>
                                <TrayVisualizer
                                    result={solverResult}
                                    trayWidth={recommendedWidth}
                                    trayHeight={60}
                                    fillLimit={40}
                                />
                            </div>
                        </div>
                    ) : showRouting ? (
                        /* ROUTING PANEL */
                        <div className="flex-1 p-4 overflow-auto">
                            <div className="bg-white rounded-lg p-4 mb-4">
                                <h3 className="font-bold text-lg mb-4">전체 라우팅 설정</h3>
                                
                                {/* Route Input */}
                                <div className="space-y-3 mb-4">
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                                            placeholder="시작 노드"
                                            value={routeStart}
                                            onChange={(e) => setRouteStart(e.target.value)}
                                        />
                                        <input
                                            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                                            placeholder="도착 노드"
                                            value={routeEnd}
                                            onChange={(e) => setRouteEnd(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <input
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                            placeholder="필수 경로 (쉼표로 구분, 예: NodeA,NodeB,NodeC)"
                                            value={routeWaypoints}
                                            onChange={(e) => setRouteWaypoints(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={handleCalculateRoute}
                                        className="w-full bg-blue-500 text-white rounded px-4 py-2 text-sm font-bold hover:bg-blue-600"
                                    >
                                        경로 계산
                                    </button>
                                </div>

                                {/* Route Result */}
                                {routeResult && (
                                    <div className="border-t pt-4">
                                        <h4 className="font-bold mb-2">경로 결과</h4>
                                        {routeResult.distance >= 0 ? (
                                            <div>
                                                <div className="text-sm text-green-600 mb-2">
                                                    ✅ 경로 발견 (거리: {routeResult.distance.toFixed(1)}m)
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    경로: {routeResult.path.join(' → ')}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-red-600">
                                                ❌ 경로 없음: {routeResult.error}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* All Routes List */}
                            <div className="bg-white rounded-lg p-4">
                                <h3 className="font-bold text-lg mb-4">전체 케이블 라우팅 ({allRoutes.length})</h3>
                                <div className="space-y-2 max-h-96 overflow-auto">
                                    {allRoutes.map((route, idx) => (
                                        <div key={idx} className="border border-gray-200 rounded p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-sm">{route.cableName}</span>
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    route.distance >= 0 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {route.distance >= 0 ? `${route.distance.toFixed(1)}m` : '실패'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                {route.fromNode} → {route.toNode}
                                            </div>
                                            {route.path.length > 0 && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    경로: {route.path.join(' → ')}
                                                </div>
                                            )}
                                            {route.error && (
                                                <div className="text-xs text-red-500 mt-1">
                                                    에러: {route.error}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* EMPTY STATE */
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-gray-400 mb-2">
                                    <Layers size={48} className="mx-auto" />
                                </div>
                                <div className="text-gray-600 font-bold">Node를 선택하세요</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    왼쪽 목록에서 Node를 클릭하여 상세 정보를 확인하세요
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrayAnalysisSimplified;
