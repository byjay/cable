import React, { useMemo, useState, useEffect } from 'react';
import { Cable, Node, NodeFillData, SystemResult, CableData } from '../types';
import { AlertTriangle, CheckCircle, Layers, Search, RefreshCw } from 'lucide-react';
import TrayVisualizer from './TrayVisualizer';
import { autoSolveSystem } from '../services/traySolver';

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
                // Filter only for Tray nodes if possible, but we check 'nodes' list
                if (nodeMap.has(cleanName)) {
                    if (!nodeCableIds.has(cleanName)) nodeCableIds.set(cleanName, []);
                    nodeCableIds.get(cleanName)!.push(c.id);
                }
            });
        });

        const results: NodeFillData[] = [];

        nodeMap.forEach((node, nodeName) => {
            // Only show Trays or nodes with cables
            const cableIds = nodeCableIds.get(nodeName) || [];
            if (node.type !== 'Tray' && cableIds.length === 0) return;

            // Simple Area Calculation for List sorting
            // Accurate calculation happens in Solver
            let totalArea = 0;
            // We need to look up cables efficiently. 
            // Doing it O(N) inside loop is slow relative to total nodes.
            // But map lookup is fast.
            // Wait, we need Cable objects to sum Area.
            // Let's assume average OD or look up. 
            // For performance, let's just use count for now or optimize later if slow.
            // Actually, let's do a quick lookup since we have 'cables' prop.
            // Creating a Cable Map ID->Cable is better.

            const trayWidth = node.areaSize || 300; // Default 300
            const trayCapacity = trayWidth * 60;
            // const fillRatio = ... (approximate)

            results.push({
                nodeName,
                trayWidth,
                trayCapacity,
                cableCount: cableIds.length,
                totalCableArea: 0, // Calculated on selection for speed? Or pre-calc?
                fillRatio: 0, // Placeholder
                isOverfilled: false,
                cables: cableIds
            });
        });

        // Return results. Note: Fill Ratio is missing here for speed, 
        // effectively we might need to calculate it properly if the user wants to sort by Fill %.
        // Let's bring back the loop logic from previous step but optimized.
        return results;

    }, [cables, nodes]);

    // Post-calculation of Fill Ratio for sorting (if needed) or just do it in the loop above accurately.
    // For now, let's stick to the visualizer logic mainly.

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
        }).sort((a, b) => b.cableCount - a.cableCount); // Sort by count for interesting nodes
    }, [nodeAnalysis, filterDeck, searchText, nodes]);


    // SOLVER LOGIC TRIGGER
    useEffect(() => {
        if (selectedNode) {
            // Get Cable Objects
            // This is "Input Data" equivalent to FILL's manual input
            const nodeCables = cables.filter(c => selectedNode.cables.includes(c.id));

            // Map to Solver Format
            const solverData: CableData[] = nodeCables.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                od: c.od || 0,
                color: undefined
            }));

            // Execute Solver (Auto 9->1 logic)
            // Default H=60, Fill=40
            const res = autoSolveSystem(solverData, 60, 40);
            setSolverResult(res);
        } else {
            setSolverResult(null);
        }
    }, [selectedNode, cables]);


    // Recommended Tray Type Logic
    // Standard Widths: 200, 300, 400, 500, 600, 700, 800, 900
    const STANDARD_WIDTHS = [200, 300, 400, 500, 600, 700, 800, 900];
    const recommendedWidth = useMemo(() => {
        if (!solverResult) return 0;
        const w = solverResult.systemWidth;
        // Find first standard >= w
        const match = STANDARD_WIDTHS.find(sw => sw >= w);
        return match || 900; // Cap at 900 or show actual
    }, [solverResult]);


    const selectedCables = useMemo(() => {
        if (!selectedNode) return [];
        return cables.filter(c => selectedNode.cables.includes(c.id)).sort((a, b) => (b.od || 0) - (a.od || 0));
    }, [selectedNode, cables]);

    return (
        <div className="flex flex-col h-full bg-[#f1f5f9]">
            {/* Top Toolbar */}
            <div className="bg-white p-2 border-b border-gray-300 flex items-center gap-4 shadow-sm h-12 shrink-0">
                <span className="font-bold text-lg text-gray-800">전로폭 산출 (Tray Fill Analysis)</span>
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded border border-gray-200">
                    <span className="text-xs font-bold text-gray-600 px-2">Deck</span>
                    <select
                        className="bg-white border border-gray-300 text-xs p-1 rounded w-32 outline-none"
                        value={filterDeck}
                        onChange={(e) => setFilterDeck(e.target.value)}
                    >
                        {uniqueDecks.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
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
            </div>

            {/* Split Pane Content */}
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
                                className={`px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${selectedNode?.nodeName === item.nodeName ? 'bg-blue-100 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-gray-800 text-sm">{item.nodeName}</span>
                                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 rounded">{item.cableCount} ea</span>
                                </div>
                                <div className="text-xs text-gray-400">
                                    Width: {item.trayWidth}mm
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Detail View */}
                <div className="flex-1 flex flex-col bg-[#f8fafc] h-full overflow-hidden">
                    {selectedNode && solverResult ? (
                        <>
                            {/* TOP: Visualizer + Recommendation Panel */}
                            <div className="h-[300px] flex border-b border-gray-300 bg-white">
                                {/* Visualizer Area (70%) */}
                                <div className="flex-1 border-r border-gray-200 relative">
                                    <TrayVisualizer systemResult={solverResult} />
                                    {/* Calculated Info Overlay */}
                                    <div className="absolute top-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded shadow pointer-events-none">
                                        Calculated: W{solverResult.systemWidth} x H60 x {solverResult.tiers.length} Tiers
                                    </div>
                                </div>

                                {/* Recommendation Panel (30%) */}
                                <div className="w-[220px] bg-slate-50 p-4 flex flex-col gap-4 overflow-y-auto">
                                    <div className="pb-2 border-b border-gray-200">
                                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                            <CheckCircle className="text-green-500" size={16} />
                                            Recommendation
                                        </h3>
                                        <p className="text-[10px] text-gray-500 mt-1">Based on OD & Fill 40%</p>
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
                                </div>
                            </div>

                            {/* BOTTOM: Cable List */}
                            <div className="flex-1 overflow-auto custom-scrollbar flex flex-col">
                                <div className="bg-slate-100 px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-600 sticky top-0">
                                    Cables in Tray ({selectedNode.cableCount})
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrayAnalysis;

