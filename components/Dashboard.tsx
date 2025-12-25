import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Cable, Node } from '../types';
import { Activity, Disc, Ruler, Share2, AlertTriangle, Layers, CheckCircle } from 'lucide-react';

interface DashboardProps {
  cables: Cable[];
  nodes: Node[];
  onViewUnrouted: (type: 'missingLength' | 'unrouted') => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const Dashboard: React.FC<DashboardProps> = ({ cables, nodes, onViewUnrouted }) => {
  // Stats Calculation
  const stats = useMemo(() => {
    const totalCables = cables.length;
    const totalNodes = nodes.length;
    const totalLength = cables.reduce((acc, c) => acc + (c.calculatedLength || c.length || 0), 0);
    const routedCables = cables.filter(c => c.calculatedPath && c.calculatedPath.length > 0);
    const routingErrors = cables.filter(c =>
      c.fromNode && c.toNode &&
      (!c.calculatedPath || c.calculatedPath.length === 0)
    );
    const missingLength = cables.filter(c => !c.calculatedLength && !c.length);

    return { totalCables, totalNodes, totalLength, routedCables, routingErrors, missingLength };
  }, [cables, nodes]);

  // System breakdown with counts and total length
  const systemStats = useMemo(() => {
    const map: { [key: string]: { count: number, length: number } } = {};
    cables.forEach(c => {
      const sys = c.system || 'Unknown';
      if (!map[sys]) map[sys] = { count: 0, length: 0 };
      map[sys].count++;
      map[sys].length += (c.calculatedLength || c.length || 0);
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [cables]);

  // Type breakdown
  const typeStats = useMemo(() => {
    const map: { [key: string]: { count: number, length: number } } = {};
    cables.forEach(c => {
      const t = c.type || 'Unknown';
      if (!map[t]) map[t] = { count: 0, length: 0 };
      map[t].count++;
      map[t].length += (c.calculatedLength || c.length || 0);
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [cables]);

  // Deck breakdown
  const deckStats = useMemo(() => {
    const map: { [key: string]: { count: number, length: number } } = {};
    cables.forEach(c => {
      const deck = c.supplyDeck || c.fromDeck || 'Unknown';
      if (!map[deck]) map[deck] = { count: 0, length: 0 };
      map[deck].count++;
      map[deck].length += (c.calculatedLength || c.length || 0);
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cables]);

  const StatCard = ({ title, value, sub, icon: Icon, color, alert, onClick, cursor = 'default' }: any) => (
    <div
      onClick={onClick}
      className={`bg-seastar-800 border ${alert ? 'border-red-500' : 'border-seastar-700'} p-4 rounded-lg shadow-lg flex items-center gap-4 transition-transform hover:scale-105 ${cursor === 'pointer' ? 'cursor-pointer hover:bg-seastar-700' : ''}`}>
      <div className={`p-3 rounded-full bg-opacity-20 ${color.replace('text-', 'bg-')}`}>
        <Icon size={24} className={color} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-gray-400 uppercase tracking-wider">{title}</div>
        {sub && <div className="text-[10px] text-gray-500 mt-1">{sub}</div>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-seastar-900 overflow-y-auto p-4 custom-scrollbar">
      <h2 className="text-xl font-bold text-seastar-cyan mb-4 flex items-center gap-2">
        <Activity size={20} /> PROJECT DASHBOARD
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatCard title="Total Cables" value={stats.totalCables} icon={Disc} color="text-blue-400" />
        <StatCard title="Total Nodes" value={stats.totalNodes} icon={Share2} color="text-green-400" />
        <StatCard
          title="Total Length"
          value={`${(stats.totalLength / 1000).toFixed(1)} km`}
          sub={`${stats.totalLength.toLocaleString()} m`}
          icon={Ruler} color="text-yellow-400"
        />
        <StatCard
          title="Routed"
          value={stats.routedCables.length}
          sub={`${((stats.routedCables.length / stats.totalCables || 0) * 100).toFixed(0)}%`}
          icon={CheckCircle} color="text-green-400"
        />
        <StatCard
          title="Route Errors"
          value={stats.routingErrors.length}
          icon={AlertTriangle}
          color="text-red-400"
          alert={stats.routingErrors.length > 0}
          onClick={() => onViewUnrouted('unrouted')}
          cursor="pointer"
        />
        <StatCard
          title="Missing Length"
          value={stats.missingLength.length}
          icon={Ruler} color="text-orange-400"
          onClick={() => onViewUnrouted('missingLength')}
          cursor="pointer"
        />
      </div>

      {/* Routing Errors Panel */}
      {stats.routingErrors.length > 0 && (
        <div className="glass-panel p-3 rounded-lg border border-red-500 mb-4 max-h-32 overflow-y-auto">
          <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
            <AlertTriangle size={14} /> ROUTING ERRORS ({stats.routingErrors.length})
          </h3>
          <div className="flex flex-wrap gap-1">
            {stats.routingErrors.slice(0, 20).map(c => (
              <span key={c.id} className="px-2 py-0.5 bg-red-900/50 text-red-300 text-[10px] rounded">
                {c.name}: {c.fromNode} → {c.toNode}
              </span>
            ))}
            {stats.routingErrors.length > 20 && (
              <span className="text-red-400 text-[10px]">...and {stats.routingErrors.length - 20} more</span>
            )}
          </div>
        </div>
      )}

      {/* Three Column Stats Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* By System */}
        <div className="glass-panel p-3 rounded-lg border border-seastar-700">
          <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase flex items-center gap-2">
            <Layers size={14} /> By System
          </h3>
          <div className="max-h-40 overflow-y-auto text-[11px]">
            <table className="w-full">
              <thead className="text-gray-500 sticky top-0 bg-seastar-800">
                <tr><th className="text-left py-1">System</th><th className="text-right">Count</th><th className="text-right">Length</th></tr>
              </thead>
              <tbody>
                {systemStats.map(s => (
                  <tr key={s.name} className="border-t border-seastar-700 hover:bg-seastar-700/50">
                    <td className="py-1 text-gray-300">{s.name}</td>
                    <td className="text-right text-blue-400">{s.count}</td>
                    <td className="text-right text-yellow-400">{s.length.toFixed(0)}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* By Type */}
        <div className="glass-panel p-3 rounded-lg border border-seastar-700">
          <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase flex items-center gap-2">
            <Disc size={14} /> By Type (Top 15)
          </h3>
          <div className="max-h-40 overflow-y-auto text-[11px]">
            <table className="w-full">
              <thead className="text-gray-500 sticky top-0 bg-seastar-800">
                <tr><th className="text-left py-1">Type</th><th className="text-right">Count</th><th className="text-right">Length</th></tr>
              </thead>
              <tbody>
                {typeStats.map(s => (
                  <tr key={s.name} className="border-t border-seastar-700 hover:bg-seastar-700/50">
                    <td className="py-1 text-gray-300 truncate max-w-[100px]">{s.name}</td>
                    <td className="text-right text-blue-400">{s.count}</td>
                    <td className="text-right text-yellow-400">{s.length.toFixed(0)}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* By Deck */}
        <div className="glass-panel p-3 rounded-lg border border-seastar-700">
          <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase flex items-center gap-2">
            <Layers size={14} /> By Deck
          </h3>
          <div className="max-h-40 overflow-y-auto text-[11px]">
            <table className="w-full">
              <thead className="text-gray-500 sticky top-0 bg-seastar-800">
                <tr><th className="text-left py-1">Deck</th><th className="text-right">Count</th><th className="text-right">Length</th></tr>
              </thead>
              <tbody>
                {deckStats.map(s => (
                  <tr key={s.name} className="border-t border-seastar-700 hover:bg-seastar-700/50">
                    <td className="py-1 text-gray-300">{s.name}</td>
                    <td className="text-right text-blue-400">{s.count}</td>
                    <td className="text-right text-yellow-400">{s.length.toFixed(0)}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Pie Chart */}
        <div className="glass-panel p-4 rounded-lg border border-seastar-700 h-64">
          <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase">Cables by System</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={systemStats} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="count">
                {systemStats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '11px' }} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Type Bar Chart */}
        <div className="glass-panel p-4 rounded-lg border border-seastar-700 h-64">
          <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase">Top Cable Types</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeStats.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" stroke="#94a3b8" fontSize={9} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={70} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '11px' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;