import React, { useState, useEffect } from 'react';
import { History, RotateCcw, Trash2, Clock, Database } from 'lucide-react';
import { HistoryService, HistoryEntry } from '../services/historyService';
import { Cable, Node, CableType } from '../types';

interface HistoryViewerProps {
    projectId: string;
    onRestore: (cables: Cable[], nodes: Node[], cableTypes: CableType[]) => void;
}

const HistoryViewer: React.FC<HistoryViewerProps> = ({ projectId, onRestore }) => {
    const [entries, setEntries] = useState<HistoryEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

    useEffect(() => {
        loadHistory();
    }, [projectId]);

    const loadHistory = () => {
        const history = HistoryService.getProjectHistory(projectId);
        setEntries(history);
    };

    const handleRestore = (entry: HistoryEntry) => {
        if (confirm(`Restore to "${entry.action}" from ${new Date(entry.timestamp).toLocaleString()}?`)) {
            onRestore(entry.snapshot.cables, entry.snapshot.nodes, entry.snapshot.cableTypes);
            alert('Data restored successfully!');
        }
    };

    const handleDelete = (entryId: string) => {
        if (confirm('Delete this history entry?')) {
            HistoryService.deleteEntry(entryId);
            loadHistory();
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col h-full bg-seastar-900 p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-seastar-cyan flex items-center gap-2">
                    <History size={20} /> History & Restore
                </h2>
                <div className="text-sm text-gray-400">
                    {entries.length} snapshots saved
                </div>
            </div>

            {entries.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                        <Database size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No history entries yet.</p>
                        <p className="text-sm">Changes will be automatically recorded.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
                    {/* History List */}
                    <div className="lg:col-span-2 overflow-auto space-y-2">
                        {entries.map(entry => (
                            <div
                                key={entry.id}
                                onClick={() => setSelectedEntry(entry)}
                                className={`p-3 rounded-lg cursor-pointer transition border ${selectedEntry?.id === entry.id
                                        ? 'bg-seastar-cyan/20 border-seastar-cyan'
                                        : 'bg-seastar-800 border-seastar-700 hover:border-seastar-600'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-white">{entry.action}</div>
                                        <div className="text-sm text-gray-400">{entry.description}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Clock size={12} /> {formatTime(entry.timestamp)}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRestore(entry); }}
                                            className="p-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white"
                                            title="Restore to this point"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                            className="p-1.5 rounded bg-red-600/50 hover:bg-red-600 text-white"
                                            title="Delete this entry"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                                    <span>Cables: {entry.snapshot.cables.length}</span>
                                    <span>Nodes: {entry.snapshot.nodes.length}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Preview Panel */}
                    <div className="glass-panel p-4 rounded-lg border border-seastar-700 overflow-auto">
                        <h3 className="text-sm font-bold text-gray-300 mb-3">Snapshot Preview</h3>
                        {selectedEntry ? (
                            <div className="space-y-3 text-sm">
                                <div className="bg-seastar-800 p-2 rounded">
                                    <div className="text-xs text-gray-400">Action</div>
                                    <div className="text-white font-bold">{selectedEntry.action}</div>
                                </div>
                                <div className="bg-seastar-800 p-2 rounded">
                                    <div className="text-xs text-gray-400">Timestamp</div>
                                    <div className="text-yellow-400">{new Date(selectedEntry.timestamp).toLocaleString()}</div>
                                </div>
                                <div className="bg-seastar-800 p-2 rounded">
                                    <div className="text-xs text-gray-400">Description</div>
                                    <div className="text-gray-300">{selectedEntry.description}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-seastar-800 p-2 rounded text-center">
                                        <div className="text-2xl font-bold text-blue-400">{selectedEntry.snapshot.cables.length}</div>
                                        <div className="text-xs text-gray-400">Cables</div>
                                    </div>
                                    <div className="bg-seastar-800 p-2 rounded text-center">
                                        <div className="text-2xl font-bold text-green-400">{selectedEntry.snapshot.nodes.length}</div>
                                        <div className="text-xs text-gray-400">Nodes</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRestore(selectedEntry)}
                                    className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                                >
                                    <RotateCcw size={16} /> Restore to This Point
                                </button>
                            </div>
                        ) : (
                            <div className="text-gray-500 text-center py-8">
                                Select an entry to preview
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryViewer;
