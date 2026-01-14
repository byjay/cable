
import React, { useMemo } from 'react';
import { Cable } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
    cables: Cable[];
}

const InstallationStatusView: React.FC<Props> = ({ cables }) => {

    // Aggregation Logic (Simulating Excel Macro)
    const stats = useMemo(() => {
        const typeStats: Record<string, { type: string, total: number, installed: number, totalLength: number, installedLength: number }> = {};

        cables.forEach(c => {
            const type = c.type || 'UNKNOWN';
            if (!typeStats[type]) {
                typeStats[type] = { type, total: 0, installed: 0, totalLength: 0, installedLength: 0 };
            }

            typeStats[type].total++;
            typeStats[type].totalLength += (c.length || 0);

            // Check Install Status based on 'status' field or 'installDate'
            const isInstalled = c.status === 'Installed' || !!c.installDate;

            if (isInstalled) {
                typeStats[type].installed++;
                typeStats[type].installedLength += (c.length || 0);
            }
        });

        // Convert to Array for Chart
        return Object.values(typeStats).map(s => ({
            ...s,
            progress: s.total > 0 ? (s.installed / s.total) * 100 : 0,
            remaining: s.total - s.installed
        })).sort((a, b) => b.total - a.total); // Sort by quantity

    }, [cables]);

    // Totals
    const totalCables = cables.length;
    const totalInstalled = stats.reduce((acc, s) => acc + s.installed, 0);
    const totalProgress = totalCables > 0 ? (totalInstalled / totalCables) * 100 : 0;

    return (
        <div className="flex-1 p-6 bg-slate-900 text-white overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Activity className="text-seastar-neon" />
                Installation Performance (포설 실적)
            </h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <div className="text-slate-400 text-sm uppercase font-bold">Total Cables</div>
                    <div className="text-4xl font-black mt-2">{totalCables.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">EA</div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <div className="text-slate-400 text-sm uppercase font-bold">Installed</div>
                    <div className="text-4xl font-black mt-2 text-emerald-400">{totalInstalled.toLocaleString()}</div>
                    <div className="text-xs text-emerald-500/50 mt-1 font-bold">
                        {totalProgress.toFixed(1)}% Completion
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <div className="text-slate-400 text-sm uppercase font-bold">Remaining</div>
                    <div className="text-4xl font-black mt-2 text-amber-400">{(totalCables - totalInstalled).toLocaleString()}</div>
                    <div className="text-xs text-amber-500/50 mt-1">To Go</div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-8 h-[400px]">
                <h3 className="text-lg font-bold mb-4">Installation by Cable Type</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="type" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend />
                        <Bar dataKey="installed" name="Installed" stackId="a" fill="#10b981" />
                        <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#334155" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Detailed Table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700 font-bold">Detailed Status by Type</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Total Qty</th>
                                <th className="px-6 py-3">Installed Qty</th>
                                <th className="px-6 py-3">Progress (%)</th>
                                <th className="px-6 py-3">Total Len (m)</th>
                                <th className="px-6 py-3">Installed Len (m)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {stats.map((row) => (
                                <tr key={row.type} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-seastar-cyan">{row.type}</td>
                                    <td className="px-6 py-4">{row.total}</td>
                                    <td className="px-6 py-4 text-emerald-400 font-bold">{row.installed}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500" style={{ width: `${row.progress}%` }}></div>
                                            </div>
                                            <span>{row.progress.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{row.totalLength.toFixed(1)}</td>
                                    <td className="px-6 py-4 text-slate-400">{row.installedLength.toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InstallationStatusView;
