import React, { useState, useMemo } from 'react';
import { Cable } from '../types';
import { Download, Search, Disc } from 'lucide-react';
import { ExcelService } from '../services/excelService';

interface DrumScheduleReportProps {
    cables: Cable[];
}

const DrumScheduleReport: React.FC<DrumScheduleReportProps> = ({ cables }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [drumUnit, setDrumUnit] = useState<number>(500); // 500m or 1000m

    // Group efficiency: From -> To -> Type
    // Then allocate to drums of 'drumUnit' size
    const drumGroups = useMemo(() => {
        // 1. Grouping
        const groups: { [key: string]: Cable[] } = {};
        cables.forEach(c => {
            // Key: FROM-TO-TYPE
            // Valid only if all exist
            const key = `${c.fromNode || '?'}_${c.toNode || '?'}_${c.type || '?'}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });

        // 2. Allocation
        const resultDrums: {
            drumId: string;
            fromNode: string;
            toNode: string;
            cableType: string;
            cables: Cable[];
            totalLength: number;
            capacity: number;
        }[] = [];

        Object.entries(groups).forEach(([key, groupCables]) => {
            const [from, to, type] = key.split('_');

            // Sort by length (Longest First Handling? or Just Sequence?)
            // Usually sequence is better for pulling, but let's stick to simple packing for now.
            // Let's sort by ID to be deterministic
            groupCables.sort((a, b) => a.name.localeCompare(b.name));

            let currentDrumPrefix = `${type.replace(/\//g, '-')}-${from}-${to}`;
            let currentDrumSeq = 1;
            let currentDrumCables: Cable[] = [];
            let currentDrumLength = 0;

            groupCables.forEach(cable => {
                const len = cable.calculatedLength || cable.length || 0;

                // If single cable is longer than drum unit, it needs its own drum (or specific warning)
                if (len > drumUnit) {
                    // Over-length drum
                    resultDrums.push({
                        drumId: `${currentDrumPrefix}-${currentDrumSeq++} (OVER)`,
                        fromNode: from,
                        toNode: to,
                        cableType: type,
                        cables: [cable],
                        totalLength: len,
                        capacity: len // Custom capacity for this
                    });
                } else {
                    // Check if fits
                    if (currentDrumLength + len <= drumUnit) {
                        currentDrumCables.push(cable);
                        currentDrumLength += len;
                    } else {
                        // Full, push current and start new
                        resultDrums.push({
                            drumId: `${currentDrumPrefix}-${currentDrumSeq++}`,
                            fromNode: from,
                            toNode: to,
                            cableType: type,
                            cables: currentDrumCables,
                            totalLength: currentDrumLength,
                            capacity: drumUnit
                        });
                        currentDrumCables = [cable];
                        currentDrumLength = len;
                    }
                }
            });

            // Push remainders
            if (currentDrumCables.length > 0) {
                resultDrums.push({
                    drumId: `${currentDrumPrefix}-${currentDrumSeq++}`,
                    fromNode: from,
                    toNode: to,
                    cableType: type,
                    cables: currentDrumCables,
                    totalLength: currentDrumLength,
                    capacity: drumUnit
                });
            }
        });

        return resultDrums.sort((a, b) => b.totalLength - a.totalLength);
    }, [cables, drumUnit]);

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return drumGroups;
        return drumGroups.filter(g =>
            g.drumId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.cables.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [drumGroups, searchTerm]);

    const handleExport = () => {
        const exportData = filteredGroups.flatMap(g =>
            g.cables.map(c => ({
                DRUM_NO: g.drumId,
                CABLE_NAME: c.name,
                TYPE: c.type,
                FROM_NODE: c.fromNode,
                TO_NODE: c.toNode,
                LENGTH: c.calculatedLength || c.length || 0,
                SYSTEM: c.system
            }))
        );
        ExcelService.exportToExcel(exportData, `drum_schedule_${drumUnit}m_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="flex flex-col h-full bg-seastar-900 p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-seastar-cyan flex items-center gap-2">
                    <Disc size={20} /> Drum Schedule Report
                </h2>
                <div className="flex items-center gap-4">
                    <div className="flex bg-seastar-800 rounded p-1">
                        <button
                            onClick={() => setDrumUnit(500)}
                            className={`px-3 py-1 text-xs rounded transition ${drumUnit === 500 ? 'bg-seastar-cyan text-seastar-900 font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                            500m
                        </button>
                        <button
                            onClick={() => setDrumUnit(1000)}
                            className={`px-3 py-1 text-xs rounded transition ${drumUnit === 1000 ? 'bg-seastar-cyan text-seastar-900 font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                            1000m
                        </button>
                    </div>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm">
                        <Download size={16} /> Export Excel
                    </button>
                </div>
            </div>

            <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2 flex-1">
                    <Search size={16} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by drum, node or cable..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="flex-1 px-3 py-2 bg-seastar-800 border border-seastar-700 rounded text-white"
                        title="Search drums"
                    />
                </div>
            </div>

            <div className="text-sm text-gray-400 mb-2">
                {filteredGroups.length} drums generated, {cables.length} cables processed
            </div>

            <div className="flex-1 overflow-auto space-y-4">
                {filteredGroups.slice(0, 50).map(drum => (
                    <div key={drum.drumId} className="glass-panel p-3 rounded-lg border border-seastar-700">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3">
                                <div className="text-lg font-bold text-seastar-cyan">{drum.drumId}</div>
                                <div className="text-xs px-2 py-0.5 rounded bg-seastar-800 text-gray-300 border border-seastar-600">
                                    {drum.cableType} | {drum.fromNode} → {drum.toNode}
                                </div>
                            </div>
                            <div className="flex gap-4 text-sm items-center">
                                <span className="text-blue-400">{drum.cables.length} cables</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${drum.totalLength > drum.capacity * 0.9 ? 'bg-red-500' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min((drum.totalLength / drum.capacity) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-yellow-400 font-mono w-16 text-right">{drum.totalLength.toFixed(0)} / {drum.capacity}</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                            {drum.cables.slice(0, 12).map(c => (
                                <div key={c.id} className="bg-seastar-800 px-2 py-1 rounded flex justify-between">
                                    <span className="text-gray-300 truncate">{c.name}</span>
                                    <span className="text-yellow-400 ml-2">{(c.calculatedLength || c.length || 0).toFixed(0)}m</span>
                                </div>
                            ))}
                            {drum.cables.length > 12 && (
                                <div className="text-gray-500 px-2 py-1 flex items-center justify-center bg-seastar-800/50 rounded">
                                    +{drum.cables.length - 12} more cables
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DrumScheduleReport;
