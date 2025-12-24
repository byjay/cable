import React, { useMemo, useState } from 'react';
import { Cable, Node } from '../types';
import { AlertTriangle, CheckCircle, Layers, ChevronUp, ChevronDown } from 'lucide-react';

interface TrayAnalysisProps {
    cables: Cable[];
    nodes: Node[];
}

interface NodeFillData {
    nodeName: string;
    trayWidth: number;
    trayCapacity: number; // width * 60
    cableCount: number;
    totalCableArea: number;
    fillRatio: number; // as percentage
    isOverfilled: boolean;
    cables: string[];
}

const TrayAnalysis: React.FC<TrayAnalysisProps> = ({ cables, nodes }) => {
    // Calculate fill ratio for each node
    const nodeAnalysis = useMemo(() => {
        // Build a map of node name -> node data
        const nodeMap = new Map<string, Node>();
        nodes.forEach(n => nodeMap.set(n.name, n));

        // Count cables passing through each node
        const nodeCableMap = new Map<string, { cables: Cable[], totalArea: number }>();

        cables.forEach(cable => {
            if (!cable.calculatedPath || cable.calculatedPath.length === 0) return;

            // Calculate cable cross-section area: π * (od/2)²
            // od is in mm, area in mm²
            const od = cable.od || 10; // Default 10mm if not specified
            const cableArea = Math.PI * Math.pow(od / 2, 2);

            // Add this cable to each node in its path
            cable.calculatedPath.forEach(nodeName => {
                if (!nodeCableMap.has(nodeName)) {
                    nodeCableMap.set(nodeName, { cables: [], totalArea: 0 });
                }
                const data = nodeCableMap.get(nodeName)!;
                data.cables.push(cable);
                data.totalArea += cableArea;
            });
        });

        // Build analysis data for each node with cables
        const results: NodeFillData[] = [];

        nodeCableMap.forEach((data, nodeName) => {
            const node = nodeMap.get(nodeName);
            // Tray width from node.areaSize, default 200mm if not set
            const trayWidth = node?.areaSize || 200;
            // Tray capacity = width * 60mm (height)
            const trayCapacity = trayWidth * 60;
            // Fill ratio as percentage
            const fillRatio = (data.totalArea / trayCapacity) * 100;

            results.push({
                nodeName,
                trayWidth,
                trayCapacity,
                cableCount: data.cables.length,
                totalCableArea: data.totalArea,
                fillRatio,
                isOverfilled: fillRatio > 40,
                cables: data.cables.map(c => c.name)
            });
        });

        // Sort by fill ratio descending (worst first)
        results.sort((a, b) => b.fillRatio - a.fillRatio);

        return results;
    }, [cables, nodes]);

    const overfilledCount = nodeAnalysis.filter(n => n.isOverfilled).length;
    const maxFillRatio = nodeAnalysis.length > 0 ? nodeAnalysis[0].fillRatio : 0;

    // Sorting state
    const [sortColumn, setSortColumn] = useState<keyof NodeFillData>('fillRatio');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const handleSort = (column: keyof NodeFillData) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    const sortedData = useMemo(() => {
        return [...nodeAnalysis].sort((a, b) => {
            const aVal = a[sortColumn];
            const bVal = b[sortColumn];
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
    }, [nodeAnalysis, sortColumn, sortDirection]);

    const SortHeader = ({ column, label, align = 'left' }: { column: keyof NodeFillData, label: string, align?: string }) => (
        <th
            className={`p-2 text-${align} cursor-pointer hover:bg-seastar-700 select-none`}
            onClick={() => handleSort(column)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                {label}
                {sortColumn === column && (
                    sortDirection === 'asc'
                        ? <ChevronUp size={12} className="text-seastar-cyan" />
                        : <ChevronDown size={12} className="text-seastar-cyan" />
                )}
            </div>
        </th>
    );

    return (
        <div className="flex flex-col h-full bg-seastar-900 p-4 overflow-hidden">
            {/* Header with Summary */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-seastar-700">
                <div className="flex items-center gap-3">
                    <Layers size={24} className="text-seastar-cyan" />
                    <h2 className="text-xl font-bold text-white">Tray Fill Ratio Analysis</h2>
                </div>
                <div className="flex gap-6">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-seastar-cyan">{nodeAnalysis.length}</div>
                        <div className="text-xs text-gray-400">Active Nodes</div>
                    </div>
                    <div className="text-center">
                        <div className={`text-3xl font-bold ${overfilledCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {overfilledCount}
                        </div>
                        <div className="text-xs text-gray-400">Overfilled (&gt;40%)</div>
                    </div>
                    <div className="text-center">
                        <div className={`text-3xl font-bold ${maxFillRatio > 40 ? 'text-red-400' : 'text-yellow-400'}`}>
                            {maxFillRatio.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-400">Max Fill Ratio</div>
                    </div>
                </div>
            </div>

            {/* Warning Banner if any overfilled */}
            {overfilledCount > 0 && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4 flex items-center gap-3">
                    <AlertTriangle size={24} className="text-red-400" />
                    <div>
                        <div className="font-bold text-red-300">⚠️ Capacity Warning</div>
                        <div className="text-sm text-red-200">
                            {overfilledCount} node(s) exceed 40% fill ratio! Cable capacity is limited.
                        </div>
                    </div>
                </div>
            )}

            {/* Node Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-seastar-800 sticky top-0">
                        <tr className="text-gray-400 text-xs">
                            <th className="p-2 text-left">Status</th>
                            <SortHeader column="nodeName" label="Node Name" />
                            <SortHeader column="trayWidth" label="Tray Width (mm)" align="right" />
                            <SortHeader column="trayCapacity" label="Tray Capacity (mm²)" align="right" />
                            <SortHeader column="cableCount" label="Cable Count" align="right" />
                            <SortHeader column="totalCableArea" label="Total Cable Area (mm²)" align="right" />
                            <SortHeader column="fillRatio" label="Fill Ratio" align="right" />
                            <th className="p-2 text-left">Cables</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((node, idx) => (
                            <tr
                                key={node.nodeName}
                                className={`border-b border-seastar-700 ${node.isOverfilled
                                    ? 'bg-red-900/30 hover:bg-red-900/50'
                                    : 'hover:bg-seastar-800'
                                    }`}
                            >
                                <td className="p-2">
                                    {node.isOverfilled ? (
                                        <AlertTriangle size={16} className="text-red-400" />
                                    ) : (
                                        <CheckCircle size={16} className="text-green-400" />
                                    )}
                                </td>
                                <td className="p-2 font-mono text-seastar-cyan font-bold">{node.nodeName}</td>
                                <td className="p-2 text-right text-gray-300">{node.trayWidth}</td>
                                <td className="p-2 text-right text-gray-300">{node.trayCapacity.toLocaleString()}</td>
                                <td className="p-2 text-right text-white font-bold">{node.cableCount}</td>
                                <td className="p-2 text-right text-gray-300">{node.totalCableArea.toFixed(1)}</td>
                                <td className={`p-2 text-right font-bold ${node.fillRatio > 40
                                    ? 'text-red-400'
                                    : node.fillRatio > 30
                                        ? 'text-yellow-400'
                                        : 'text-green-400'
                                    }`}>
                                    {node.fillRatio.toFixed(1)}%
                                    {/* Visual bar */}
                                    <div className="w-20 h-1 bg-gray-700 rounded mt-1 inline-block ml-2">
                                        <div
                                            className={`h-full rounded ${node.fillRatio > 40 ? 'bg-red-500' : node.fillRatio > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(node.fillRatio, 100)}%` }}
                                        />
                                    </div>
                                </td>
                                <td className="p-2 text-xs text-gray-400 max-w-xs truncate" title={node.cables.join(', ')}>
                                    {node.cables.slice(0, 3).join(', ')}
                                    {node.cables.length > 3 && ` +${node.cables.length - 3} more`}
                                </td>
                            </tr>
                        ))}
                        {nodeAnalysis.length === 0 && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-gray-500">
                                    No routing data available. Run "Route All" first to calculate fill ratios.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Formula Explanation */}
            <div className="mt-4 p-3 bg-seastar-800 rounded-lg text-xs text-gray-400">
                <strong className="text-white">Calculation Formula:</strong>
                <span className="ml-2">Tray Capacity = Width × 60mm</span>
                <span className="mx-2">|</span>
                <span>Cable Area = π × (OD/2)²</span>
                <span className="mx-2">|</span>
                <span className="text-yellow-400">Fill Ratio = (Total Cable Area / Tray Capacity) × 100%</span>
                <span className="mx-2">|</span>
                <span className="text-red-400">Warning if &gt; 40%</span>
            </div>
        </div>
    );
};

export default TrayAnalysis;
