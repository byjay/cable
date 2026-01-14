import React, { useMemo } from 'react';
import { Cable, Node } from '../types';
import { AnalyticsService, KPIStats } from '../services/AnalyticsService';
import {
    Activity,
    Zap,
    Weight,
    Ruler,
    AlertTriangle,
    CheckCircle2,
    BarChart3,
    TrendingUp,
    Anchor
} from 'lucide-react';

import DataVerification from './DataVerification';

interface DashboardViewProps {
    cables: Cable[];
    nodes: Node[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ cables, nodes }) => {
    const stats = useMemo(() => AnalyticsService.calculateKPIs(cables, nodes), [cables, nodes]);

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-900/50">
            {/* Header Section */}
            <div className="flex justify-between items-end pb-4 border-b border-white/10">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Project Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-1">Real-time cable management analytics & health monitoring</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-500 text-[10px] font-bold uppercase tracking-wider">System Live</span>
                </div>
            </div>

            {/* Health & Data Integrity */}
            <DataVerification cables={cables} nodes={nodes} />

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Progress"
                    value={`${stats.completionRate.toFixed(1)}%`}
                    subtitle={`${stats.routedCables} / ${stats.totalCables} Routed`}
                    icon={<CheckCircle2 className="text-emerald-400" size={24} />}
                    color="bg-emerald-500/10 border-emerald-500/20"
                />
                <StatCard
                    title="Total Weight"
                    value={`${stats.totalWeightMT.toFixed(2)} MT`}
                    subtitle="Metric Tons"
                    icon={<Weight className="text-blue-400" size={24} />}
                    color="bg-blue-500/10 border-blue-500/20"
                />
                <StatCard
                    title="Total Length"
                    value={`${stats.totalLengthKm.toFixed(2)} km`}
                    subtitle="Estimated Path"
                    icon={<Ruler className="text-purple-400" size={24} />}
                    color="bg-purple-500/10 border-purple-500/20"
                />
                <StatCard
                    title="Health Alert"
                    value={stats.highRiskTrays.toString()}
                    subtitle="Overfilled Trays (>40%)"
                    icon={<AlertTriangle className={stats.highRiskTrays > 0 ? "text-amber-400" : "text-slate-400"} size={24} />}
                    color={stats.highRiskTrays > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-slate-500/10 border-slate-500/20"}
                />
            </div>

            {/* Charts & Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Occupancy Distribution */}
                <div className="lg:col-span-2 bg-slate-800/40 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-6 text-white font-bold">
                        <BarChart3 size={18} className="text-seastar-neon" />
                        Tray Occupancy Distribution
                    </div>
                    <div className="flex items-end gap-2 h-48 px-4">
                        <Bar value={stats.occupancyDistribution.safe} label="Safe (0-20%)" color="bg-emerald-500" max={nodes.length} />
                        <Bar value={stats.occupancyDistribution.moderate} label="Moderate (20-40%)" color="bg-blue-500" max={nodes.length} />
                        <Bar value={stats.occupancyDistribution.heavy} label="Heavy (40-60%)" color="bg-amber-500" max={nodes.length} />
                        <Bar value={stats.occupancyDistribution.critical} label="Critical (60%+)" color="bg-rose-500" max={nodes.length} />
                    </div>
                </div>

                {/* Efficiency Score */}
                <div className="bg-gradient-to-br from-seastar-800 to-seastar-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Anchor size={120} />
                    </div>
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">Overall Efficiency</div>
                    <div className="text-6xl font-black text-seastar-neon drop-shadow-neon">
                        {Math.round(100 - (stats.averageFillRatio / 2))}%
                    </div>
                    <p className="text-slate-500 text-[10px] mt-4 text-center px-4 leading-relaxed italic">
                        Based on routing optimality, weight distribution, and tray capacity utilization.
                    </p>
                    <div className="mt-8 flex gap-4 w-full px-2">
                        <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                            <div className="text-[10px] text-slate-400">Avg Fill</div>
                            <div className="font-bold text-white">{stats.averageFillRatio.toFixed(1)}%</div>
                        </div>
                        <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                            <div className="text-[10px] text-slate-400">Bottlenecks</div>
                            <div className="font-bold text-rose-500">{stats.highRiskTrays}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section - Recent Observations */}
            <div className="bg-slate-800/20 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Zap size={16} className="text-blue-400" />
                    </div>
                    <div className="text-sm">
                        <span className="text-slate-300">Intelligent Routing is currently </span>
                        <span className="text-emerald-400 font-bold">Optimizing</span>
                        <span className="text-slate-500 ml-2 text-xs">| Capacity penalties applied to {stats.highRiskTrays} saturated nodes.</span>
                    </div>
                </div>
                <button className="text-[10px] font-bold text-seastar-cyan uppercase tracking-widest hover:text-white transition-colors">
                    Detailed Analytics &rarr;
                </button>
            </div>
        </div>
    );
};

// Sub-components
const StatCard = ({ title, value, subtitle, icon, color }: { title: string, value: string, subtitle: string, icon: React.ReactNode, color: string }) => (
    <div className={`${color} border rounded-2xl p-5 hover:scale-[1.02] transition-transform cursor-default group`}>
        <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</span>
            <div className="group-hover:rotate-12 transition-transform">{icon}</div>
        </div>
        <div className="text-2xl font-black text-white">{value}</div>
        <div className="text-[10px] text-slate-500 mt-1 font-medium">{subtitle}</div>
    </div>
);

const Bar = ({ value, label, color, max }: { value: number, label: string, color: string, max: number }) => {
    const heightPercent = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="flex-1 flex flex-col items-center group relative">
            <div className="w-full bg-slate-700/30 rounded-t-lg relative overflow-hidden flex flex-col justify-end" style={{ height: '100%' }}>
                <div
                    className={`${color} w-full rounded-t-lg transition-all duration-1000 ease-out flex items-center justify-center`}
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                >
                    {value > 0 && <span className="text-[9px] font-black text-white transform -rotate-90 md:rotate-0">{value}</span>}
                </div>
            </div>
            <div className="mt-2 text-[8px] text-slate-500 font-bold uppercase whitespace-nowrap">{label}</div>

            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-700 text-white text-[8px] px-2 py-1 rounded shadow-xl z-10">
                {value} Nodes
            </div>
        </div>
    );
};

export default DashboardView;
