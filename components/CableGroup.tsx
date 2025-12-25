import React, { useState, useMemo } from 'react';
import { Cable } from '../types';
import { Download, Search, Layers } from 'lucide-react';
import { ExcelService } from '../services/excelService';

interface CableGroupProps {
    cables: Cable[];
}

const CableGroup: React.FC<CableGroupProps> = ({ cables }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [groupBy, setGroupBy] = useState<'system' | 'type' | 'deck'>('system');

    const groups = useMemo(() => {
        const result: { [key: string]: Cable[] } = {};
        cables.forEach(c => {
            const key = String(c[groupBy] || 'Unknown');
            if (!result[key]) result[key] = [];
            result[key].push(c);
        });
        return Object.entries(result)
            .map(([name, cables]) => ({
                name,
                cables,
                count: cables.length,
                totalLength: cables.reduce((sum, c) => sum + (c.calculatedLength || c.length || 0), 0)
            }))
            .sort((a, b) => b.count - a.count);
    }, [cables, groupBy]);

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return groups;
        return groups.filter(g =>
            g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.cables.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [groups, searchTerm]);

    const handleExport = () => {
        const exportData = filteredGroups.flatMap(g =>
            g.cables.map(c => ({
                GROUP: g.name,
                CABLE_NAME: c.name,
                TYPE: c.type,
                FROM_NODE: c.fromNode,
                TO_NODE: c.toNode,
                LENGTH: c.calculatedLength || c.length || 0,
                SYSTEM: c.system
            }))
        );
        ExcelService.exportToExcel(exportData, `cable_group_by_${groupBy}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="flex flex-col h-full bg-seastar-900 p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-seastar-cyan flex items-center gap-2">
                    <Layers size={20} /> Cable Group Analysis
                </h2>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">
                    <Download size={16} /> Export Excel
                </button>
            </div>

            <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2 flex-1">
                    <Search size={16} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search groups or cables..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="flex-1 px-3 py-2 bg-seastar-800 border border-seastar-700 rounded text-white"
                        title="Search cable groups"
                    />
                </div>
                <select
                    value={groupBy}
                    onChange={e => setGroupBy(e.target.value as 'system' | 'type' | 'deck')}
                    className="px-3 py-2 bg-seastar-800 border border-seastar-700 rounded text-white"
                    title="Group by field"
                >
                    <option value="system">Group by System</option>
                    <option value="type">Group by Type</option>
                    <option value="deck">Group by Deck</option>
                </select>
            </div>

            <div className="text-sm text-gray-400 mb-2">
                {filteredGroups.length} groups, {cables.length} total cables
            </div>

            <div className="flex-1 overflow-auto space-y-3">
                {filteredGroups.map(group => (
                    <div key={group.name} className="glass-panel p-4 rounded-lg border border-seastar-700">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-lg font-bold text-seastar-cyan">{group.name}</div>
                            <div className="flex gap-4 text-sm">
                                <span className="text-blue-400">{group.count} cables</span>
                                <span className="text-yellow-400">{group.totalLength.toFixed(0)}m</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs max-h-24 overflow-y-auto">
                            {group.cables.slice(0, 18).map(c => (
                                <div key={c.id} className="bg-seastar-800 px-2 py-1 rounded truncate" title={c.name}>
                                    {c.name}
                                </div>
                            ))}
                            {group.cables.length > 18 && (
                                <div className="text-gray-500 px-2 py-1">+{group.cables.length - 18} more</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CableGroup;
