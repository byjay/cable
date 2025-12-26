import React, { useMemo } from 'react';
import { Cable, Node } from '../types';
import { AlertTriangle, CheckCircle, HardDrive, FileSpreadsheet, Box, Activity, Database } from 'lucide-react';

interface DataVerificationprops {
    cables: Cable[];
    nodes: Node[];
    expectedCableCount?: number;
    expectedNodeCount?: number;
}

const DataVerification: React.FC<DataVerificationprops> = ({ cables, nodes, expectedCableCount, expectedNodeCount }) => {

    const stats = useMemo(() => {
        const totalCables = cables.length;
        const totalNodes = nodes.length;
        const routedCables = cables.filter(c => c.calculatedPath && c.calculatedPath.length > 0).length;
        const unroutedCables = totalCables - routedCables;
        const routeErrors = cables.filter(c => c.routeError).length;
        const missingLength = cables.filter(c => !c.length).length;

        // Auto-detect if using mock data (count < 150 is a heuristic for mock data in this context, 
        // as real project has ~2000+)
        const isMockData = totalCables > 0 && totalCables < 150;

        return {
            totalCables,
            totalNodes,
            routedCables,
            unroutedCables,
            routeErrors,
            missingLength,
            isMockData,
            routingHealth: totalCables > 0 ? (routedCables / totalCables) * 100 : 0
        };
    }, [cables, nodes]);

    if (cables.length === 0 && nodes.length === 0) return null;

    return (
        <div className="bg-seastar-800 border border-seastar-700 rounded-lg p-4 mb-4 text-xs font-mono text-seastar-100 shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-seastar-700 pb-2">
                <h3 className="flex items-center gap-2 text-seastar-cyan font-bold uppercase tracking-wider">
                    <Database size={14} /> System Health & Data Integrity Check
                </h3>
                {stats.isMockData ? (
                    <span className="bg-red-900/50 text-red-400 px-2 py-1 rounded flex items-center gap-1 border border-red-800 animate-pulse">
                        <AlertTriangle size={12} /> MOCK DATA DETECTED
                    </span>
                ) : (
                    <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded flex items-center gap-1 border border-green-800">
                        <CheckCircle size={12} /> LIVE DATA
                    </span>
                )}
            </div>

            <div className="grid grid-cols-4 gap-4">
                <div className="bg-seastar-900/50 p-2 rounded border border-seastar-700/50">
                    <div className="text-gray-500 mb-1 flex items-center gap-1">
                        <FileSpreadsheet size={10} /> CABLE DATA
                    </div>
                    <div className="text-lg font-bold text-white">{stats.totalCables.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-400 mt-1">
                        {expectedCableCount ? (
                            stats.totalCables >= expectedCableCount ?
                                <span className="text-green-500">Matches Metadata</span> :
                                <span className="text-red-400">Missing {expectedCableCount - stats.totalCables}</span>
                        ) : "No Metadata Ref"}
                    </div>
                </div>

                <div className="bg-seastar-900/50 p-2 rounded border border-seastar-700/50">
                    <div className="text-gray-500 mb-1 flex items-center gap-1">
                        <HardDrive size={10} /> NODE DATA
                    </div>
                    <div className="text-lg font-bold text-white">{stats.totalNodes.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-400 mt-1">
                        Status: {stats.totalNodes > 0 ? "Active" : "Empty"}
                    </div>
                </div>

                <div className="bg-seastar-900/50 p-2 rounded border border-seastar-700/50">
                    <div className="text-gray-500 mb-1 flex items-center gap-1">
                        <Box size={10} /> ROUTING HEALTH
                    </div>
                    <div className={`text-lg font-bold ${stats.routingHealth > 90 ? 'text-green-400' : 'text-orange-400'}`}>
                        {stats.routingHealth.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                        {stats.unroutedCables} Unrouted
                    </div>
                </div>

                <div className="bg-seastar-900/50 p-2 rounded border border-seastar-700/50">
                    <div className="text-gray-500 mb-1 flex items-center gap-1">
                        <AlertTriangle size={10} /> ERRORS
                    </div>
                    <div className={`text-lg font-bold ${stats.routeErrors > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {stats.routeErrors}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                        Path Failures
                    </div>
                </div>
            </div>

            {(stats.isMockData || stats.totalCables < 100) && (
                <div className="mt-2 p-2 bg-red-900/20 text-red-300 border border-red-900/50 rounded flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>
                        <strong>WARNING:</strong> Cable count is suspiciously low.
                        Use 'Hard Refresh' or check Internet Connection if this persists.
                        Verify <code>/data/[SHIP_ID]/cables.xlsx</code> exists.
                    </span>
                </div>
            )}
        </div>
    );
};

export default DataVerification;
