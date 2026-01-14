import React, { useState, useEffect } from 'react';
import { Terminal, Database, Activity, RefreshCw, Trash2, HardDrive, User, Clock } from 'lucide-react';
import { useCableAuth } from '../../contexts/CableAuthContext';
import { cableEmployeeService } from '../../services/CableEmployeeService';

interface StorageItem {
    key: string;
    size: number;
    value: string;
    type: 'LOCAL' | 'SESSION';
}

const CableAdminConsole: React.FC = () => {
    const { user, isSuperAdmin } = useCableAuth();
    const [activeTab, setActiveTab] = useState<'CONSOLE' | 'STORAGE' | 'USER_LOGS'>('CONSOLE');
    const [systemLogs, setSystemLogs] = useState<any[]>([]);
    const [storageItems, setStorageItems] = useState<StorageItem[]>([]);

    useEffect(() => {
        // Initial load of logs
        refreshLogs();
    }, [user]);

    const refreshLogs = () => {
        if (isSuperAdmin) {
            setSystemLogs(cableEmployeeService.getGlobalLogs());
        } else if (user) {
            setSystemLogs(cableEmployeeService.getUserLogs(user.id));
        }
    };

    const refreshStorage = () => {
        const items: StorageItem[] = [];

        // LocalStorage - Filter by user if not admin (simulated security)
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                // If not SUPER_ADMIN, only show own data or safe keys
                if (!isSuperAdmin && !key.includes(user?.id || 'public')) {
                    continue;
                }

                const value = localStorage.getItem(key) || '';
                items.push({
                    key,
                    value,
                    size: new Blob([value]).size,
                    type: 'LOCAL'
                });
            }
        }

        setStorageItems(items);
    };

    React.useEffect(() => {
        if (activeTab === 'STORAGE') {
            refreshStorage();
        } else if (activeTab === 'CONSOLE') {
            refreshLogs();
        }
    }, [activeTab]);

    const clearStorage = (type: 'LOCAL' | 'SESSION') => {
        if (confirm(`Are you sure you want to clear all ${type} storage?`)) {
            // In a real app, strict user isolation would happen here.
            // For this demo, we just warn/clear context.
            if (type === 'LOCAL') {
                // Danger zone
            }
            refreshStorage();
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Tabs */}
            <div className="flex items-center px-6 border-b bg-white">
                <button
                    onClick={() => setActiveTab('CONSOLE')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'CONSOLE'
                            ? 'border-slate-800 text-slate-800'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Terminal size={16} />
                    System Console
                </button>
                <button
                    onClick={() => setActiveTab('STORAGE')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'STORAGE'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Database size={16} />
                    Storage Inspector
                </button>
            </div>

            <div className="flex-1 overflow-hidden p-6">
                {activeTab === 'CONSOLE' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* Status Panel */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Activity size={16} />
                                    Current Session
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-slate-600">User</span>
                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold flex items-center gap-1">
                                            <User size={10} />
                                            {user?.name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-slate-600">Role</span>
                                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">{user?.role}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-slate-600">Data Isolation</span>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">ACTIVE</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Log Terminal */}
                        <div className="lg:col-span-2 bg-slate-900 rounded-xl shadow-lg border border-slate-700 flex flex-col overflow-hidden font-mono text-sm">
                            <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
                                <span className="text-slate-400 font-bold text-xs">
                                    {isSuperAdmin ? 'root@cable-system:~# global_logs' : `${user?.id}@cable-system:~# user_logs`}
                                </span>
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                                </div>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto text-green-400 space-y-1">
                                {systemLogs.length === 0 && (
                                    <div className="text-slate-600 italic">No logs available.</div>
                                )}
                                {systemLogs.map((log, i) => (
                                    <div key={i} className="break-all border-b border-slate-800/50 pb-1 mb-1 last:border-0">
                                        <span className="text-slate-500 text-[10px] mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                        {log.userId && <span className="text-purple-400 text-[10px] mr-2">@{log.userId}</span>}
                                        <span className="text-yellow-500 text-[10px] mr-2">[{log.type}]</span>
                                        {log.message}
                                    </div>
                                ))}
                                <div className="animate-pulse">_</div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'STORAGE' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <HardDrive className="text-slate-400" size={18} />
                                <h3 className="font-bold text-slate-700">Storage Inspector {isSuperAdmin ? '(Root)' : '(User Scope)'}</h3>
                                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
                                    {storageItems.length} items
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={refreshStorage}
                                    className="text-xs font-bold text-slate-600 hover:bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors flex items-center gap-1"
                                >
                                    <RefreshCw size={12} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b">Type</th>
                                        <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b">Key</th>
                                        <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b">Size</th>
                                        <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b w-1/2">Value Preview</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {storageItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-400 text-sm">
                                                No items found in storage scope.
                                            </td>
                                        </tr>
                                    ) : (
                                        storageItems.map(item => (
                                            <tr key={item.key} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="p-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.type === 'LOCAL' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-sm font-medium text-slate-700 font-mono">{item.key}</td>
                                                <td className="p-3 text-xs text-slate-500">{item.size} bytes</td>
                                                <td className="p-3">
                                                    <code className="block text-[10px] text-slate-600 bg-slate-100 p-1.5 rounded border border-slate-200 max-w-md truncate font-mono" title={item.value}>
                                                        {item.value}
                                                    </code>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CableAdminConsole;
