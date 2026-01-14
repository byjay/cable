import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Settings, BarChart2, PieChart as PieIcon, List, Filter } from 'lucide-react';

interface PivotAnalyzerProps {
    data: any[];
    title?: string;
}

type Aggregator = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const PivotAnalyzer: React.FC<PivotAnalyzerProps> = ({ data, title = "Data Analytics" }) => {
    // 1. Extract all available keys from data
    const availableFields = useMemo(() => {
        if (!data || data.length === 0) return [];
        // distinct keys from first 10 rows to be safe? usually first row has all keys if from ExcelService
        const keys = new Set<string>();
        data.slice(0, 50).forEach(row => {
            Object.keys(row).forEach(k => keys.add(k));
        });
        return Array.from(keys).sort();
    }, [data]);

    // 2. Pivot State
    const [rowField, setRowField] = useState<string>('system'); // Default
    const [colField, setColField] = useState<string>(''); // Optional
    const [valueField, setValueField] = useState<string>('length');
    const [aggregator, setAggregator] = useState<Aggregator>('SUM');
    const [chartType, setChartType] = useState<'BAR' | 'PIE'>('BAR');

    // 3. Pivot Engine
    const pivotData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Grouping
        const groups: { [key: string]: any[] } = {};

        data.forEach(row => {
            // Determine Row Key
            const rVal = row[rowField];
            const rKey = rVal !== undefined && rVal !== null ? String(rVal) : '(Blank)';

            if (!groups[rKey]) groups[rKey] = [];
            groups[rKey].push(row);
        });

        // Aggregation per group
        const result = Object.entries(groups).map(([groupKey, items]) => {
            let value = 0;

            // Extract values for aggregation
            const values = items.map(i => {
                const v = parseFloat(i[valueField]);
                return isNaN(v) ? 0 : v;
            });

            switch (aggregator) {
                case 'COUNT': value = items.length; break;
                case 'SUM': value = values.reduce((a, b) => a + b, 0); break;
                case 'AVG': value = values.reduce((a, b) => a + b, 0) / (values.length || 1); break;
                case 'MIN': value = Math.min(...values); break;
                case 'MAX': value = Math.max(...values); break;
            }

            // If Column Field is present, we need logical breakdown? 
            // For now, simpler 1D Pivot for Charting is safer for MVP V6.0
            // But let's support a simple secondary breakdown if needed? 
            // Let's stick to 1D grouping for Chart clarity first.

            return {
                name: groupKey,
                value: parseFloat(value.toFixed(2)),
                count: items.length
            };
        });

        // Sort by value desc
        return result.sort((a, b) => b.value - a.value);
    }, [data, rowField, valueField, aggregator]);

    // Calculate Grand Total
    const grandTotal = useMemo(() => pivotData.reduce((acc, curr) => acc + curr.value, 0), [pivotData]);

    if (!data || data.length === 0) return <div className="p-10 text-center text-gray-400">No Data Available for Analysis</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Toolbar / Config */}
            <div className="bg-white border-b p-4 shadow-sm flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-2">
                    <Settings className="text-seastar-cyan" size={20} />
                    <h2 className="font-bold text-gray-700 text-lg">{title}</h2>
                </div>

                {/* Configuration Controls */}
                <div className="flex gap-4 bg-slate-100 p-2 rounded-lg border border-slate-200">
                    {/* Row Group */}
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1">Group By (Row)</label>
                        <select
                            title="Select field to group rows by"
                            className="text-xs border border-gray-300 rounded p-1 w-32 outline-none focus:border-blue-500"
                            value={rowField}
                            onChange={(e) => setRowField(e.target.value)}
                        >
                            {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>

                    {/* Value Field */}
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1">Value Field</label>
                        <select
                            title="Select field for aggregation"
                            className="text-xs border border-gray-300 rounded p-1 w-32 outline-none focus:border-blue-500"
                            value={valueField}
                            onChange={(e) => setValueField(e.target.value)}
                        >
                            {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>

                    {/* Aggregator */}
                    <div className="flex flex-col">
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1">Function</label>
                        <select
                            title="Select aggregation function"
                            className="text-xs border border-gray-300 rounded p-1 w-24 outline-none focus:border-blue-500 font-bold text-blue-600"
                            value={aggregator}
                            onChange={(e) => setAggregator(e.target.value as Aggregator)}
                        >
                            <option value="COUNT">Count</option>
                            <option value="SUM">Sum</option>
                            <option value="AVG">Average</option>
                            <option value="MIN">Min</option>
                            <option value="MAX">Max</option>
                        </select>
                    </div>
                </div>

                {/* Chart Toggles */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 h-fit">
                    <button
                        onClick={() => setChartType('BAR')}
                        className={`p-2 rounded ${chartType === 'BAR' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Bar Chart"
                    >
                        <BarChart2 size={18} />
                    </button>
                    <button
                        onClick={() => setChartType('PIE')}
                        className={`p-2 rounded ${chartType === 'PIE' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Pie Chart"
                    >
                        <PieIcon size={18} />
                    </button>
                </div>

                <div className="ml-auto text-right">
                    <span className="text-xs text-gray-400 block">Grand Total</span>
                    <span className="text-xl font-bold text-blue-600">{grandTotal.toLocaleString()}</span>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                {/* Visualization (60%) */}
                <div className="flex-1 p-4 bg-white m-2 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-gray-600 mb-4 text-center">
                        {aggregator} of {valueField} by {rowField}
                    </h3>
                    <div className="w-full h-[90%]">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'BAR' ? (
                                <BarChart data={pivotData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="top" />
                                    <Bar dataKey="value" name={`${aggregator} of ${valueField}`} fill="#8884d8" radius={[4, 4, 0, 0]}>
                                        {pivotData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            ) : (
                                <PieChart>
                                    <Pie
                                        data={pivotData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {pivotData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Data Grid (40%) */}
                <div className="w-full md:w-[400px] bg-white m-2 rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b font-bold text-gray-600 text-xs flex justify-between items-center">
                        <span>Pivot Data</span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{pivotData.length} Groups</span>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="p-2 border-b w-10">#</th>
                                    <th className="p-2 border-b">{rowField}</th>
                                    <th className="p-2 border-b text-right">Count</th>
                                    <th className="p-2 border-b text-right">{aggregator} Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pivotData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50 border-b border-gray-50 last:border-0">
                                        <td className="p-2 text-gray-400">{idx + 1}</td>
                                        <td className="p-2 font-medium text-gray-700 break-all">{row.name}</td>
                                        <td className="p-2 text-right text-gray-500">{row.count}</td>
                                        <td className="p-2 text-right font-bold text-blue-600">{row.value.toLocaleString()}</td>
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

export default PivotAnalyzer;
