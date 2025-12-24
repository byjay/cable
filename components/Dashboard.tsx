import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Cable, Node } from '../types';
import { Activity, Disc, Ruler, Share2 } from 'lucide-react';

interface DashboardProps {
  cables: Cable[];
  nodes: Node[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC<DashboardProps> = ({ cables, nodes }) => {
  // Stats Calculation
  const totalCables = cables.length;
  const totalNodes = nodes.length;
  const totalLength = cables.reduce((acc, c) => acc + (c.calculatedLength || c.length || 0), 0);
  const calculatedPaths = cables.filter(c => c.calculatedPath && c.calculatedPath.length > 0).length;

  // Chart Data Preparation
  const getSystemData = () => {
      const counts: {[key:string]: number} = {};
      cables.forEach(c => {
          const sys = c.system || 'Unknown';
          counts[sys] = (counts[sys] || 0) + 1;
      });
      return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  };

  const getTypeData = () => {
      const counts: {[key:string]: number} = {};
      cables.forEach(c => {
          const t = c.type || 'Unknown';
          counts[t] = (counts[t] || 0) + 1;
      });
      return Object.keys(counts)
        .map(k => ({ name: k, count: counts[k] }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 10);
  };

  const getNodeData = () => {
      // Approximate connection count based on cables using From/To
      const counts: {[key:string]: number} = {};
      cables.forEach(c => {
          if(c.fromNode) counts[c.fromNode] = (counts[c.fromNode] || 0) + 1;
          if(c.toNode) counts[c.toNode] = (counts[c.toNode] || 0) + 1;
      });
      return Object.keys(counts)
        .map(k => ({ name: k, connections: counts[k] }))
        .sort((a,b) => b.connections - a.connections)
        .slice(0, 10);
  };

  const systemData = getSystemData();
  const typeData = getTypeData();
  const nodeData = getNodeData();

  const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
      <div className="bg-seastar-800 border border-seastar-700 p-4 rounded-lg shadow-lg flex items-center gap-4">
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
          <Activity size={20}/> PROJECT DASHBOARD
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard 
            title="Total Cables" 
            value={totalCables} 
            icon={Disc} 
            color="text-blue-400" 
          />
          <StatCard 
            title="Total Nodes" 
            value={totalNodes} 
            icon={Share2} 
            color="text-green-400" 
          />
          <StatCard 
            title="Total Length" 
            value={`${(totalLength / 1000).toFixed(2)} km`} 
            sub={`${totalLength.toLocaleString()} m`}
            icon={Ruler} 
            color="text-yellow-400" 
          />
          <StatCard 
            title="Routed Cables" 
            value={calculatedPaths} 
            sub={`${((calculatedPaths/totalCables || 0)*100).toFixed(1)}%`}
            icon={Activity} 
            color="text-pink-400" 
          />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          
          {/* System Distribution */}
          <div className="glass-panel p-4 rounded-lg border border-seastar-700 h-80">
              <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase">Cables by System</h3>
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie
                        data={systemData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {systemData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}}
                        itemStyle={{color: '#fff'}}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
              </ResponsiveContainer>
          </div>

          {/* Type Distribution */}
          <div className="glass-panel p-4 rounded-lg border border-seastar-700 h-80">
              <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase">Top 10 Cable Types</h3>
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" stroke="#94a3b8" fontSize={10}/>
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={80}/>
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
              </ResponsiveContainer>
          </div>

          {/* Node Connections */}
          <div className="glass-panel p-4 rounded-lg border border-seastar-700 h-80 lg:col-span-2">
              <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase">Top Connected Nodes (Congestion Analysis)</h3>
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nodeData}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10}/>
                      <YAxis stroke="#94a3b8" fontSize={10}/>
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff'}}
                      />
                      <Bar dataKey="connections" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
              </ResponsiveContainer>
          </div>

      </div>
    </div>
  );
};

export default Dashboard;