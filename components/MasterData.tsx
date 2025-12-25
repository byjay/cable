import React from 'react';
import { Database, Upload, Download, RefreshCw } from 'lucide-react';
import { Cable, Node, CableType } from '../types';

interface MasterDataProps {
    cables: Cable[];
    nodes: Node[];
    cableTypes: CableType[];
    onImportCables?: (cables: Cable[]) => void;
    onImportNodes?: (nodes: Node[]) => void;
}

const MasterData: React.FC<MasterDataProps> = ({ cables, nodes, cableTypes }) => {
    const stats = [
        { label: 'Cables', value: cables.length, color: 'text-blue-400', icon: Database },
        { label: 'Nodes', value: nodes.length, color: 'text-green-400', icon: Database },
        { label: 'Cable Types', value: cableTypes.length, color: 'text-yellow-400', icon: Database },
    ];

    return (
        <div className="flex flex-col h-full bg-seastar-900 p-4">
            <h2 className="text-xl font-bold text-seastar-cyan mb-4 flex items-center gap-2">
                <Database size={20} /> Master Data Management
            </h2>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {stats.map(stat => (
                    <div key={stat.label} className="glass-panel p-4 rounded-lg border border-seastar-700 text-center">
                        <stat.icon size={24} className={`${stat.color} mx-auto mb-2`} />
                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs text-gray-400 uppercase">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Data Tables Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                {/* Cable Data */}
                <div className="glass-panel p-4 rounded-lg border border-seastar-700">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-gray-300">Cable Data</h3>
                        <div className="flex gap-2">
                            <button className="p-1.5 rounded bg-seastar-700 hover:bg-seastar-600 text-gray-300" title="Import">
                                <Upload size={14} />
                            </button>
                            <button className="p-1.5 rounded bg-seastar-700 hover:bg-seastar-600 text-gray-300" title="Export">
                                <Download size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                        {cables.filter(c => c.calculatedPath?.length).length} routed / {cables.length} total
                    </div>
                    <div className="max-h-48 overflow-y-auto text-xs">
                        <table className="w-full">
                            <thead className="text-gray-500 sticky top-0 bg-seastar-800">
                                <tr>
                                    <th className="text-left py-1">Name</th>
                                    <th className="text-left">From</th>
                                    <th className="text-left">To</th>
                                    <th className="text-right">Length</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cables.slice(0, 20).map(c => (
                                    <tr key={c.id} className="border-t border-seastar-700">
                                        <td className="py-1 text-gray-300">{c.name}</td>
                                        <td className="text-gray-400">{c.fromNode}</td>
                                        <td className="text-gray-400">{c.toNode}</td>
                                        <td className="text-right text-yellow-400">{(c.calculatedLength || c.length || 0).toFixed(0)}m</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Node Data */}
                <div className="glass-panel p-4 rounded-lg border border-seastar-700">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-gray-300">Node Data</h3>
                        <div className="flex gap-2">
                            <button className="p-1.5 rounded bg-seastar-700 hover:bg-seastar-600 text-gray-300" title="Import">
                                <Upload size={14} />
                            </button>
                            <button className="p-1.5 rounded bg-seastar-700 hover:bg-seastar-600 text-gray-300" title="Export">
                                <Download size={14} />
                            </button>
                            <button className="p-1.5 rounded bg-seastar-700 hover:bg-seastar-600 text-gray-300" title="Refresh">
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{nodes.length} nodes loaded</div>
                    <div className="max-h-48 overflow-y-auto text-xs">
                        <table className="w-full">
                            <thead className="text-gray-500 sticky top-0 bg-seastar-800">
                                <tr>
                                    <th className="text-left py-1">Name</th>
                                    <th className="text-left">Deck</th>
                                    <th className="text-left">Relations</th>
                                </tr>
                            </thead>
                            <tbody>
                                {nodes.slice(0, 20).map(n => (
                                    <tr key={n.name} className="border-t border-seastar-700">
                                        <td className="py-1 text-seastar-cyan">{n.name}</td>
                                        <td className="text-gray-400">{n.deck || '-'}</td>
                                        <td className="text-gray-500 truncate max-w-[100px]">{n.relation || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MasterData;
