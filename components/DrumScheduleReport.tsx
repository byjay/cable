import React, { useState, useMemo } from 'react';
import { Cable } from '../types';
import { Download, Search, Disc } from 'lucide-react';
import { ExcelService } from '../services/excelService';

interface DrumScheduleReportProps {
    cables: Cable[];
}

const DrumScheduleReport: React.FC<DrumScheduleReportProps> = ({ cables }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Group cables by FROM_NODE for drum calculation
    const drumGroups = useMemo(() => {
        const groups: { [fromNode: string]: Cable[] } = {};
        cables.forEach(c => {
            if (c.fromNode) {
                if (!groups[c.fromNode]) groups[c.fromNode] = [];
                groups[c.fromNode].push(c);
            }
        });
        return Object.entries(groups)
            .map(([fromNode, cables]) => ({
                fromNode,
                cables,
                totalLength: cables.reduce((sum, c) => sum + (c.calculatedLength || c.length || 0), 0),
                cableCount: cables.length
            }))
            .sort((a, b) => b.totalLength - a.totalLength);
    }, [cables]);

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return drumGroups;
        return drumGroups.filter(g =>
            g.fromNode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.cables.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [drumGroups, searchTerm]);

    const handleExport = () => {
        const exportData = filteredGroups.flatMap(g =>
            g.cables.map(c => ({
                DRUM_GROUP: g.fromNode,
                CABLE_NAME: c.name,
                TYPE: c.type,
                FROM_NODE: c.fromNode,
                TO_NODE: c.toNode,
                LENGTH: c.calculatedLength || c.length || 0,
                SYSTEM: c.system
            }))
        );
        ExcelService.exportToExcel(exportData, `drum_schedule_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="flex flex-col h-full bg-seastar-900 p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-seastar-cyan flex items-center gap-2">
                    <Disc size={20} /> Drum Schedule Report
                </h2>
                <button onClick={handleExport} className="btn-primary flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">
                    <Download size={16} /> Export Excel
                </button>
            </div>

            <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2 flex-1">
                    <Search size={16} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by node or cable name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="flex-1 px-3 py-2 bg-seastar-800 border border-seastar-700 rounded text-white"
                        title="Search drums"
                    />
                </div>
            </div>

            <div className="text-sm text-gray-400 mb-2">
                {filteredGroups.length} drum groups, {cables.length} total cables
            </div>

            <div className="flex-1 overflow-auto space-y-4">
                {filteredGroups.slice(0, 50).map(group => (
                    <div key={group.fromNode} className="glass-panel p-3 rounded-lg border border-seastar-700">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-lg font-bold text-seastar-cyan">{group.fromNode}</div>
                            <div className="flex gap-4 text-sm">
                                <span className="text-blue-400">{group.cableCount} cables</span>
                                <span className="text-yellow-400">{group.totalLength.toFixed(0)}m total</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                            {group.cables.slice(0, 12).map(c => (
                                <div key={c.id} className="bg-seastar-800 px-2 py-1 rounded flex justify-between">
                                    <span className="text-gray-300 truncate">{c.name}</span>
                                    <span className="text-yellow-400 ml-2">{(c.calculatedLength || c.length || 0).toFixed(0)}m</span>
                                </div>
                            ))}
                            {group.cables.length > 12 && (
                                <div className="text-gray-500 px-2 py-1">+{group.cables.length - 12} more</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DrumScheduleReport;
