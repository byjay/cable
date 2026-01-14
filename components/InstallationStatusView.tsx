
import React, { useMemo } from 'react';
import { Cable } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, PieChart as PieIcon } from 'lucide-react';

interface Props {
    cables: Cable[];
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

const InstallationStatusView: React.FC<Props> = ({ cables }) => {

    // Aggregation Logic (Excel Macro Logic)
    const { stats, pieData } = useMemo(() => {
        const typeStats: Record<string, { type: string, total: number, installed: number, totalLength: number, installedLength: number }> = {};

        cables.forEach(c => {
            const type = c.type || 'UNKNOWN';
            if (!typeStats[type]) {
                typeStats[type] = { type, total: 0, installed: 0, totalLength: 0, installedLength: 0 };
            }

            typeStats[type].total++;
            typeStats[type].totalLength += (c.length || 0);

            // Check Install Status
            const isInstalled = c.status === 'Installed' || !!c.installDate;

            if (isInstalled) {
                typeStats[type].installed++;
                typeStats[type].installedLength += (c.length || 0);
            }
        });

        // Bar Data
        const barData = Object.values(typeStats).map(s => ({
            ...s,
            progress: s.total > 0 ? (s.installed / s.total) * 100 : 0,
            remaining: s.total - s.installed
        })).sort((a, b) => b.total - a.total);

        // Pie Data (Overall Status)
        const totalInstalled = barData.reduce((acc, s) => acc + s.installed, 0);
        const totalRemaining = barData.reduce((acc, s) => acc + s.remaining, 0);

        const pData = [
            { name: 'Installed', value: totalInstalled },
            { name: 'Remaining', value: totalRemaining }
        ];

        return { stats: barData, pieData: pData };

    }, [cables]);

    // Totals
    const totalCables = cables.length;
    const totalInstalled = pieData[0].value;
    const totalProgress = totalCables > 0 ? (totalInstalled / totalCables) * 100 : 0;

    return (
        <div className="flex-1 p-6 bg-slate-900 text-white overflow-y-auto h-full">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Activity className="text-seastar-neon" />
                Installation Performance (포설 실적)
            </h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <div className="text-slate-400 text-sm uppercase font-bold">Total Requirements</div>
                    <div className="text-4xl font-black mt-2">{totalCables.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">Cables</div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <div className="text-slate-400 text-sm uppercase font-bold">Installed</div>
                    <div className="text-4xl font-black mt-2 text-emerald-400">{totalInstalled.toLocaleString()}</div>
                    <div className="text-xs text-emerald-500/50 mt-1 font-bold">
                        {totalProgress.toFixed(1)}% Done
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <div className="text-slate-400 text-sm uppercase font-bold">Remaining</div>
                    <div className="text-4xl font-black mt-2 text-amber-400">{(totalCables - totalInstalled).toLocaleString()}</div>
                    <div className="text-xs text-amber-500/50 mt-1">To Go</div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col justify-center items-center">
                    {/* Mini Pie */}
                    <span className="text-slate-400 text-xs font-bold mb-2">OVERALL PROGRESS</span>
                    <div className="h-16 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%" cy="50%"
                                    innerRadius={25} outerRadius={35}
                                    paddingAngle={5} dataKey="value"
                                >
                                    <Cell key="cell-0" fill="#10b981" />
                                    <Cell key="cell-1" fill="#334155" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 h-[400px]">
                {/* Bar Chart Section */}
                <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity size={18} /> By Cable Type</h3>
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

                {/* Pie Chart Section - Detailed */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><PieIcon size={18} /> Status Distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                <Cell key="cell-installed" fill="#10b981" />
                                <Cell key="cell-remaining" fill="#334155" />
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                <div className="p-4 border-b border-slate-700 font-bold flex justify-between items-center">
                    <span>Detailed Status by Type</span>
                    <button className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors">Export CSV</button>
                </div>
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
