import React, { useState, useMemo } from 'react';
import { Node } from '../types';
import { Download, Search, Layers, FileText, Trash2 } from 'lucide-react';
import { ExcelService } from '../services/excelService';

interface NodeListReportProps {
    nodes: Node[];
    cables: Cable[]; // Added cables to align with App.tsx usage
}

const NodeListReport: React.FC<NodeListReportProps> = ({ nodes, cables }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [deckFilter, setDeckFilter] = useState('');
    const [showRawModal, setShowRawModal] = useState(false);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    const decks = useMemo(() => {
        const deckSet = new Set<string>();
        nodes.forEach(n => n.deck && deckSet.add(n.deck));
        return Array.from(deckSet).sort();
    }, [nodes]);

    const filteredNodes = useMemo(() => {
        return nodes.filter(n => {
            const matchSearch = !searchTerm ||
                n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (n.relation || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchDeck = !deckFilter || n.deck === deckFilter;
            return matchSearch && matchDeck;
        });
    }, [nodes, searchTerm, deckFilter]);

    const handleExport = () => {
        ExcelService.exportToExcel(filteredNodes, `node_list_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="flex flex-col h-full bg-seastar-900 p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-seastar-cyan flex items-center gap-2">
                    <Layers size={20} /> Node List Report
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
                        placeholder="Search nodes..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="flex-1 px-3 py-2 bg-seastar-800 border border-seastar-700 rounded text-white"
                        title="Search nodes"
                    />
                </div>
                <select
                    value={deckFilter}
                    onChange={e => setDeckFilter(e.target.value)}
                    className="px-3 py-2 bg-seastar-800 border border-seastar-700 rounded text-white"
                    title="Filter by deck"
                >
                    <option value="">All Decks</option>
                    {decks.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>

            <div className="text-sm text-gray-400 mb-2">
                Showing {filteredNodes.length} of {nodes.length} nodes
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-seastar-800 text-gray-300">
                        <tr>
                            <th className="px-3 py-2 text-left">Node Name</th>
                            <th className="px-3 py-2 text-left">Deck</th>
                            <th className="px-3 py-2 text-left">Relations</th>
                            <th className="px-3 py-2 text-right">Link Length</th>
                            <th className="px-3 py-2 text-right">Area Size</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-center">Raw</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredNodes.map(node => (
                            <tr key={node.name} className="border-t border-seastar-700 hover:bg-seastar-800">
                                <td className="px-3 py-2 text-seastar-cyan font-mono">{node.name}</td>
                                <td className="px-3 py-2">{node.deck || '-'}</td>
                                <td className="px-3 py-2 text-gray-400 text-xs max-w-[200px] truncate">{node.relation || '-'}</td>
                                <td className="px-3 py-2 text-right text-yellow-400">{node.linkLength || 0}</td>
                                <td className="px-3 py-2 text-right">{node.areaSize || '-'}</td>
                                <td className="px-3 py-2">{node.type || '-'}</td>
                                <td className="px-3 py-2 text-center">
                                    <button
                                        onClick={() => { setSelectedNode(node); setShowRawModal(true); }}
                                        className="text-gray-400 hover:text-white"
                                        title="View Raw Data"
                                    >
                                        <FileText size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* RAW DATA MODAL */}
            {showRawModal && selectedNode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowRawModal(false)}>
                    <div className="bg-seastar-800 border border-seastar-600 rounded-lg shadow-2xl w-[600px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-seastar-600 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FileText className="text-seastar-cyan" /> Raw Data: {selectedNode.name}
                            </h3>
                            <button onClick={() => setShowRawModal(false)} className="text-gray-400 hover:text-white"><Trash2 size={18} /></button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            <table className="w-full text-sm text-gray-300">
                                <tbody>
                                    {Object.entries(selectedNode).map(([key, value]) => (
                                        <tr key={key} className="border-b border-seastar-700">
                                            <td className="py-2 text-seastar-cyan font-mono w-1/3">{key}</td>
                                            <td className="py-2 font-bold break-all">{String(value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NodeListReport;
